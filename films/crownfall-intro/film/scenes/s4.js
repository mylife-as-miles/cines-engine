/* Scene 4: The Beasts That Devoured Kings [L18–L24].
   The page gains depth: ink-wash layers in parallax, fog between them, snow on the wind, a cold blue-grey palette in
   which the First-Born's gold eye is the one warm note. The creature is a small 3D rig (lofted sphere sweeps, membranes,
   horns) projected through a camera, so one design gives every pose: the shadow, the dive, the strike, the procession,
   the head that turns to look at us. Everything is keyed to the narration cues; nothing reads the clock. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ================================================================ palette (cold paper, blue-black ink)
  const PAPER = [222, 223, 218], INK = [26, 32, 42], FOG = [214, 218, 218], SNOW = [241, 243, 245];
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const tone = (k, a = 1, base = PAPER) => css(mixc(base, INK, k), a);       // k: 0 paper .. 1 dense ink
  const hexc = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const GOLD = hexc(P.gold), GOLDHI = hexc(P.goldHi), VERM = hexc(P.vermilion), BEAST = K.HOUSES[6];

  // ================================================================ small helpers
  const fract = v => v - Math.floor(v);
  const smoothstep = (a, b, v) => smooth((v - a) / (b - a));
  const pulse = (t, a, b) => (t >= a && t < b);
  function wave(t, f, ph = 0) { return Math.sin(t * f * TAU + ph); }
  // a soft round sprite (white, alpha falloff) for flakes, glows and puffs
  function disc() {
    return K.cached('s4:disc', () => {
      const s = 64, c = K.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
    });
  }
  // value-noise texture tile (grey, alpha) used for washes, granulation and dry brush
  function noiseTile(key, s, scale, oct, seed, contrast = 1, bias = 0) {
    return K.cached('s4:nt:' + key, () => {
      const c = K.canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s), d = img.data;
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        // tileable: blend four offset samples
        const u = i / s, v = j / s;
        const f = (a, b) => K.fbm(a * scale, b * scale, oct, seed);
        const n = f(u, v) * (1 - u) * (1 - v) + f(u - 1, v) * u * (1 - v) + f(u, v - 1) * (1 - u) * v + f(u - 1, v - 1) * u * v;
        const val = clamp((n - 0.5) * contrast + 0.5 + bias);
        const k = (j * s + i) * 4; d[k] = d[k + 1] = d[k + 2] = 255 * val; d[k + 3] = 255;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // granulation: dark specks with alpha only (for 'source-atop' on painted shapes)
  function specTile() {
    return K.cached('s4:spec', () => {
      const s = 256, c = K.canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s), d = img.data, r = rng(4401);
      for (let i = 0; i < s * s; i++) { const v = r(); const a = Math.pow(v, 6) * 0.9 + (K.fbm((i % s) / 9, Math.floor(i / s) / 9, 3, 12) - 0.5) * 0.25; d[i * 4] = INK[0]; d[i * 4 + 1] = INK[1]; d[i * 4 + 2] = INK[2]; d[i * 4 + 3] = clamp(a) * 255; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // fill the current path (or a rect) with a tiled texture pattern
  function texFill(x, tex, alpha, mode = 'source-atop', ox = 0, oy = 0, rect) {
    x.save(); x.globalCompositeOperation = mode; x.globalAlpha = alpha;
    const pat = x.createPattern(tex, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy]));
    x.fillStyle = pat; if (rect) x.fillRect(rect[0], rect[1], rect[2], rect[3]); else x.fillRect(-4000, -4000, 12000, 12000);
    x.restore();
  }

  // ================================================================ 3D: vectors and a camera
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
    madd: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  };
  // rotate v about unit axis k by angle a (Rodrigues)
  function rotAxis(v, k, a) {
    const c = Math.cos(a), s = Math.sin(a), d = v3.dot(k, v), cr = v3.cross(k, v);
    return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)];
  }
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
  const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
  const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
  // camera(o): o.pos [x,y,z], o.yaw (turn left +), o.pitch (look up +), o.roll, o.f focal length in px, o.cx, o.cy
  function camera(o) {
    const yaw = o.yaw || 0, pitch = o.pitch || 0, roll = o.roll || 0;
    let fwd = rotY([0, Math.sin(pitch), -Math.cos(pitch)], yaw), up = rotY([0, Math.cos(pitch), Math.sin(pitch)], yaw), right = rotY([1, 0, 0], yaw);
    if (roll) { right = rotAxis(right, fwd, roll); up = rotAxis(up, fwd, roll); }
    const pos = o.pos, f = o.f || 1400, cx = o.cx != null ? o.cx : W / 2, cy = o.cy != null ? o.cy : H / 2;
    return {
      pos, fwd, up, right, f, cx, cy,
      p(q) { const d = [q[0] - pos[0], q[1] - pos[1], q[2] - pos[2]]; const z = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2]; const zz = Math.max(z, 0.05); return [cx + f * (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / zz, cy - f * (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / zz, z]; },
    };
  }

  // ================================================================ the First-Born: a rig
  // Units are roughly metres (a man is 1.8). Local frame: x forward, y up, z the creature's left side.
  const DIM = { torso: 4.8, neck: 8.4, tail: 12.5, hum: 4.0, fore: 6.2, thumb: 1.1, fing: [12.6, 11.4, 10.4, 9.4], thigh: 2.8, shin: 2.7, meta: 1.55, toe: 1.05, head: 1.3 };
  // wing bone directions for a few attitudes (left wing; the right wing mirrors z). Order: humerus, forearm, thumb, f1..f4
  const WING = {
    spread: [[-0.45, 0.1, 0.89], [0.55, 0.05, 0.83], [0.92, 0.15, 0.35], [-0.06, 0.0, 0.998], [-0.55, -0.02, 0.83], [-0.86, -0.03, 0.5], [-0.995, -0.04, 0.02]],
    fold: [[-0.62, -0.55, 0.56], [0.5, -0.86, 0.1], [0.8, -0.3, 0.3], [-0.6, 0.79, -0.1], [-0.68, 0.73, -0.09], [-0.77, 0.63, -0.08], [-0.86, 0.5, -0.06]],
    mantle: [[-0.1, 0.75, 0.65], [0.35, 0.88, 0.3], [0.9, 0.42, 0.2], [-0.12, 0.98, 0.16], [-0.52, 0.84, 0.15], [-0.84, 0.52, 0.12], [-0.99, 0.08, 0.1]],
    tuck: [[-0.5, 0.25, 0.83], [0.65, 0.3, 0.7], [0.9, 0.35, 0.25], [-0.45, 0.2, 0.87], [-0.7, 0.15, 0.7], [-0.88, 0.1, 0.47], [-0.98, 0.05, 0.18]],
  };
  // a deterministic pattern of tears in the trailing edges
  const TEARS = (() => { const r = rng(9091); return Array.from({ length: 96 }, () => r()); })();

  function quad3(a, b, c, t) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], u * u * a[2] + 2 * u * t * b[2] + t * t * c[2]]; }
  const qi = (a, b, c, s) => a * (1 - s) * (1 - s) + 2 * b * s * (1 - s) + c * s * s;   // a quadratic blend of three values
  function dirPY(p, y) { return [Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)]; }
  // solve a two-bone chain in the plane spanned by (target - root) and a pole direction; returns the middle joint
  function ik2(root, target, l1, l2, pole) {
    const d = v3.sub(target, root); let L = v3.len(d); const dn = v3.norm(d);
    L = Math.min(L, (l1 + l2) * 0.999); L = Math.max(L, Math.abs(l1 - l2) + 0.01);
    const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let pn = v3.sub(pole, v3.mul(dn, v3.dot(pole, dn))); pn = v3.norm(pn);
    return v3.add(v3.add(root, v3.mul(dn, a)), v3.mul(pn, h));
  }

  // pose defaults; poses are plain objects merged over these
  const POSE0 = {
    pos: [0, 0, 0], yaw: 0, pitch: 0, roll: 0, chest: 0.05,
    neck: [0.35, 0.25, -0.2], neckYaw: [0, 0, 0], head: { pitch: -0.15, yaw: 0, roll: 0 }, jaw: 0.04,
    tail: [-0.15, 0.05, 0.1], tailYaw: [0, 0, 0], tailWave: { amp: 0.12, ph: 0, k: 2.2 },
    wingL: { w: { fold: 1 }, flap: 0, lag: 0.35 }, wingR: { w: { fold: 1 }, flap: 0, lag: 0.35 },
    legL: { a: [0.5, -1.25, 0.95], foot: null }, legR: { a: [0.5, -1.25, 0.95], foot: null }, toes: 0.4,
    armL: null, armR: null,     // when walking on the folded wings: { wrist: [x,y,z] } targets in local space
    eye: { open: 1, look: [0, 0], pupil: 0.15 },
  };
  function mergePose(p) {
    const o = Object.assign({}, POSE0, p);
    for (const k of ['head', 'tailWave', 'eye']) o[k] = Object.assign({}, POSE0[k], p[k] || {});
    for (const k of ['wingL', 'wingR', 'legL', 'legR']) o[k] = Object.assign({}, POSE0[k], p[k] || {});
    return o;
  }

  // build(pose) -> parts in world space: tubes [{side, pts:[{p,r}]}], membranes, spikes, features
  function build(pose0) {
    const P0 = mergePose(pose0), D = DIM;
    const tubes = [], membranes = [], spikes = [], claws = [], feat = {};
    const tube = (side, pts, kind) => { tubes.push({ side, pts, kind: kind || 'body' }); return pts; };
    const prof = (list, at, n) => { const o = []; for (let i = 0; i < list.length - 1; i++) { const a = list[i], b = list[i + 1]; for (let k = 0; k < n; k++) { const u = k / n; o.push(at(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u))); } } const z = list[list.length - 1]; o.push(at(z[0], z[1], z[2])); return o; };
    // ---- spine: hip at the origin, the torso rising by the chest angle
    const ac = P0.chest, tdir = [Math.cos(ac), Math.sin(ac), 0], up0 = [-Math.sin(ac), Math.cos(ac), 0];
    const T = (s, y, z = 0) => v3.add(v3.mul(tdir, s), v3.add(v3.mul(up0, y), [0, 0, z]));
    const Hp = [0, 0, 0], Ch = T(D.torso, 0);
    const torso = prof([[-1.3, 0.95, 0.18], [-0.6, 1.28, 0.1], [0.3, 1.55, 0], [1.3, 1.85, -0.14], [2.3, 2.22, -0.38], [3.25, 2.48, -0.52], [4.15, 2.3, -0.34], [4.85, 1.98, -0.02], [5.35, 1.66, 0.26]], (s, r, y) => ({ p: T(s, y), r }), 4);
    tube('body', torso, 'torso');
    // ---- neck: a chain from the top of the chest
    const N0 = T(5.0, 0.45), neck = []; let q = N0, nd = tdir; const nn = 32;
    for (let i = 0; i <= nn; i++) {
      const s = i / nn, pa = ac + qi(P0.neck[0], P0.neck[1], P0.neck[2], s), ya = qi(P0.neckYaw[0], P0.neckYaw[1], P0.neckYaw[2], s);
      nd = dirPY(pa, ya); const r = lerp(1.6, 0.82, Math.pow(s, 0.7)) + 0.06 * Math.sin(s * Math.PI);
      neck.push({ p: q, r, d: nd }); if (i < nn) q = v3.madd(q, nd, D.neck / nn);
    }
    tube('body', neck, 'neck');
    // ---- the head, framed at the end of the neck: hx forward, hy up, hz left
    const NE = q;
    const hpitch = ac + P0.neck[2] + P0.head.pitch, hyaw = P0.neckYaw[2] + P0.head.yaw;
    const hx = dirPY(hpitch, hyaw); let hz = v3.cross(hx, [0, 1, 0]);
    hz = v3.len(hz) < 1e-4 ? [0, 0, 1] : v3.norm(hz);
    let hy = v3.cross(hz, hx);
    if (P0.head.roll) { hy = rotAxis(hy, hx, P0.head.roll); hz = rotAxis(hz, hx, P0.head.roll); }
    const HO = v3.madd(NE, hx, -0.55), HS = D.head;
    const HP = (x, y, z) => v3.add(HO, v3.add(v3.mul(hx, x * HS), v3.add(v3.mul(hy, y * HS), v3.mul(hz, z * HS))));
    const HPROF = [[-0.2, 0.74, 0.02], [0.3, 0.92, 0.14], [0.9, 0.88, 0.12], [1.4, 0.76, 0.05], [1.9, 0.67, -0.02], [2.4, 0.6, -0.06], [2.85, 0.53, -0.07], [3.25, 0.45, -0.06], [3.52, 0.36, -0.07], [3.66, 0.22, -0.12]];
    tube('body', prof(HPROF, (s, r, y) => ({ p: HP(s, y, 0), r: r * HS }), 4), 'head');
    for (const sd of [1, -1]) {
      const side = sd > 0 ? 'L' : 'R';
      // brow ridge over the eye, a cheek, the jaw muscle
      tube('body', [{ p: HP(0.85, 0.46, 0.4 * sd), r: 0.27 * HS }, { p: HP(1.3, 0.5, 0.44 * sd), r: 0.24 * HS }, { p: HP(1.75, 0.4, 0.38 * sd), r: 0.17 * HS }, { p: HP(2.1, 0.3, 0.3 * sd), r: 0.1 * HS }], 'head');
      tube('body', [{ p: HP(0.25, -0.22, 0.42 * sd), r: 0.56 * HS }, { p: HP(0.75, -0.3, 0.38 * sd), r: 0.46 * HS }, { p: HP(1.2, -0.36, 0.3 * sd), r: 0.34 * HS }], 'head');
      // the great horns sweep back and rise clear of the neck; a second pair below them
      const horn = [], hp = [[0.45, 0.5, 0.3], [-0.25, 1.0, 0.4], [-1.05, 1.42, 0.5], [-1.95, 1.66, 0.58], [-2.85, 1.62, 0.62], [-3.55, 1.3, 0.64]].map(a => HP(a[0], a[1], a[2] * sd));
      for (let i = 0; i < hp.length - 1; i++) for (let k = 0; k < 6; k++) { const u = (i + k / 6) / (hp.length - 1); horn.push({ p: v3.lerp(hp[i], hp[i + 1], k / 6), r: lerp(0.36, 0.02, Math.pow(u, 0.8)) * HS }); }
      horn.push({ p: hp[hp.length - 1], r: 0.015 });
      tube(side, horn, 'horn');
      const horn2 = [], h2 = [[0.2, 0.22, 0.55], [-0.5, 0.45, 0.72], [-1.25, 0.55, 0.8], [-1.95, 0.42, 0.82]].map(a => HP(a[0], a[1], a[2] * sd));
      for (let i = 0; i < h2.length - 1; i++) for (let k = 0; k < 5; k++) { const u = (i + k / 5) / (h2.length - 1); horn2.push({ p: v3.lerp(h2[i], h2[i + 1], k / 5), r: lerp(0.17, 0.015, u) * HS }); }
      tube(side, horn2, 'horn');
      // spines on the jaw's hinge, raking back
      const jsp = [[0.1, -0.55, 0.5], [-0.5, -0.8, 0.55], [-0.95, -1.05, 0.5]].map(a => HP(a[0], a[1], a[2] * sd));
      tube(side, jsp.map((p, i) => ({ p, r: lerp(0.16, 0.02, i / 2) * HS })), 'horn');
      feat['eye' + side] = { p: HP(1.32, 0.22, 0.56 * sd), n: v3.norm(v3.add(v3.mul(hz, sd), v3.mul(hx, 0.3))), hx, hy, size: 0.22 * HS };
      feat['nostril' + side] = { p: HP(3.4, 0.08, 0.2 * sd) };
    }
    // the lower jaw, hinged below and behind the eye
    const ja = P0.jaw, jx = v3.add(v3.mul(hx, Math.cos(-ja)), v3.mul(hy, Math.sin(-ja))), jy = v3.cross(hz, jx);
    const JO = HP(0.3, -0.42, 0), JP = (x, y) => v3.add(JO, v3.add(v3.mul(jx, x * HS), v3.mul(jy, y * HS)));
    const jaw = []; for (let k = 0; k <= 16; k++) { const s = k / 16; jaw.push({ p: JP(lerp(0, 3.2, s), lerp(-0.12, -0.06, s) - 0.08 * Math.sin(s * Math.PI)), r: lerp(0.46, 0.16, Math.pow(s, 0.8)) * HS }); }
    tube('body', jaw, 'jaw');
    // teeth: an upper row hanging from the snout, a lower row rising from the jaw
    const teeth = [];
    for (let k = 0; k < 10; k++) {
      const s = 1.1 + k * 0.25, big = k === 2 || k === 7, L = (big ? 0.34 : 0.1 + 0.05 * ((k * 7) % 3)) * (1 - k * 0.03);
      const rr = lerp(0.84, 0.42, (s - 1.1) / 2.4);
      for (const sd of [1, -1]) {
        const base = HP(s, -rr * 0.78, 0.22 * sd * (1 - k / 16));
        teeth.push({ a: v3.madd(base, hx, -0.07 * HS), b: v3.madd(base, hx, 0.07 * HS), tip: v3.madd(v3.madd(base, hy, -L * HS), hx, 0.04 * HS) });
        if (k > 0 && k < 9) { const jb = JP(s - 0.3, 0.16), jtip = v3.madd(jb, jy, L * 0.8 * HS); teeth.push({ a: v3.madd(jb, jx, -0.06 * HS), b: v3.madd(jb, jx, 0.06 * HS), tip: jtip, lower: true }); }
      }
    }
    feat.teeth = teeth; feat.mouth = [HP(0.45, -0.52, 0), HP(1.7, -0.62, 0), HP(2.9, -0.46, 0), HP(3.62, -0.24, 0)];
    feat.head = { HO, hx, hy, hz }; feat.jawF = { JO, jx, jy };
    // spines down the neck, the back and the tail
    const spine = (pt, dir, upv, size) => spikes.push({ base: pt, a: v3.madd(pt, dir, -size * 0.4), b: v3.madd(pt, dir, size * 0.4), tip: v3.add(v3.madd(pt, upv, size * 1.05), v3.mul(dir, -size * 0.6)) });
    const upOf = d => { const c = v3.cross(v3.cross(d, [0, 1, 0]), d); return v3.len(c) < 1e-4 ? [0, 1, 0] : v3.norm(c); };
    for (let i = 2; i < nn - 1; i += 2) { const n = neck[i], s = i / nn, u = upOf(n.d), big = (i % 6 === 2) ? 1.25 : 0.8; spine(v3.madd(n.p, u, n.r * 0.88), n.d, u, lerp(0.75, 0.5, s) * big); }
    for (let k = 0; k <= 9; k++) { const s = lerp(-0.8, 5.0, k / 9), y = lerp(1.0, 2.0, smooth(clamp((s + 0.8) / 4.6))) - 0.15 * Math.max(0, s - 4.2); spine(T(s, y + 0.05), tdir, up0, 0.55 + 0.15 * Math.sin(k / 9 * Math.PI)); }
    // ---- tail
    const tail = []; let tq = T(-1.2, 0.15), tw = P0.tailWave; const tn = 48;
    for (let i = 0; i <= tn; i++) {
      const s = i / tn, pa = ac + Math.PI - qi(P0.tail[0], P0.tail[1], P0.tail[2], s), ya = qi(P0.tailYaw[0], P0.tailYaw[1], P0.tailYaw[2], s) + tw.amp * Math.sin(tw.ph - s * tw.k * Math.PI) * s;
      const td = dirPY(pa, ya), r = lerp(1.2, 0.06, Math.pow(s, 0.68));
      tail.push({ p: tq, r, d: td }); if (i < tn) tq = v3.madd(tq, td, D.tail / tn);
    }
    tube('body', tail, 'tail');
    { const e = tail[tn], d = e.d, sdv = v3.norm(v3.cross(d, [0, 1, 0])), upv = v3.norm(v3.cross(sdv, d)), c = e.p;
      membranes.push({ side: 'body', kind: 'spade', pts: [v3.madd(c, d, -0.4), v3.add(v3.madd(c, d, 0.15), v3.mul(upv, 0.62)), v3.add(v3.madd(c, d, 0.5), v3.mul(upv, 0.3)), v3.madd(c, d, 1.45), v3.add(v3.madd(c, d, 0.5), v3.mul(upv, -0.3)), v3.add(v3.madd(c, d, 0.15), v3.mul(upv, -0.62))] }); }
    for (let i = 2; i < tn - 5; i += 3) { const n = tail[i], s = i / tn, u = upOf(n.d); spine(v3.madd(n.p, u, n.r * 0.86), v3.mul(n.d, -1), u, lerp(0.55, 0.16, s)); }
    // ---- legs: thigh, shin, metatarsus, three toes and a dew claw
    const legs = {};
    for (const sd of [1, -1]) {
      const side = sd > 0 ? 'L' : 'R', L = sd > 0 ? P0.legL : P0.legR;
      const hipJ = T(0.45, -0.45, 1.05 * sd);
      let Kn, An, Fb;
      if (L.foot) {
        Fb = L.foot.slice();
        const mb = L.metaBack != null ? L.metaBack : 0.42, metaDir = v3.norm([-mb, 1, 0]);
        An = v3.madd(Fb, metaDir, D.meta);
        Kn = ik2(hipJ, An, D.thigh, D.shin, [1, 0.25, 0.12 * sd]);
      } else {
        const [a1, kb, an] = L.a, a2 = a1 + kb, a3 = a2 + an;
        const lr = v => rotZ(v, ac * 0.5);
        Kn = v3.add(hipJ, lr([Math.sin(a1) * D.thigh, -Math.cos(a1) * D.thigh, 0.12 * sd]));
        An = v3.add(Kn, lr([Math.sin(a2) * D.shin, -Math.cos(a2) * D.shin, 0.06 * sd]));
        Fb = v3.add(An, lr([Math.sin(a3) * D.meta, -Math.cos(a3) * D.meta, 0]));
      }
      const lt = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8; lt.push({ p: v3.add(v3.lerp(hipJ, Kn, u), v3.mul(up0, 0.3 * Math.sin(u * Math.PI))), r: lerp(1.38, 0.56, u) + 0.18 * Math.sin(u * Math.PI) }); }
      for (let k = 1; k <= 8; k++) { const u = k / 8; lt.push({ p: v3.lerp(Kn, An, u), r: lerp(0.5, 0.28, u) }); }
      for (let k = 1; k <= 5; k++) { const u = k / 5; lt.push({ p: v3.lerp(An, Fb, u), r: lerp(0.31, 0.24, u) }); }
      const curl = L.curl != null ? L.curl : P0.toes, toes = [];
      const fdir = L.toeDir || [1, 0, 0];
      for (const [ang, len] of [[-0.45, 0.85], [0, 1.0], [0.45, 0.85]]) {
        const base = v3.norm(rotY(fdir, ang * sd * -1));
        const td = v3.norm([base[0], -0.12 - curl * 0.55, base[2]]);
        const t1 = v3.madd(Fb, td, D.toe * len * 0.55), td2 = v3.norm(v3.add(td, [0, -0.55 - curl, 0])), t2 = v3.madd(t1, td2, D.toe * len * 0.45);
        toes.push([{ p: Fb, r: 0.21 }, { p: v3.lerp(Fb, t1, 0.5), r: 0.18 }, { p: t1, r: 0.15 }, { p: v3.lerp(t1, t2, 0.5), r: 0.12 }, { p: t2, r: 0.09 }]);
        claws.push({ side, base: t2, dir: v3.norm(v3.add(td2, [0, -0.9 - curl, 0])), fwd: td2, size: 0.46 * len });
      }
      claws.push({ side, base: v3.madd(An, v3.norm([-1, -0.6, 0]), 0.5), dir: v3.norm([-0.6, -1, 0]), fwd: [-1, 0, 0], size: 0.3 });
      legs[side] = { hipJ, Kn, An, Fb, pts: lt, toes };
    }
    // ---- wings: arm, thumb claw and four fingers; the membrane runs from the shoulder over the fingers to the thigh
    const wings = {};
    for (const sd of [1, -1]) {
      const side = sd > 0 ? 'L' : 'R', WG = sd > 0 ? P0.wingL : P0.wingR;
      const S = T(3.85, 1.45, 1.0 * sd);
      const wts = WG.w; let tot = 0; for (const k in wts) tot += wts[k];
      const dirs = [];
      for (let b = 0; b < 7; b++) {
        let d = [0, 0, 0]; for (const k in wts) { const v = WING[k][b]; d = v3.madd(d, [v[0], v[1], v[2] * sd], wts[k] / tot); }
        d = rotZ(v3.norm(d), ac);
        const lagged = (WG.flap || 0) + (WG.flapLag || 0) * Math.min(b, 3) / 3;
        d = rotAxis(d, tdir, lagged * sd);
        if (WG.sweep) d = rotY(d, WG.sweep * sd * (b >= 1 ? 1 : 0.5));
        dirs.push(d);
      }
      let E, Wr; const arm = sd > 0 ? P0.armL : P0.armR;
      if (arm && arm.wrist) { Wr = arm.wrist.slice(); E = ik2(S, Wr, D.hum, D.fore, v3.norm([-0.7, 1, 0.45 * sd])); }
      else { E = v3.madd(S, dirs[0], D.hum); Wr = v3.madd(E, dirs[1], D.fore); }
      if (arm && arm.wrist) {
        // planted on the wrist: the folded fingers lie back along the forearm and rise past the elbow, fanned a little
        const back = v3.norm(v3.sub(E, Wr)), lat = [0, 0, sd], fan = v3.norm(v3.cross(back, lat));
        const fw = wts.fold ? wts.fold / tot : 0;
        for (let b = 3; b < 7; b++) { const k = b - 3; const fd = v3.norm(v3.add(v3.add(back, v3.mul(fan, -0.05 - k * 0.07)), [0, 0.12, 0.05 * sd])); dirs[b] = v3.norm(v3.lerp(dirs[b], fd, fw)); }
      }
      const reach = WG.reach != null ? WG.reach : 1;
      const thumb = v3.madd(Wr, dirs[2], D.thumb), tips = [3, 4, 5, 6].map((b, i) => v3.madd(Wr, dirs[b], D.fing[i] * reach));
      const attach = v3.add(v3.lerp(legs[side].hipJ, legs[side].Kn, 0.95), [0, 0.1, 0.3 * sd]);
      const flank = [T(1.2, 0.95, 1.15 * sd), T(2.6, 1.25, 1.1 * sd)];
      const pts = [S], lead = v3.add(v3.lerp(S, Wr, 0.55), v3.mul(v3.norm(v3.sub(v3.lerp(S, Wr, 0.5), E)), 0.35));
      pts.push(v3.lerp(S, lead, 0.55), lead, Wr);
      const chain = tips.concat([attach]); let tear = sd > 0 ? 0 : 48;
      for (let i = 0; i < 4; i++) {
        const a = chain[i], b = chain[i + 1], mid = v3.lerp(a, b, 0.5), ctrl = v3.lerp(mid, Wr, i === 3 ? 0.2 : 0.3);
        pts.push(a);
        const n = 9;
        for (let k = 1; k < n; k++) { let p = quad3(a, ctrl, b, k / n); const tv = TEARS[(tear++) % 96]; if (tv > 0.88) p = v3.lerp(p, Wr, 0.04 + (tv - 0.88) * 0.8); pts.push(p); }
      }
      pts.push(attach, flank[0], flank[1]);
      membranes.push({ side, kind: 'wing', pts, Wr, tips });
      const seg = (a, b, r0, r1, n) => { const o = []; for (let k = 0; k <= n; k++) o.push({ p: v3.lerp(a, b, k / n), r: lerp(r0, r1, k / n) }); return o; };
      tube(side, seg(S, E, 0.6, 0.4, 7).concat(seg(E, Wr, 0.4, 0.28, 10)), 'bone');
      for (let i = 0; i < 4; i++) tube(side, seg(Wr, tips[i], 0.22, 0.04, 20), 'bone');
      tube(side, seg(Wr, thumb, 0.24, 0.1, 3), 'bone');
      claws.push({ side, base: thumb, dir: v3.norm(v3.add(dirs[2], [0, -0.8, 0])), fwd: dirs[2], size: 0.55 });
      wings[side] = { S, E, Wr, thumb, tips, attach };
    }
    for (const sd of ['L', 'R']) { tube(sd, legs[sd].pts, 'leg'); for (const t of legs[sd].toes) tube(sd, t, 'leg'); }
    // ---- to world space
    const RV = v => { let o = v; if (P0.roll) o = rotX(o, P0.roll); if (P0.pitch) o = rotZ(o, P0.pitch); if (P0.yaw) o = rotY(o, P0.yaw); return o; };
    const R = v => v3.add(RV(v), P0.pos);
    for (const t of tubes) for (const s of t.pts) s.p = R(s.p);
    for (const m of membranes) { m.pts = m.pts.map(R); if (m.Wr) { m.Wr = R(m.Wr); m.tips = m.tips.map(R); } }
    for (const s of spikes) { s.a = R(s.a); s.b = R(s.b); s.tip = R(s.tip); s.base = R(s.base); }
    for (const c of claws) { c.base = R(c.base); c.dir = RV(c.dir); c.fwd = RV(c.fwd); }
    for (const k of ['eyeL', 'eyeR']) { const e = feat[k]; e.p = R(e.p); e.n = RV(e.n); e.hx = RV(e.hx); e.hy = RV(e.hy); }
    for (const k of ['nostrilL', 'nostrilR']) feat[k].p = R(feat[k].p);
    feat.teeth = feat.teeth.map(t => ({ a: R(t.a), b: R(t.b), tip: R(t.tip), lower: t.lower }));
    feat.mouth = feat.mouth.map(R);
    feat.headF = { HO: R(feat.head.HO), hx: RV(feat.head.hx), hy: RV(feat.head.hy), hz: RV(feat.head.hz) };
    feat.HP = (x, y, z) => R(HP(x, y, z)); feat.JP = (x, y) => R(JP(x, y));
    feat.NP = (s, off = [0, 0, 0]) => { const i = clamp(Math.round(s * nn), 0, nn); return R(v3.add(neck[i].p, off)); };
    feat.neckR = s => neck[clamp(Math.round(s * nn), 0, nn)].r;
    for (const sd of ['L', 'R']) { const w = wings[sd]; for (const k of ['S', 'E', 'Wr', 'thumb', 'attach']) w[k] = R(w[k]); w.tips = w.tips.map(R); const l = legs[sd]; for (const k of ['hipJ', 'Kn', 'An', 'Fb']) l[k] = R(l[k]); }
    return { tubes, membranes, spikes, claws, feat, wings, legs, pose: P0, chest: R(Ch), hip: R(Hp), neckEnd: R(NE), headO: R(HO), saddle: R(T(3.9, 2.35)), T: (s, y, z) => R(T(s, y, z)) };
  }

  // ---------------------------------------------------------------- rendering the rig in ink
  // style: { ink [r,g,b] dense colour, far [r,g,b] for the far side, rim (0..1) light along the backs, memb (alpha), fog [r,g,b] + fogK,
  //          eye (0..1 glow), shadowOnly (flat silhouette), detail (0..1) }
  function circlePath(x, cs) { x.beginPath(); for (const c of cs) { if (c[2] < 0.3) continue; x.moveTo(c[0] + c[2], c[1]); x.arc(c[0], c[1], c[2], 0, TAU); } }
  function projTube(cam, t, grow = 0) {
    const out = [];
    for (let i = 0; i < t.pts.length; i++) {
      const s = t.pts[i], a = cam.p(s.p); if (a[2] <= 0.1) continue;
      const R = cam.f * s.r / a[2] + grow;
      out.push([a[0], a[1], R, a[2]]);
      // fill gaps when neighbours project far apart
      if (i + 1 < t.pts.length) {
        const b = cam.p(t.pts[i + 1].p); if (b[2] <= 0.1) continue; const Rb = cam.f * t.pts[i + 1].r / b[2] + grow;
        const dd = Math.hypot(b[0] - a[0], b[1] - a[1]), step = Math.max(1.5, Math.min(R, Rb) * 0.45);
        if (dd > step) { const n = Math.ceil(dd / step); for (let k = 1; k < n; k++) { const u = k / n; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(R, Rb, u), lerp(a[2], b[2], u)]); } }
      }
    }
    return out;
  }
  function polyPath(x, pts2) { x.beginPath(); x.moveTo(pts2[0][0], pts2[0][1]); for (let i = 1; i < pts2.length; i++) x.lineTo(pts2[i][0], pts2[i][1]); x.closePath(); }
  // the creature, drawn into ctx (which should be a layer if the caller wants to post-process it)
  function drawBeast(x, cam, B, st = {}) {
    const ink = st.ink || INK, far = st.far || mixc(ink, st.fog || FOG, 0.38), memA = st.memb != null ? st.memb : 0.62, rim = st.rim != null ? st.rim : 0.35;
    const fogK = st.fogK || 0, col = c => mixc(c, st.fog || FOG, fogK);
    const inkC = col(ink), farC = col(far), memC = col(mixc(ink, st.fog || FOG, 0.18)), memFarC = col(mixc(ink, st.fog || FOG, 0.45));
    // which side is nearer the camera?
    const dL = cam.p(B.wings.L.S)[2], dR = cam.p(B.wings.R.S)[2], nearSide = dL < dR ? 'L' : 'R', farSide = nearSide === 'L' ? 'R' : 'L';
    const tubesOf = (side, kinds) => B.tubes.filter(t => t.side === side && (!kinds || kinds.includes(t.kind)));
    const fillCircles = (cs, c, a = 1) => { circlePath(x, cs); x.fillStyle = css(c, a); x.fill(); };
    const proj = (list, grow) => { let o = []; for (const t of list) o = o.concat(projTube(cam, t, grow)); return o; };
    const membrane = (m, c, a) => {
      const p2 = m.pts.map(q => cam.p(q)); if (p2.some(q => q[2] <= 0.1)) return;
      x.save(); polyPath(x, p2); x.fillStyle = css(c, a); x.fill();
      if (!st.flat) {
        // wet-into-wet: darker toward the wrist and the bones, a pooled trailing edge
        x.clip(); const w = cam.p(m.Wr);
        const g = x.createRadialGradient(w[0], w[1], 0, w[0], w[1], Math.max(80, Math.hypot(p2[4][0] - w[0], p2[4][1] - w[1]) * 1.1));
        g.addColorStop(0, css(c, a * 0.75)); g.addColorStop(0.55, css(c, a * 0.18)); g.addColorStop(1, css(c, 0));
        x.fillStyle = g; x.fillRect(w[0] - 3000, w[1] - 3000, 6000, 6000);
        x.globalAlpha = 1; x.lineJoin = 'round'; x.strokeStyle = css(c, Math.min(1, a * 1.25)); x.lineWidth = Math.max(1.2, cam.f * 0.09 / cam.p(m.Wr)[2]);
        polyPath(x, p2); x.stroke();
        // veins: fine lines from the bones toward the trailing edge
        x.strokeStyle = css(c, a * 0.55); x.lineWidth = Math.max(0.6, x.lineWidth * 0.45);
        for (let i = 4; i < p2.length - 3; i += 3) { const e = p2[i]; x.beginPath(); x.moveTo(lerp(w[0], e[0], 0.25), lerp(w[1], e[1], 0.25)); x.quadraticCurveTo(lerp(w[0], e[0], 0.6) + (e[1] - w[1]) * 0.04, lerp(w[1], e[1], 0.6) - (e[0] - w[0]) * 0.04, lerp(w[0], e[0], 0.93), lerp(w[1], e[1], 0.93)); x.stroke(); }
      }
      x.restore();
    };
    const spikesDraw = (c) => { x.beginPath(); for (const s of B.spikes) { const a = cam.p(s.a), b = cam.p(s.b), tp = cam.p(s.tip); if (a[2] <= 0.1) continue; x.moveTo(a[0], a[1]); x.quadraticCurveTo(lerp(a[0], tp[0], 0.6), lerp(a[1], tp[1], 0.5), tp[0], tp[1]); x.lineTo(b[0], b[1]); x.closePath(); } x.fillStyle = css(c); x.fill(); };
    const clawsDraw = (side, c) => {
      x.beginPath();
      for (const cl of B.claws) {
        if (cl.side !== side) continue; const b = cam.p(cl.base); if (b[2] <= 0.1) continue;
        const tip = cam.p(v3.madd(v3.madd(cl.base, cl.dir, cl.size), cl.fwd, cl.size * 0.35)), mid = cam.p(v3.madd(cl.base, cl.fwd, cl.size * 0.55));
        const w = Math.max(1, cam.f * cl.size * 0.22 / b[2]), nx = -(tip[1] - b[1]), ny = tip[0] - b[0], nl = Math.hypot(nx, ny) || 1;
        x.moveTo(b[0] + nx / nl * w, b[1] + ny / nl * w); x.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]); x.quadraticCurveTo(lerp(b[0], mid[0], 0.7), lerp(b[1], mid[1], 0.7), b[0] - nx / nl * w, b[1] - ny / nl * w); x.closePath();
      }
      x.fillStyle = css(c); x.fill();
    };
    // far side: wing membrane, bones, horn, leg
    const farMem = B.membranes.find(m => m.side === farSide && m.kind === 'wing'), nearMem = B.membranes.find(m => m.side === nearSide && m.kind === 'wing');
    if (farMem) membrane(farMem, memFarC, memA * 0.85);
    fillCircles(proj(tubesOf(farSide, ['bone'])), farC);
    fillCircles(proj(tubesOf(farSide, ['leg'])), farC); clawsDraw(farSide, farC);
    fillCircles(proj(tubesOf(farSide, ['horn'])), farC);
    // the body mass
    const body = proj(tubesOf('body'));
    fillCircles(body, inkC); spikesDraw(inkC);
    const spade = B.membranes.find(m => m.kind === 'spade'); if (spade) { const p2 = spade.pts.map(q => cam.p(q)); polyPath(x, p2); x.fillStyle = css(inkC); x.fill(); }
    // light along the back of every tube: a lighter band offset toward the sky
    if (rim > 0 && !st.flat) {
      x.save(); circlePath(x, body); x.clip();
      const lit = body.map(c => [c[0] + c[2] * 0.12, c[1] - c[2] * 0.48, c[2] * 0.42]);
      x.filter = 'none'; fillCircles(lit, mixc(inkC, st.light || [150, 160, 170], 0.5), rim * 0.45);
      const lit2 = body.map(c => [c[0] + c[2] * 0.1, c[1] - c[2] * 0.66, c[2] * 0.22]);
      fillCircles(lit2, mixc(inkC, st.light || [170, 180, 190], 0.65), rim * 0.4);
      x.restore();
    }
    // near side: leg, horn, wing
    fillCircles(proj(tubesOf(nearSide, ['leg'])), inkC); clawsDraw(nearSide, inkC);
    if (rim > 0 && !st.flat) { const lc = proj(tubesOf(nearSide, ['leg'])); x.save(); circlePath(x, lc); x.clip(); fillCircles(lc.map(c => [c[0] + c[2] * 0.2, c[1] - c[2] * 0.45, c[2] * 0.4]), mixc(inkC, st.light || [150, 160, 170], 0.5), rim * 0.4); x.restore(); }
    fillCircles(proj(tubesOf(nearSide, ['horn'])), inkC);
    // the head's details: mouth, teeth, eye, nostril (over the body, under the near wing)
    if (!st.flat) headDetail(x, cam, B, st, inkC, nearSide);
    if (nearMem) membrane(nearMem, memC, memA);
    fillCircles(proj(tubesOf(nearSide, ['bone'])), inkC);
  }
  function headDetail(x, cam, B, st, inkC, nearSide) {
    const F = B.feat;
    // teeth: pale fangs
    const tc = st.tooth || mixc(PAPER, INK, 0.3);
    x.beginPath();
    for (const th of F.teeth) { const a = cam.p(th.a), b = cam.p(th.b), tp = cam.p(th.tip); if (a[2] <= 0.1) continue; x.moveTo(a[0], a[1]); x.lineTo(tp[0], tp[1]); x.lineTo(b[0], b[1]); x.closePath(); }
    x.fillStyle = css(tc, 0.9); x.fill();
    // the mouth line and the open maw
    const m = F.mouth.map(q => cam.p(q));
    x.strokeStyle = css(mixc(inkC, [0, 0, 0], 0.4)); x.lineWidth = Math.max(1, cam.f * 0.05 / m[1][2]); x.lineCap = 'round';
    x.beginPath(); x.moveTo(m[0][0], m[0][1]); x.bezierCurveTo(m[1][0], m[1][1], m[2][0], m[2][1], m[3][0], m[3][1]); x.stroke();
    // nostril
    const nos = cam.p(F['nostril' + nearSide].p), nr = Math.max(0.8, cam.f * 0.07 / nos[2]);
    x.fillStyle = css(mixc(inkC, [0, 0, 0], 0.5)); x.beginPath(); x.ellipse(nos[0], nos[1], nr * 1.4, nr * 0.7, -0.3, 0, TAU); x.fill();
    // the eye: a gold lens with a slit (the one warm note)
    const E = F['eye' + nearSide], ep = cam.p(E.p), facing = -v3.dot(E.n, cam.fwd);
    if (facing > -0.15) {
      const er = cam.f * E.size / ep[2], open = st.eyeOpen != null ? st.eyeOpen : 1;
      const hx2 = cam.p(v3.madd(E.p, E.hx, 0.3)), ang = Math.atan2(hx2[1] - ep[1], hx2[0] - ep[0]);
      const sq = clamp(0.35 + 0.65 * Math.abs(facing));
      x.save(); x.translate(ep[0], ep[1]); x.rotate(ang);
      x.fillStyle = css(mixc(inkC, [0, 0, 0], 0.5)); x.beginPath(); x.ellipse(0, 0, er * 1.5 * sq + 1, er * 0.95 + 1, 0, 0, TAU); x.fill();
      if (open > 0.05) {
        x.save(); x.beginPath(); x.ellipse(0, 0, er * 1.25 * sq, er * 0.78 * open, 0, 0, TAU); x.clip();
        const g = x.createRadialGradient(-er * 0.2, -er * 0.15, 0, 0, 0, er * 1.3);
        g.addColorStop(0, css(GOLDHI)); g.addColorStop(0.45, css(GOLD)); g.addColorStop(1, css([110, 70, 20]));
        x.fillStyle = g; x.fillRect(-er * 2, -er * 2, er * 4, er * 4);
        x.fillStyle = 'rgba(8,6,4,0.95)'; x.beginPath(); x.ellipse(er * 0.05, 0, er * 0.16 * sq * (1 + (st.pupil || 0) * 3), er * 0.75, 0, 0, TAU); x.fill();
        x.restore();
        x.fillStyle = 'rgba(255,248,225,0.85)'; x.beginPath(); x.arc(-er * 0.35 * sq, -er * 0.3, Math.max(0.6, er * 0.14), 0, TAU); x.fill();
      }
      x.restore();
      if ((st.eye || 0) > 0) K.glow(x, ep[0], ep[1], er * 6, [240, 190, 90], 0.25 * st.eye);
    }
  }
  // the creature's shadow on the plane y = gy, cast along light direction Ld (a flat, soft silhouette)
  function shadowPts(B, Ld, gy) {
    const proj = q => { const k = (q[1] - gy) / -Ld[1]; return [q[0] + Ld[0] * k, gy, q[2] + Ld[2] * k]; };
    const T = B.tubes.map(t => ({ side: t.side, kind: t.kind, pts: t.pts.map(s => ({ p: proj(s.p), r: s.r })) }));
    const M = B.membranes.map(m => ({ side: m.side, kind: m.kind, pts: m.pts.map(proj) }));
    return { tubes: T, membranes: M };
  }
  function drawShadow(x, cam, S, color, alpha) {
    x.save(); x.fillStyle = css(color, alpha);
    let cs = []; for (const t of S.tubes) cs = cs.concat(projTube(cam, t));
    circlePath(x, cs); x.fill();
    for (const m of S.membranes) { const p2 = m.pts.map(q => cam.p(q)); polyPath(x, p2); x.fill(); }
    x.restore();
  }

  // ================================================================ ink-wash landscape painters (all cached)
  // tileable value-noise arrays for fast per-pixel work
  function noiseArr(key, size, scale, oct, seed) {
    return K.cached('s4:na:' + key, () => {
      const a = new Float32Array(size * size);
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const u = i / size, v = j / size, f = (p, q) => K.fbm(p * scale, q * scale, oct, seed);
        a[j * size + i] = f(u, v) * (1 - u) * (1 - v) + f(u - 1, v) * u * (1 - v) + f(u, v - 1) * (1 - u) * v + f(u - 1, v - 1) * u * v;
      }
      let mn = 1, mx = 0; for (const v of a) { mn = Math.min(mn, v); mx = Math.max(mx, v); } for (let i = 0; i < a.length; i++) a[i] = (a[i] - mn) / (mx - mn);
      return a;
    });
  }
  // inkMass(w, h, shape, o): a mass of ink with a bleeding, ragged edge, pooled darker near its rim, blotchy inside.
  //   shape(x) draws the mass in any opaque colour; o.tone(X, Y) -> base tone 0..1 (may include mist); o.ragged, o.soft (px),
  //   o.pool (extra tone near the edge), o.blotch, o.fogCol, o.fog(X,Y) -> 0..1 mix toward fog
  function inkMass(w, h, shape, o = {}) {
    const S = K.canvas(w, h), sx = S.getContext('2d'); sx.save(); shape(sx); sx.restore();
    const q = 4, bw = Math.ceil(w / q), bh = Math.ceil(h / q), B = K.canvas(bw, bh), bx = B.getContext('2d');
    bx.filter = `blur(${(o.soft || 10) / q}px)`; bx.drawImage(S, 0, 0, bw, bh);
    const sd = sx.getImageData(0, 0, w, h).data, bd = bx.getImageData(0, 0, bw, bh).data;
    const N1 = noiseArr('m1', 256, 6, 4, 731), N2 = noiseArr('m2', 256, 22, 3, 732), N3 = noiseArr('m3', 256, 2.5, 3, 733);
    const out = sx.createImageData(w, h), od = out.data, fogC = o.fogCol || FOG, rag = o.ragged != null ? o.ragged : 0.35, pool = o.pool != null ? o.pool : 0.12, bl = o.blotch != null ? o.blotch : 0.12;
    for (let j = 0; j < h; j++) {
      const fy = j / q, j0 = Math.min(bh - 1, Math.floor(fy)), j1 = Math.min(bh - 1, j0 + 1), vy = fy - j0;
      for (let i = 0; i < w; i++) {
        const k = (j * w + i) * 4, fx = i / q, i0 = Math.min(bw - 1, Math.floor(fx)), i1 = Math.min(bw - 1, i0 + 1), vx = fx - i0;
        const f = (bd[(j0 * bw + i0) * 4 + 3] * (1 - vx) * (1 - vy) + bd[(j0 * bw + i1) * 4 + 3] * vx * (1 - vy) + bd[(j1 * bw + i0) * 4 + 3] * (1 - vx) * vy + bd[(j1 * bw + i1) * 4 + 3] * vx * vy) / 255;
        if (f < 0.02 && sd[k + 3] === 0) continue;
        const n1 = N1[(j & 255) * 256 + (i & 255)], n2 = N2[((j * 3) & 255) * 256 + ((i * 3) & 255)], n3 = N3[((j >> 1) & 255) * 256 + ((i >> 1) & 255)];
        const e = f + (n1 - 0.5) * rag + (n2 - 0.5) * rag * 0.45;
        const cov = smoothstep(0.42, 0.52, e);
        if (cov <= 0) continue;
        const rimK = 1 - smoothstep(0.5, 0.82, e);
        const X = i + (o.ox || 0), Y = j + (o.oy || 0);
        let tk = (o.tone ? o.tone(X, Y) : 0.8) + pool * rimK + (n3 - 0.5) * bl + (n2 - 0.5) * bl * 0.4;
        let col = mixc(PAPER, INK, clamp(tk));
        const fg = o.fog ? o.fog(X, Y) : 0; if (fg > 0) col = mixc(col, fogC, fg);
        od[k] = col[0]; od[k + 1] = col[1]; od[k + 2] = col[2]; od[k + 3] = 255 * cov;
      }
    }
    sx.putImageData(out, 0, 0); B.width = B.height = 0; return S;
  }
  // draw fn() into a scratch canvas shaped like x's canvas (same transform), then composite it once, blurred
  function softly(x, blur, fn, alpha = 1) {
    const tmp = K.canvas(x.canvas.width, x.canvas.height), tx = tmp.getContext('2d');
    tx.setTransform(x.getTransform()); fn(tx);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha *= alpha; if (blur > 0) x.filter = `blur(${blur}px)`; x.drawImage(tmp, 0, 0); x.restore();
    tmp.width = tmp.height = 0;
  }

  // ridged noise for mountain profiles: sharp crests, soft valleys
  function ridgeH(u, seed, freq, oct = 4) {
    let h = 0, a = 1, f = freq, tot = 0;
    for (let i = 0; i < oct; i++) { const n = K.noise(u * f, 0.37 + i * 7.3, seed + i * 13); const r = 1 - Math.abs(2 * n - 1); h += a * r * r; tot += a; a *= 0.48; f *= 2.13; }
    const env = 0.35 + 0.65 * K.noise(u * freq * 0.33, 4.1, seed + 99);
    return (h / tot) * env;
  }
  // a tapered brush stroke along pts: width w at the root, thinning; drawn with the current fillStyle
  function taperStroke(x, pts, w0, w1 = 0) {
    if (pts.length < 2) return; const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = i / (pts.length - 1);
      const w = lerp(w0, w1, u) * (u < 0.12 ? smooth(u / 0.12) * 0.7 + 0.3 : 1);
      Lp.push([pts[i][0] - dy / l * w / 2, pts[i][1] + dx / l * w / 2]); Rp.push([pts[i][0] + dy / l * w / 2, pts[i][1] - dx / l * w / 2]);
    }
    x.beginPath(); x.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) x.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) x.lineTo(Rp[i][0], Rp[i][1]); x.closePath(); x.fill();
  }
  // a dry-brush stroke: several hair lines with gaps, so the paper shows through
  function dryBrush(x, pts, w, col, alpha, seed) {
    const r = rng(seed), hairs = Math.max(3, Math.round(w / 1.6));
    x.save(); x.strokeStyle = col; x.lineCap = 'round';
    for (let k = 0; k < hairs; k++) {
      const off = (k / (hairs - 1) - 0.5) * w, a = alpha * (0.35 + r() * 0.65), gap0 = r() * 0.5, gap1 = gap0 + 0.15 + r() * 0.5;
      x.globalAlpha = a; x.lineWidth = 0.7 + r() * 1.4; x.beginPath(); let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const u = i / (pts.length - 1); const skip = (u > gap1 && u < gap1 + 0.12) || (K.noise(i * 0.35, k * 3.1, seed) > 0.78);
        const a0 = pts[Math.max(0, i - 1)], b0 = pts[Math.min(pts.length - 1, i + 1)], dx = b0[0] - a0[0], dy = b0[1] - a0[1], l = Math.hypot(dx, dy) || 1;
        const px = pts[i][0] - dy / l * off * (1 - u * 0.5), py = pts[i][1] + dx / l * off * (1 - u * 0.5);
        if (skip || u < gap0 * 0.2) { pen = false; continue; }
        if (!pen) { x.moveTo(px, py); pen = true; } else x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  }
  // a snowy range in the ink manner. The crest is found, its peaks located; from every peak spurs run down both flanks
  // (a dark line with a soft lee shadow), the faces fall into mist along per-column gradients that follow the crest.
  // o: w,h, seed, base, amp, freq, top (snow tone), body (tone of the face), dark (ink of lines and shadows), fogFrom, spurs, soft (px blur)
  function paintRange(o) {
    const w = o.w, h = o.h, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(o.seed), step = 2;
    const ys = new Float32Array(Math.ceil(w / step) + 3);
    for (let i = 0; i < ys.length; i++) ys[i] = o.profile ? o.profile((i - 1) * step) : o.base - o.amp * ridgeH((i - 1) * step, o.seed, o.freq);
    const ridgeAt = X => { const f = X / step + 1, i = clamp(Math.floor(f), 0, ys.length - 2), u = f - i; return lerp(ys[i], ys[i + 1], clamp(u)); };
    const fogD = o.amp * (o.fogDepth || 1.0);
    // 1) the face: per-column gradients from the crest down into the mist
    softly(x, o.soft || 0, tx => {
      for (let X = -2; X < w + 2; X += step) {
        const Y = ridgeAt(X), L = fogD * (0.75 + 0.5 * K.noise(X * 0.004, 3, o.seed));
        const g = tx.createLinearGradient(0, Y, 0, Y + L);
        g.addColorStop(0, tone(o.top)); g.addColorStop(0.12, tone(lerp(o.top, o.body, 0.5))); g.addColorStop(0.5, tone(o.body)); g.addColorStop(1, css(o.fog || FOG));
        tx.fillStyle = g; tx.fillRect(X, Y, step + 0.6, h - Y);
      }
    });
    // the peaks along the crest
    const peaks = [];
    for (let i = 8; i < ys.length - 8; i++) { let isMin = true; for (let k = -8; k <= 8; k++) if (ys[i + k] < ys[i]) { isMin = false; break; } if (isMin) peaks.push([(i - 1) * step, ys[i]]); }
    x.save(); x.beginPath(); x.moveTo(-4, h); for (let i = 0; i < ys.length; i++) x.lineTo((i - 1) * step, ys[i]); x.lineTo(w + 4, h); x.closePath(); x.clip();
    // 2) spurs: from each peak, lines that follow the crest a little way and then fall away; shadow on their lee (right) side
    const spurs = [];
    for (const [px, py] of peaks) {
      const prom = clamp((o.base - py) / o.amp);
      for (const side of [-1, 1]) {
        const ns = 2 + Math.floor(r() * (o.spurs || 3) * (0.5 + prom));
        for (let k = 0; k < ns; k++) {
          const pts = []; let X = px + side * (6 + k * 10 * r()), Y = ridgeAt(X) + 3 + k * 6, dir = side, fall = 0.4 + r() * 0.5 + k * 0.15;
          const L = (0.25 + 0.75 * r()) * o.amp * (0.6 + prom * 0.6);
          for (let i = 0; i < 16; i++) { pts.push([X, Y]); X += dir * (L / 16) * (1 - fall * 0.9); Y += (L / 16) * fall * 1.6; fall = Math.min(1, fall + 0.05); X += (K.noise(X * 0.02, Y * 0.02, o.seed + k) - 0.5) * 3; }
          if (r() < 0.35) continue;
          spurs.push({ pts: pts.slice(0, 6 + Math.floor(r() * 11)), side, a: (o.shade || 0.5) * (0.3 + 0.7 * r()) * (side > 0 ? 1 : 0.45), la: 0.55 + 0.4 * r(), lw: 1.2 + r() * 2.4 * (o.lineW || 1) });
        }
      }
    }
    // the big peaks: an arete falls from each summit; the flank to its right lies in shadow, rock showing near the top
    const arets = [];
    for (const [px, py] of peaks) {
      const prom = (o.base - py) / o.amp; if (prom < (o.minProm || 0.35)) continue;
      const pts = []; let X = px, Y = py; const L = (o.base - py) * 1.1;
      for (let i = 0; i <= 18; i++) { pts.push([X, Y]); const u = i / 18; X += (L / 18) * (0.18 + 0.5 * u * u) + (K.noise(i * 0.4, px * 0.01, o.seed) - 0.5) * 6; Y += L / 18; }
      arets.push({ pts, px, py, prom });
    }
    softly(x, 2.5, tx => {
      for (const a of arets) {
        // the shadow reaches to the next valley on the right
        let vx = a.px + 8; while (vx < w + 40 && ridgeAt(vx + 6) >= ridgeAt(vx) - 0.5) vx += 6;
        const sk = o.shadowTone != null ? o.shadowTone : 0.6;
        const g = tx.createLinearGradient(0, a.py, 0, a.py + (o.base - a.py)); g.addColorStop(0, tone(sk, 0.78)); g.addColorStop(0.55, tone(sk, 0.42)); g.addColorStop(1, tone(sk, 0.05));
        tx.fillStyle = g; tx.beginPath(); tx.moveTo(a.pts[0][0], a.pts[0][1]);
        for (const q of a.pts) { if (q[0] > vx) break; tx.lineTo(q[0], q[1]); }
        const end = a.pts[a.pts.length - 1]; tx.lineTo(Math.min(end[0], vx), end[1]); tx.lineTo(vx, end[1]);
        for (let X = vx; X >= a.px; X -= 4) tx.lineTo(X, ridgeAt(X)); tx.closePath(); tx.fill();
        // rock bands near the summit on the lit side
        for (let k = 0; k < 7; k++) { const u = 0.05 + r() * 0.4, Y = a.py + (o.base - a.py) * u, Xl = a.px - (Y - a.py) * (0.6 + r() * 0.4), L = 10 + r() * 50; tx.fillStyle = tone(o.dark, 0.35 + r() * 0.3); taperStroke(tx, [[Xl + 4, Y], [Xl + L * 0.5, Y + 3 + r() * 4], [Xl + L, Y + 8 + r() * 6]], 2 + r() * 4, 0.5); }
      }
    });
    for (const a of arets) { x.fillStyle = tone(Math.max(o.dark, 0.55), 0.7); taperStroke(x, a.pts.slice(0, 12), 2.4 * (o.lineW || 1), 0.4); }
    // lee shadows, laid soft: to the right of spurs (light from the upper left)
    softly(x, 3, tx => { tx.fillStyle = tone(o.dark); for (const sp of spurs) { const pts = sp.pts, n = pts.length; tx.globalAlpha = sp.a; tx.beginPath(); tx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) tx.lineTo(q[0], q[1]); for (let i = n - 1; i >= 0; i--) tx.lineTo(pts[i][0] + (6 + 26 * Math.sin(i / n * Math.PI)) * (sp.side > 0 ? 1 : 0.6), pts[i][1] + 4); tx.closePath(); tx.fill(); } });
    if (o.spurLines) for (const sp of spurs) { x.fillStyle = tone(o.dark, sp.la * o.spurLines); taperStroke(x, sp.pts, sp.lw, 0.3); }
    // 3) fine fall-line texture, directions from the smoothed crest slope
    for (let k = 0; k < (o.streaks || 200); k++) {
      const X0 = r() * w, Y0 = ridgeAt(X0) + 4 + r() * r() * o.amp * 0.7, sl = (ridgeAt(X0 + 40) - ridgeAt(X0 - 40)) / 80, dir = clamp(sl * 1.6, -0.6, 0.6);
      const L = 10 + r() * o.amp * 0.35, pts = []; for (let i = 0; i <= 6; i++) pts.push([X0 + dir * L * i / 6, Y0 + L * i / 6]);
      x.fillStyle = tone(o.dark, 0.12 + r() * 0.25); taperStroke(x, pts, 1 + r() * 2.2, 0.2);
    }
    texFill(x, specTile(), o.gran != null ? o.gran : 0.3, 'source-atop', r() * 256, r() * 256);
    // the mist rises over the foot again (so the texture dissolves too)
    const g = x.createLinearGradient(0, o.base - o.amp * 0.15, 0, h); g.addColorStop(0, css(o.fog || FOG, 0)); g.addColorStop(0.75, css(o.fog || FOG, 0.9)); g.addColorStop(1, css(o.fog || FOG, 1));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.restore();
    // 4) the crest, broken and heavier where it falls to the right
    for (let X = 0; X < w; X += 4) {
      const y0 = ridgeAt(X), y1 = ridgeAt(X + 4), sl = (y1 - y0) / 4, on = K.noise(X * 0.025, 1, o.seed) > 0.3;
      if (!on) continue; x.strokeStyle = tone(o.dark, clamp(0.3 + Math.abs(sl) * 0.6) * (o.crest || 0.8)); x.lineWidth = (sl > 0 ? 2.2 : 1.2) * (o.lineW || 1); x.beginPath(); x.moveTo(X, y0); x.lineTo(X + 4, y1); x.stroke();
    }
    c.ridgeAt = ridgeAt; return c;
  }
  // a crest made of a few named peaks (x, height, width) with ridged detail between them
  function peakProfile(base, peaks, seed, detail = 40) {
    return X => {
      let hgt = 0;
      for (const [px, ph, pw] of peaks) { const d = Math.abs(X - px) / pw; hgt = Math.max(hgt, ph * Math.max(0, 1 - Math.pow(d, 0.85))); }
      return base - hgt - detail * ridgeH(X, seed, 0.006, 3) * (0.4 + hgt / 400);
    };
  }
  // a fir in the snow: jagged drooping tiers, dark, snow along the upper edges
  function fir(x, X, Y, h, seed, col, snowA = 0.85) {
    const r = rng(seed), tiers = 5 + Math.floor(r() * 3);
    x.fillStyle = col; x.fillRect(X - h * 0.018, Y - h * 0.25, h * 0.036, h * 0.25);
    for (let k = 0; k < tiers; k++) {
      const u = k / tiers, ty = Y - h * (0.18 + u * 0.78), tw = h * (0.32 - u * 0.24) * (0.85 + r() * 0.3), th = h * 0.22;
      const lean = (r() - 0.5) * tw * 0.2;
      x.fillStyle = col; x.beginPath(); x.moveTo(X + lean * 0.3, ty - th * 0.55);
      const n = 6; for (let i = 0; i <= n; i++) { const v = i / n; x.lineTo(X + lean + tw * v * (1 + (i % 2) * 0.12), ty + th * 0.15 * v + (i % 2 ? -th * 0.06 : th * 0.05)); }
      x.lineTo(X - tw, ty + th * 0.12); for (let i = n; i >= 0; i--) { const v = i / n; x.lineTo(X + lean * 0.3 - tw * v * (1 + (i % 2) * 0.12), ty + th * 0.15 * v + (i % 2 ? -th * 0.06 : th * 0.05)); }
      x.closePath(); x.fill();
      if (snowA > 0) { x.fillStyle = css(SNOW, snowA * (0.6 + r() * 0.4)); x.beginPath(); x.moveTo(X, ty - th * 0.5); x.quadraticCurveTo(X + tw * 0.5, ty - th * 0.12, X + tw * 0.9, ty + th * 0.02); x.quadraticCurveTo(X + tw * 0.4, ty - th * 0.06, X, ty - th * 0.3); x.quadraticCurveTo(X - tw * 0.4, ty - th * 0.06, X - tw * 0.85, ty + th * 0.02); x.quadraticCurveTo(X - tw * 0.5, ty - th * 0.12, X, ty - th * 0.5); x.fill(); }
    }
  }
  // a big ink pine for the foreground: a leaning trunk, near-horizontal limbs, needles as bundles of short strokes
  function inkPine(x, x0, y0, hgt, seed, col, o = {}) {
    const r = rng(seed), lean = o.lean || 0;
    x.fillStyle = col; x.strokeStyle = col;
    const trunk = []; let a = -Math.PI / 2 + lean, px = x0, py = y0;
    for (let i = 0; i <= 12; i++) { trunk.push([px, py]); a += (r() - 0.5) * 0.2; px += Math.cos(a) * hgt / 12; py += Math.sin(a) * hgt / 12; }
    taperStroke(x, trunk, hgt * 0.065, hgt * 0.02);
    const needles = (cx, cy, rw, rh, dir) => {
      x.lineCap = 'round';
      for (let k = 0; k < 70; k++) {
        const u = r(), v = r(), ex = cx + (u - 0.5) * 2 * rw, ey = cy + (v - 0.6) * rh * 1.2, L = rh * (0.6 + r() * 0.9), ang = -Math.PI / 2 + (r() - 0.5) * 1.6 + dir * 0.2;
        if (((ex - cx) / rw) ** 2 + ((ey - cy) / rh) ** 2 > 1.1) continue;
        x.globalAlpha = 0.5 + r() * 0.5; x.lineWidth = 0.8 + r() * 1.6; x.beginPath(); x.moveTo(ex, ey + L * 0.3); x.lineTo(ex + Math.cos(ang) * L, ey + Math.sin(ang) * L); x.stroke();
      }
      x.globalAlpha = 0.55; x.beginPath(); x.ellipse(cx, cy + rh * 0.15, rw * 0.8, rh * 0.45, 0, 0, TAU); x.fill(); x.globalAlpha = 1;
      if (o.snow) { x.fillStyle = css(SNOW, 0.85); x.beginPath(); x.ellipse(cx - rw * 0.05, cy - rh * 0.35, rw * 0.75, rh * 0.2, 0, Math.PI, TAU); x.fill(); x.fillStyle = col; }
    };
    const nL = o.limbs || 5;
    for (let k = 0; k < nL; k++) {
      const u = 0.32 + 0.62 * (k / (nL - 1)), at = trunk[Math.round(u * 12)], side = (k % 2 ? 1 : -1) * (o.side || 1), len = hgt * (0.5 - 0.3 * u) * (0.8 + r() * 0.4);
      const pts = []; let bx = at[0], by = at[1], ba = side > 0 ? -0.12 - r() * 0.2 : Math.PI + 0.12 + r() * 0.2;
      for (let i = 0; i <= 6; i++) { pts.push([bx, by]); ba += (side > 0 ? 0.05 : -0.05) + (r() - 0.5) * 0.12; bx += Math.cos(ba) * len / 6; by += Math.sin(ba) * len / 6 + len * 0.012; }
      taperStroke(x, pts, hgt * 0.024, hgt * 0.007);
      const tip = pts[pts.length - 1], mid = pts[3];
      needles(tip[0], tip[1] - hgt * 0.02, len * 0.42, hgt * 0.05, side); needles(lerp(mid[0], tip[0], 0.3), mid[1] - hgt * 0.03, len * 0.28, hgt * 0.04, side);
    }
    const top = trunk[12]; needles(top[0], top[1], hgt * 0.14, hgt * 0.055, 0);
  }

  // a horizontal fog strip (tiles left-right): soft, noisy, light
  function fogStrip(key, W2, H2, seed, col = FOG, dens = 1) {
    return K.cached('s4:fog:' + key, () => {
      const w = Math.ceil(W2 / 2), h = Math.ceil(H2 / 2), c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = j / h, prof = Math.sin(v * Math.PI) ** 1.2, u = i / w;
        const f = (a) => K.fbm(a * 6, v * 2.2, 4, seed) * (1 - u) + K.fbm((a - 1) * 6, v * 2.2, 4, seed) * u;
        const n = f(u), a = clamp((n - 0.36) * 2.4) * prof * dens;
        const k = (j * w + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255 * a;
      }
      x.putImageData(img, 0, 0); c.sw = W2; return c;
    });
  }
  function drawFog(x, img, y, h, offset, alpha, sx = 1) {
    const w = (img.sw || img.width) * sx; let x0 = -(((offset % w) + w) % w);
    x.save(); x.globalAlpha = alpha; for (; x0 < W; x0 += w) x.drawImage(img, x0, y, w + 1, h); x.restore();
  }
  // a sky of low cloud: dark heads, pale breaks, brushed in washes
  function paintSky(w, h, seed, o = {}) {
    const c = K.canvas(w, h), x = c.getContext('2d'), r = rng(seed);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, tone(o.top != null ? o.top : 0.5)); g.addColorStop(0.55, tone(o.mid != null ? o.mid : 0.26)); g.addColorStop(1, tone(o.bot != null ? o.bot : 0.1)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // cloud masses: soft blotches (small noise canvas scaled up), then dark undersides
    const sw = Math.ceil(w / 8), sh = Math.ceil(h / 8), s = K.canvas(sw, sh), sx = s.getContext('2d'), img = sx.createImageData(sw, sh), d = img.data;
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const u = i / sw, v = j / sh, n = K.fbm(u * 5, v * 3.2, 5, seed), n2 = K.fbm(u * 11 + 3, v * 7, 4, seed + 5);
      const dark = clamp((n - 0.45) * 2.6) * (0.6 + 0.4 * (1 - v)), light = clamp((0.42 - n) * 3) * v;
      const k = (j * sw + i) * 4;
      if (dark > light) { d[k] = INK[0]; d[k + 1] = INK[1]; d[k + 2] = INK[2]; d[k + 3] = 255 * dark * (o.dark || 0.55) * (0.7 + 0.3 * n2); }
      else { d[k] = SNOW[0]; d[k + 1] = SNOW[1]; d[k + 2] = SNOW[2]; d[k + 3] = 255 * light * (o.light || 0.6); }
    }
    sx.putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, w, h);
    // brushed streaks along the wind
    for (let k = 0; k < (o.streaks || 26); k++) {
      const y0 = r() * h * 0.8, x0 = r() * w, L = 200 + r() * 600, pts = [];
      for (let i = 0; i <= 12; i++) pts.push([x0 + L * i / 12, y0 + Math.sin(i * 0.5 + k) * 6 - i * L * 0.012]);
      dryBrush(x, pts, 8 + r() * 18, tone(0.7), 0.06 + r() * 0.07, seed + k);
    }
    texFill(x, specTile(), 0.25, 'source-atop', r() * 256, r() * 256);
    return c;
  }
  // a gnarled dead pine / bare tree in ink, drawn upward from (x0, y0)
  function inkTree(x, x0, y0, hgt, seed, col, o = {}) {
    const r = rng(seed); x.fillStyle = col; x.strokeStyle = col;
    const branch = (px, py, ang, len, w, depth) => {
      const pts = []; let a = ang, qx = px, qy = py; const n = 7;
      for (let i = 0; i <= n; i++) { pts.push([qx, qy]); a += (r() - 0.5) * 0.35 + (o.lean || 0) * 0.04; qx += Math.cos(a) * len / n; qy += Math.sin(a) * len / n; }
      taperStroke(x, pts, w, w * 0.35);
      if (depth > 0) for (let k = 0; k < 2 + (r() < 0.5 ? 1 : 0); k++) { const at = pts[3 + Math.floor(r() * 4)]; branch(at[0], at[1], ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), len * (0.4 + r() * 0.25), w * 0.45, depth - 1); }
      if (o.needles && depth <= 1) { for (let k = 0; k < 3; k++) { const at = pts[2 + Math.floor(r() * 5)]; x.beginPath(); x.ellipse(at[0], at[1], len * 0.28, len * 0.09, a + (r() - 0.5) * 0.5, 0, TAU); x.globalAlpha = 0.85; x.fill(); x.globalAlpha = 1; } }
    };
    branch(x0, y0, -Math.PI / 2 + (o.lean || 0), hgt, hgt * 0.07, o.depth != null ? o.depth : 3);
  }

  // ================================================================ people and horses (drawn for this scene: they look up, flee, ride)
  // man(x, X, Y, h, o): a figure standing on (X, Y), h tall. o.face ±1, o.walk phase, o.run 0..1, o.look (-1 down .. 1 up),
  //   o.lean, o.head 'hood'|'kettle'|'helm'|'bare'|'cap'|'veil', o.hold 'spear'|'banner'|'staff'|'pole'|'sack'|'goad'|'torch'|'none',
  //   o.raise (near arm lifted 0..1), o.wave (both arms up, cheering), o.cloak 0..1, o.wind ±, o.t, o.col, o.seated, o.fall (0..1)
  function man(x, X, Y, h, o = {}) {
    const f = o.face || 1, t = o.t || 0, col = o.col || tone(0.92), run = o.run || 0;
    const walk = o.walk, look = o.look || 0, wind = o.wind != null ? o.wind : -1;
    x.save(); x.translate(X, Y); x.scale(f * h, h);
    if (o.fall) { x.translate(-0.1 * o.fall, 0); x.rotate(-o.fall * 1.25); }
    x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
    const lean = (o.lean || 0) + run * 0.32 + (walk != null ? 0.04 : 0) - look * 0.08;
    const seg = (pts, w0, w1) => taperStroke(x, pts, w0, w1);
    // legs
    const hipY = -0.5; let lift = 0;
    const legs = [];
    if (!o.seated) {
      for (const sd of [0, Math.PI]) {
        const ph = (walk != null ? walk : 0) + sd, amp = walk != null ? 0.42 + run * 0.35 : 0;
        const th = walk != null ? amp * Math.sin(ph) : (sd ? -0.06 : 0.07), flex = walk != null ? 0.08 + (0.7 + run * 0.5) * Math.max(0, Math.cos(ph)) : 0.03;
        const hx = sd ? -0.02 : 0.02, kx = hx + Math.sin(th) * 0.245, ky = hipY + Math.cos(th) * 0.245, sa = th - flex, ax = kx + Math.sin(sa) * 0.235, ay = ky + Math.cos(sa) * 0.235;
        legs.push({ hx, kx, ky, ax, ay, far: sd > 0 });
      }
      lift = -0.03 - Math.max(legs[0].ay, legs[1].ay);
    }
    x.translate(0, lift);
    const drawLeg = L => { seg([[L.hx, hipY], [L.kx, L.ky], [L.ax, L.ay]], 0.07, 0.04); x.beginPath(); x.moveTo(L.ax - 0.025, L.ay - 0.02); x.lineTo(L.ax + 0.075, L.ay + 0.005); x.lineTo(L.ax + 0.07, L.ay + 0.03); x.lineTo(L.ax - 0.03, L.ay + 0.03); x.closePath(); x.fill(); };
    if (o.colFar) x.fillStyle = o.colFar;
    for (const L of legs) if (L.far) drawLeg(L);
    x.fillStyle = col;
    if (o.seated) { seg([[0.0, hipY], [0.16, hipY + 0.14], [0.13, hipY + 0.38]], 0.085, 0.05); x.beginPath(); x.moveTo(0.11, hipY + 0.37); x.lineTo(0.2, hipY + 0.39); x.lineTo(0.19, hipY + 0.42); x.lineTo(0.1, hipY + 0.41); x.fill(); }
    // the upper body pivots at the hip
    x.save(); x.translate(0, hipY); x.rotate(lean); x.translate(0, -hipY);
    const sh = -0.81, nk = -0.86;
    // arms
    const armA = near => {
      let a, b;
      if (o.wave) { const w = Math.sin(t * 9 + (near ? 0 : 1.7) + (o.seed || 0)) * 0.25; a = near ? 2.7 + w : 2.5 - w; b = 0.35; }
      else if (near && o.raise) { a = lerp(0.3, 2.6, o.raise); b = lerp(1.2, 0.5, o.raise); }
      else if (near && ['spear', 'banner', 'staff', 'pole', 'torch', 'goad'].includes(o.hold)) { a = o.hold === 'pole' ? 0.9 : 0.32; b = o.hold === 'pole' ? 0.6 : 1.25; }
      else if (o.hold === 'sack') { a = near ? -0.2 : 2.9; b = near ? 0.4 : 0.9; }
      else if (run) { const s = Math.sin((walk || 0) + (near ? 0 : Math.PI)); a = 0.2 + s * 0.9; b = 1.4; }
      else { a = walk != null ? -0.35 * Math.sin(walk + (near ? 0 : Math.PI)) : (near ? 0.08 : -0.06); b = 0.25; }
      if (o.arms) { const ov = o.arms[near ? 0 : 1]; if (ov) { a = ov[0]; b = ov[1]; } }
      const sx = near ? 0.04 : -0.035, sy = sh + 0.03, ex = sx + Math.sin(a) * 0.18, ey = sy + Math.cos(a) * 0.18, wx = ex + Math.sin(a + b) * 0.16, wy = ey + Math.cos(a + b) * 0.16;
      return { sx, sy, ex, ey, wx, wy, a, b };
    };
    const drawArm = A => { seg([[A.sx, A.sy], [A.ex, A.ey], [A.wx, A.wy]], 0.065, 0.04); x.beginPath(); x.arc(A.wx + Math.sin(A.a + A.b) * 0.012, A.wy + Math.cos(A.a + A.b) * 0.012, 0.025, 0, TAU); x.fill(); };
    const farA = armA(false), nearA = armA(true);
    if (o.colFar) x.fillStyle = o.colFar; drawArm(farA); x.fillStyle = col;
    if (o.hold === 'sack') { x.beginPath(); x.ellipse(farA.wx - 0.03, farA.wy - 0.05, 0.11, 0.08, 0.3, 0, TAU); x.fill(); }
    // cloak behind, blown by the wind
    const cl = o.cloak != null ? o.cloak : 0.7;
    if (cl > 0) {
      const hem = lerp(-0.45, -0.1, cl), fl = (o.flap != null ? o.flap : 1), wv = k => Math.sin(t * 7 + k * 2.1 + (o.seed || 0)) * 0.02 * fl;
      const back = -0.13 * f * wind < 0 ? -1 : 1; void back;
      const bx = (wind * f) * 0.12 * fl;      // wind in screen space: negative blows to the left
      x.beginPath(); x.moveTo(0.06, nk + 0.02); x.quadraticCurveTo(-0.12, sh - 0.01, -0.14 + bx * 0.3, sh + 0.08);
      x.bezierCurveTo(-0.17 + bx * 0.6 + wv(1), -0.5, -0.2 + bx + wv(2), hem - 0.1, -0.16 + bx * 1.3 + wv(3), hem + wv(4));
      x.lineTo(0.02 + bx * 0.5, hem + 0.02 + wv(5)); x.lineTo(0.09, sh + 0.06); x.closePath(); x.fill();
    }
    // torso
    const kind = o.kind || 'cloak';
    x.beginPath(); x.moveTo(-0.03, nk + 0.01); x.quadraticCurveTo(-0.11, nk + 0.02, -0.105, sh + 0.04); x.bezierCurveTo(-0.11, -0.66, -0.085, -0.6, -0.08, -0.56);
    const hemY = kind === 'robe' ? -0.02 : kind === 'tunic' || kind === 'armour' ? -0.33 : -0.36, hw = kind === 'robe' ? 0.17 : 0.12;
    x.bezierCurveTo(-0.11, -0.45, -hw, hemY - 0.08, -hw - 0.01, hemY); x.quadraticCurveTo(0, hemY + 0.015, hw + 0.01, hemY); x.bezierCurveTo(hw, hemY - 0.08, 0.11, -0.45, 0.08, -0.56);
    x.bezierCurveTo(0.085, -0.6, 0.11, -0.66, 0.105, sh + 0.04); x.quadraticCurveTo(0.11, nk + 0.02, 0.03, nk + 0.01); x.closePath(); x.fill();
    // head, tilting back to look up
    x.save(); x.translate(0.005, nk); x.rotate(-look * 0.78); x.translate(-0.005, -nk);
    x.fillRect(-0.022, nk - 0.03, 0.044, 0.05);
    const hx = 0.012, hy = -0.918, R = 0.054, Ry = 0.064, hd = o.head || 'hood';
    x.beginPath(); x.ellipse(hx, hy, R, Ry, 0, 0, TAU); x.moveTo(hx + R * 0.85, hy - Ry * 0.1); x.lineTo(hx + R * 1.3, hy + Ry * 0.2); x.lineTo(hx + R * 0.8, hy + Ry * 0.45); x.fill();
    if (hd === 'hood') { x.beginPath(); x.moveTo(hx + R * 1.05, hy + Ry * 0.8); x.quadraticCurveTo(hx + R * 1.5, hy - Ry * 1.3, hx - R * 0.2, hy - Ry * 1.45); x.quadraticCurveTo(hx - R * 2.2, hy - Ry * 1.0, hx - R * 2.8 + wind * f * 0.02, hy + Ry * 0.9); x.lineTo(hx - R * 1.4, hy + Ry * 2.2); x.lineTo(hx + R * 0.9, hy + Ry * 1.6); x.closePath(); x.fill(); }
    if (hd === 'kettle') { x.beginPath(); x.moveTo(hx - R * 2, hy - Ry * 0.2); x.quadraticCurveTo(hx, hy - Ry * 0.55, hx + R * 2, hy - Ry * 0.2); x.lineTo(hx + R * 1.05, hy - Ry * 0.55); x.quadraticCurveTo(hx, hy - Ry * 2.0, hx - R * 1.05, hy - Ry * 0.55); x.closePath(); x.fill(); }
    if (hd === 'helm') { x.beginPath(); x.moveTo(hx - R * 1.15, hy + Ry * 0.3); x.quadraticCurveTo(hx - R * 1.2, hy - Ry * 1.4, hx + R * 0.1, hy - Ry * 1.85); x.quadraticCurveTo(hx + R * 1.25, hy - Ry * 1.35, hx + R * 1.15, hy + Ry * 0.3); x.closePath(); x.fill(); }
    if (hd === 'cap') { x.beginPath(); x.ellipse(hx - R * 0.15, hy - Ry * 0.5, R * 1.15, Ry * 0.75, -0.15, Math.PI, 0); x.fill(); }
    if (hd === 'veil') { x.beginPath(); x.moveTo(hx + R * 0.9, hy - Ry * 0.6); x.quadraticCurveTo(hx, hy - Ry * 1.6, hx - R * 1.2, hy - Ry * 0.4); x.lineTo(hx - R * 2.2, hy + Ry * 2.6); x.lineTo(hx + R * 0.1, hy + Ry * 2.0); x.closePath(); x.fill(); }
    x.restore();
    // what the near hand holds, then the near arm
    const gx = nearA.wx, gy = nearA.wy;
    if (o.hold === 'spear' || o.hold === 'staff' || o.hold === 'banner' || o.hold === 'goad' || o.hold === 'torch') {
      const ang = o.holdAng || 0, top = o.hold === 'staff' ? -1.08 : o.hold === 'torch' ? gy - 0.32 : -1.42, bot = o.hold === 'torch' ? gy + 0.1 : 0.0;
      x.save(); x.translate(gx, gy); x.rotate(ang); x.translate(-gx, -gy);
      x.fillRect(gx - 0.008, top, 0.016, bot - top);
      if (o.hold === 'spear') { x.beginPath(); x.moveTo(gx, top - 0.13); x.quadraticCurveTo(gx + 0.032, top - 0.05, gx + 0.012, top + 0.01); x.lineTo(gx - 0.012, top + 0.01); x.quadraticCurveTo(gx - 0.032, top - 0.05, gx, top - 0.13); x.fill(); }
      if (o.hold === 'goad') { x.lineWidth = 0.016; x.beginPath(); x.moveTo(gx, top); x.quadraticCurveTo(gx + 0.1, top - 0.08, gx + 0.09, top + 0.04); x.stroke(); }
      if (o.hold === 'banner') {
        const bw = 0.5, bh = 0.24, by = top + 0.03, ph = t * 6 + (o.seed || 0), bc = o.bannerCol || BANNER_DULL;
        x.fillStyle = bc; x.beginPath(); x.moveTo(gx, by);
        for (let k = 0; k <= 12; k++) { const u = k / 12; x.lineTo(gx + wind * f * bw * u * -1 * -1 * (wind < 0 ? -1 : 1) * 0 + (f * wind < 0 ? -1 : 1) * bw * u, by + Math.sin(ph - u * 5) * 0.03 * u + u * 0.03); }
        const tipx = gx + (f * wind < 0 ? -1 : 1) * bw; x.lineTo(tipx - (f * wind < 0 ? -1 : 1) * 0.08, by + bh * 0.5 + Math.sin(ph - 5) * 0.03); x.lineTo(tipx, by + bh + Math.sin(ph - 5) * 0.03);
        for (let k = 12; k >= 0; k--) { const u = k / 12; x.lineTo(gx + (f * wind < 0 ? -1 : 1) * bw * u, by + bh * (1 - u * 0.3) + Math.sin(ph - u * 5) * 0.03 * u); }
        x.closePath(); x.fill(); x.fillStyle = col;
      }
      if (o.hold === 'torch') { x.restore(); x.save(); }
      x.restore();
    }
    if (o.hold === 'pole') { x.save(); x.translate(gx, gy); x.rotate(o.holdAng != null ? o.holdAng : -0.9); x.fillRect(-0.01, -0.02, o.poleLen || 1.6, 0.02); x.restore(); }
    drawArm(nearA);
    x.restore();   // upper body
    for (const L of legs) if (!L.far) drawLeg(L);
    x.restore();
  }
  // steed(x, X, Y, h, o): a horse standing on (X, Y), h tall at the withers. o.face, o.walk, o.rear 0..1, o.headUp 0..1, o.col, o.colFar,
  //   o.rider (man options; drawn astride), o.cloth (colour of a caparison)
  function steed(x, X, Y, h, o = {}) {
    const f = o.face || 1, ph = o.walk, col = o.col || tone(0.92), rear = o.rear || 0, hu = o.headUp || 0;
    x.save(); x.translate(X, Y); x.scale(f * h, h);
    // rearing: pivot on the hind hooves
    if (rear) { x.translate(-0.45, 0); x.rotate(-rear * 0.62); x.translate(0.45, 0); }
    const bob = ph != null ? Math.sin(ph * 2) * 0.012 : 0;
    x.translate(0, bob); x.fillStyle = col;
    const leg = (hx, hy, phase, front, far) => {
      const p = ph != null ? ph + phase : 0, sw = ph != null ? Math.sin(p) : 0, lift = ph != null ? Math.max(0, Math.cos(p)) : 0;
      let a1 = sw * 0.32, k = (front ? -1 : 1) * lift * 0.8;
      if (front && rear) { a1 = -0.9 * rear + sw * 0.2; k = -1.7 * rear; }
      const L1 = front ? 0.36 : 0.34, L2 = front ? 0.32 : 0.36;
      const kx = hx + Math.sin(a1 + (front ? 0 : 0.25)) * L1, ky = hy + Math.cos(a1 + (front ? 0 : 0.25)) * L1;
      const a2 = a1 + k + (front ? 0 : -0.3), fx = kx + Math.sin(a2) * L2, fy = ky + Math.cos(a2) * L2;
      const hfx = fx + Math.sin(a2 + 0.25) * 0.06, hfy = Math.min(fy + 0.06, -0.0);
      if (far && o.colFar) x.fillStyle = o.colFar;
      taperStroke(x, [[hx, hy], [kx, ky], [fx, fy]], front ? 0.13 : 0.16, 0.055);
      x.beginPath(); x.moveTo(fx - 0.03, fy - 0.01); x.lineTo(hfx + 0.045, hfy - 0.02); x.lineTo(hfx + 0.05, hfy + 0.01); x.lineTo(hfx - 0.035, hfy + 0.01); x.closePath(); x.fill();
      x.fillStyle = col;
    };
    leg(0.33, -0.66, Math.PI * 0.5, true, true); leg(-0.45, -0.7, Math.PI * 1.5, false, true);
    // tail
    const tw = ph != null ? Math.sin(ph) * 0.04 : 0;
    x.beginPath(); x.moveTo(-0.6, -0.93); x.bezierCurveTo(-0.78, -0.86, -0.82 + tw, -0.6, -0.76 + tw * 1.6, -0.3); x.lineTo(-0.7 + tw, -0.36); x.bezierCurveTo(-0.72, -0.6, -0.68, -0.8, -0.56, -0.85); x.closePath(); x.fill();
    // body, neck and head (the head lifts in alarm)
    const nx = 0.72 + hu * -0.02, ny = -1.44 - hu * 0.12;
    x.beginPath();
    x.moveTo(0.3, -1.0); x.bezierCurveTo(0.12, -0.94, -0.06, -0.92, -0.22, -0.95); x.bezierCurveTo(-0.4, -0.99, -0.55, -0.99, -0.62, -0.88);
    x.bezierCurveTo(-0.68, -0.78, -0.64, -0.66, -0.55, -0.62); x.bezierCurveTo(-0.38, -0.56, 0.16, -0.55, 0.36, -0.6);
    x.bezierCurveTo(0.5, -0.64, 0.56, -0.74, 0.54, -0.86); x.bezierCurveTo(0.6, -1.0, nx - 0.04, -1.12 - hu * 0.1, nx - 0.03, ny + 0.2);
    x.bezierCurveTo(nx + 0.08, ny + 0.24, nx + 0.2, ny + 0.32 - hu * 0.06, nx + 0.27, ny + 0.33 - hu * 0.1);
    x.bezierCurveTo(nx + 0.31, ny + 0.29 - hu * 0.1, nx + 0.29, ny + 0.24 - hu * 0.08, nx + 0.24, ny + 0.2 - hu * 0.06);
    x.bezierCurveTo(nx + 0.16, ny + 0.12, nx + 0.08, ny + 0.03, nx, ny); x.lineTo(nx - 0.01, ny - 0.09); x.lineTo(nx - 0.05, ny);
    x.bezierCurveTo(nx - 0.17, ny + 0.06, 0.45, -1.16, 0.3, -1.0); x.closePath(); x.fill();
    // mane
    x.beginPath(); x.moveTo(nx - 0.05, ny + 0.01); for (let k = 0; k <= 8; k++) { const u = k / 8; x.lineTo(lerp(nx - 0.05, 0.3, u) - 0.05 - (k % 2) * 0.035 + (o.t ? Math.sin(o.t * 8 + k) * 0.01 : 0), lerp(ny, -1.0, u) + (k % 2) * 0.02); } x.lineTo(0.3, -1.0); x.closePath(); x.fill();
    if (o.cloth) { x.save(); x.fillStyle = o.cloth; x.beginPath(); x.moveTo(-0.5, -0.97); x.bezierCurveTo(-0.2, -0.94, 0.12, -0.96, 0.4, -0.99); x.lineTo(0.48, -0.52); for (let k = 0; k <= 10; k++) x.lineTo(lerp(0.48, -0.55, k / 10), -0.48 + (k % 2) * 0.035); x.closePath(); x.fill(); x.restore(); }
    leg(0.4, -0.66, Math.PI * 1.5, true, false); leg(-0.38, -0.7, Math.PI * 0.5, false, false);
    if (o.rider) { const r0 = Object.assign({ face: 1, head: 'helm', kind: 'tunic', cloak: 0.5, col }, o.rider, { seated: true, walk: undefined }); man(x, -0.02, -0.96 + 0.5 * 1.15 - 0.03, 1.15, Object.assign(r0, { face: 1 })); }
    x.restore();
  }

  // ================================================================ parallax staging
  // a 2.5D camera for painted layers: {x, y} offset in main-layer pixels, z zoom, depth (0 = a flat page .. 1 = full parallax)
  function layerT(cam, p) { const pe = lerp(1, p, cam.depth != null ? cam.depth : 1), Z = Math.pow(cam.z, 0.55 + 0.45 * pe); return { pe, Z, ox: W / 2 - (cam.x * pe + W / 2) * Z, oy: H / 2 - (cam.y * pe + H / 2) * Z }; }
  function toScreen(cam, p, X, Y) { const L = layerT(cam, p); return [L.ox + X * L.Z, L.oy + Y * L.Z, L.Z]; }
  function lay(x, img, X0, Y0, cam, p, o = {}) {
    const L = layerT(cam, p), Z = L.Z * (o.s || 1), sx = L.ox + X0 * L.Z, sy = L.oy + Y0 * L.Z;
    const x0 = clamp(-sx / Z, 0, img.width), x1 = clamp((W - sx) / Z, 0, img.width), y0 = clamp(-sy / Z, 0, img.height), y1 = clamp((H - sy) / Z, 0, img.height);
    if (x1 - x0 < 1 || y1 - y0 < 1) return;
    const a = Math.floor(x0), b = Math.ceil(x1), c = Math.floor(y0), d = Math.ceil(y1);
    if (o.alpha != null) { x.save(); x.globalAlpha = o.alpha; }
    x.drawImage(img, a, c, b - a, d - c, sx + a * Z, sy + c * Z, (b - a) * Z, (d - c) * Z);
    if (o.alpha != null) x.restore();
  }
  // apply the layer transform so world drawing (figures) lands on that layer
  function withLayer(x, cam, p, fn) { const L = layerT(cam, p); x.save(); x.setTransform(L.Z, 0, 0, L.Z, L.ox, L.oy); fn(L.Z); x.restore(); }

  // ================================================================ snow on the wind
  function snow(x, t, o = {}) {
    const r = rng(o.seed || 41), n = o.n || 160, wind = o.wind != null ? o.wind : 90, fall = o.fall || 55, al = o.alpha != null ? o.alpha : 0.8, sz = o.size || 1, sp = disc();
    const gust = (o.gust || 0) * (0.6 + 0.4 * Math.sin(t * 1.3)), col = o.col || SNOW, ox = o.ox || 0, oy = o.oy || 0;
    const tint = K.cached('s4:flake:' + col.join(','), () => { const c = K.canvas(64, 64), cx = c.getContext('2d'); cx.drawImage(sp, 0, 0); cx.globalCompositeOperation = 'source-in'; cx.fillStyle = css(col); cx.fillRect(0, 0, 64, 64); return c; });
    x.save();
    for (let i = 0; i < n; i++) {
      const z = Math.pow(r(), 1.6), d = 0.35 + z * 1.65, x0 = r() * (W + 200), y0 = r() * (H + 200), ph = r() * TAU, sw = 10 + r() * 30;
      const vx = (wind + gust * 260) * d, vy = fall * d;
      const px = ((x0 + t * vx + Math.sin(t * 0.9 + ph) * sw - ox * d) % (W + 200) + W + 200) % (W + 200) - 100;
      const py = ((y0 + t * vy - oy * d) % (H + 200) + H + 200) % (H + 200) - 100;
      const s = (1.2 + z * 7) * sz, a = al * (0.35 + 0.65 * (1 - Math.abs(z - 0.55))) * (z > 0.85 ? 0.6 : 1);
      x.globalAlpha = a;
      const streak = o.streak ? Math.min(3.5, 1 + Math.hypot(vx, vy) * o.streak / 60) : 1;
      if (streak > 1.05) { x.save(); x.translate(px, py); x.rotate(Math.atan2(vy, vx)); x.drawImage(tint, -s * streak, -s, s * 2 * streak, s * 2); x.restore(); }
      else x.drawImage(tint, px - s, py - s, s * 2, s * 2);
    }
    x.restore();
  }

  // ================================================================ the mountain pass
  // the road on the cliff (main-layer coordinates)
  const PASS = { x0: -420, y0: -60, w: 2760, h: 1220 };
  const roadY = X => 846 - 0.07 * (X + 420) + 18 * Math.sin((X + 420) / 360);
  // the rock above the road: a low, snowy bank on the left, crags towering on the right
  const wallTop = X => roadY(X) - 60 - 40 * K.fbm(X * 0.01, 1.2, 3, 518) - 1150 * Math.pow(smoothstep(820, 1900, X), 1.5) - 70 * K.fbm(X * 0.004, 2.2, 4, 517) - smoothstep(950, 1300, X) * 130 * Math.pow(1 - Math.abs(2 * K.noise(X * 0.012, 7.7, 519) - 1), 3);
  function paintPass() {
    return K.cached('s4:pass:main', () => {
      const { x0, y0, w, h } = PASS, r = rng(5151);
      const lipY = X => roadY(X) + 20 + 2 * Math.sin(X * 0.05);
      // the rock: the wall above the road and the fall below it, one dark mass with a bleeding edge
      const c = inkMass(w, h, x => {
        x.translate(-x0, -y0); x.fillStyle = '#000';
        x.beginPath(); x.moveTo(x0 - 20, y0 + h + 20); for (let X = x0 - 20; X <= x0 + w + 20; X += 8) x.lineTo(X, Math.max(y0 - 40, wallTop(X))); x.lineTo(x0 + w + 20, y0 + h + 20); x.closePath(); x.fill();
      }, {
        ox: x0, oy: y0, soft: 14, ragged: 0.4, pool: 0.1, blotch: 0.16,
        tone: (X, Y) => { const ry = roadY(X); return Y < ry ? lerp(0.62, 0.86, smoothstep(wallTop(X), ry, Y)) : lerp(0.9, 0.55, smoothstep(ry + 20, ry + 300, Y)); },
        fog: (X, Y) => { const ry = roadY(X); return Y > ry ? smoothstep(ry + 90, ry + 380, Y) : smoothstep(wallTop(X) + 420, wallTop(X) - 40, Y) * 0.35 + smoothstep(380, -60, Y) * 0.7; },
      });
      const x = c.getContext('2d');
      x.translate(-x0, -y0);
      const X0 = x0, X1 = x0 + w;
      // dry-brush texture: pale streaks of exposed rock catching the light, and darker cracks
      x.save(); x.beginPath(); x.moveTo(X0, roadY(X0) - 6); for (let X = X0; X <= X1; X += 8) x.lineTo(X, roadY(X) - 6); for (let X = X1; X >= X0; X -= 8) x.lineTo(X, Math.max(y0, wallTop(X) + 6)); x.closePath(); x.clip();
      for (let k = 0; k < 70; k++) { const X = X0 + r() * w, top = Math.max(y0, wallTop(X)), Y = top + r() * (roadY(X) - top), L = 30 + r() * 140; dryBrush(x, [[X, Y], [X + L * 0.5, Y - L * 0.06], [X + L, Y - L * 0.1]], 6 + r() * 12, tone(0.25), 0.18, 1200 + k); }
      for (let k = 0; k < 60; k++) { const X = X0 + r() * w, top = Math.max(y0, wallTop(X)), Y = top + r() * (roadY(X) - top) * 0.9, L = 30 + r() * 160, pts = []; for (let i = 0; i <= 8; i++) pts.push([X + (K.noise(k, i * 0.5, 31) - 0.5) * 10, Y + L * i / 8]); x.fillStyle = tone(0.97, 0.4 + r() * 0.4); taperStroke(x, pts, 2 + r() * 4, 0.5); }
      // soft paler bands down the face where snow has slid
      softly(x, 6, tx => { for (let k = 0; k < 16; k++) { const X = 950 + r() * 1350, top = Math.max(y0, wallTop(X) + 30); if (top > roadY(X) - 140) continue; const L = (roadY(X) - top) * (0.3 + r() * 0.5), pts = []; for (let i = 0; i <= 10; i++) pts.push([X + (K.noise(k * 1.7, i * 0.4, 41) - 0.5) * 30 - i * 2, top + L * i / 10]); tx.fillStyle = css(mixc(PAPER, INK, 0.45), 0.5); taperStroke(tx, pts, 16 + r() * 22, 2); } });
      x.restore();
      // snow on the crest of the wall: a cornice, with the contour heavy beneath it
      const crest = []; for (let X = X0; X <= X1; X += 10) { const Y = wallTop(X); if (Y > y0 - 10) crest.push([X, Y]); }
      softly(x, 1.2, tx => {
        for (let i = 0; i + 4 < crest.length; i += 3) {
          if (K.noise(i * 0.21, 2, 19) < 0.38) continue; const seg = crest.slice(i, i + 5);
          tx.fillStyle = css(mixc(SNOW, FOG, smoothstep(500, 0, seg[0][1]) * 0.5), 0.85); tx.beginPath(); tx.moveTo(seg[0][0], seg[0][1] - 1);
          for (const p of seg) tx.lineTo(p[0], p[1] - 3); for (let j = seg.length - 1; j >= 0; j--) tx.lineTo(seg[j][0], seg[j][1] + 3 + 9 * K.noise((i + j) * 0.4, 2, 9)); tx.closePath(); tx.fill();
        }
      });
      // firs on the bank
      for (let k = 0; k < 34; k++) { const X = -420 + r() * 1700, top = wallTop(X); if (top < 300) continue; fir(x, X, top + 8 + r() * 14, 30 + r() * 58, 300 + k, tone(0.93), 0.9); }
      // the road: a clean ledge of packed snow, ruts, a dark lip with icicles at the drop
      const road = () => { x.beginPath(); x.moveTo(X0, roadY(X0) - 6); for (let X = X0; X <= X1; X += 8) x.lineTo(X, roadY(X) - 6); for (let X = X1; X >= X0; X -= 8) x.lineTo(X, lipY(X)); x.closePath(); };
      road(); let g = x.createLinearGradient(0, 600, 0, 880); g.addColorStop(0, css(mixc(PAPER, SNOW, 0.85))); g.addColorStop(1, css(mixc(PAPER, SNOW, 0.5))); x.fillStyle = g; x.fill();
      x.save(); road(); x.clip();
      for (let k = 0; k < 2; k++) { x.strokeStyle = tone(0.5, 0.3); x.lineWidth = 1.2; x.setLineDash([26 + k * 9, 12, 7, 11]); x.beginPath(); for (let X = X0; X <= X1; X += 10) { const Y = roadY(X) + 5 + k * 7; X === X0 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.stroke(); }
      x.setLineDash([]); texFill(x, specTile(), 0.14, 'source-atop', 5, 5);
      g = x.createLinearGradient(0, 0, 0, 1); void g;
      x.restore();
      const lip = []; for (let X = X0; X <= X1; X += 12) lip.push([X, lipY(X)]);
      x.fillStyle = tone(0.95, 0.95); for (let i = 0; i + 5 < lip.length; i += 4) taperStroke(x, lip.slice(i, i + 6), 3 + 2.5 * K.noise(i, 2, 4), 2.5);
      for (let k = 0; k < 170; k++) { const X = X0 + r() * w, Y = lipY(X) + 1, L = 4 + r() * r() * 36; x.fillStyle = r() < 0.7 ? tone(0.95, 0.75) : css(SNOW, 0.7); taperStroke(x, [[X, Y], [X + 0.6, Y + L * 0.5], [X, Y + L]], 2 + r() * 2.4, 0.2); }
      for (let X = X0; X < X1; X += 14 + r() * 30) { const Y = roadY(X) - 5, L = 30 + r() * 70; x.fillStyle = css(SNOW, 0.95); x.beginPath(); x.moveTo(X, Y + 2); x.quadraticCurveTo(X + L * 0.4, Y - 7 - r() * 6, X + L, Y + 2); x.closePath(); x.fill(); }
      for (let X = X0 + 60; X < X1; X += 260 + r() * 160) { const Y = lipY(X) - 2; x.fillStyle = tone(0.95); x.fillRect(X, Y - 26, 4, 28); x.fillStyle = css(SNOW, 0.9); x.fillRect(X - 1, Y - 28, 6, 3); }
      return c;
    });
  }
  // the foreground: a dark outcrop with a dead pine, out of focus
  function paintFore() {
    return K.cached('s4:pass:fore', () => {
      const w = 1000, h = 760, r = rng(6161);
      const c = inkMass(w, h, x => {
        x.fillStyle = '#000'; x.beginPath(); x.moveTo(0, h); x.lineTo(0, 330); x.bezierCurveTo(90, 300, 170, 318, 250, 352); x.bezierCurveTo(330, 384, 380, 380, 440, 420);
        x.bezierCurveTo(520, 470, 560, 560, 640, 620); x.bezierCurveTo(700, 662, 760, 700, 800, h); x.closePath(); x.fill();
      }, { soft: 18, ragged: 0.5, pool: 0.06, blotch: 0.1, tone: (X, Y) => lerp(0.86, 0.97, smoothstep(330, 700, Y)) });
      const x = c.getContext('2d');
      softly(x, 1.5, tx => { tx.fillStyle = css(SNOW, 0.92); tx.beginPath(); tx.moveTo(0, 336); tx.bezierCurveTo(90, 304, 170, 322, 250, 356); tx.bezierCurveTo(330, 388, 380, 384, 440, 424); tx.bezierCurveTo(380, 404, 320, 400, 250, 372); tx.bezierCurveTo(170, 344, 90, 330, 0, 350); tx.closePath(); tx.fill(); });
      inkPine(x, 200, 340, 430, 6162, tone(0.95), { lean: 0.2, limbs: 6, side: 1, snow: true });
      void r;
      // out of focus: blur the whole outcrop once
      const o = K.canvas(w, h), ox = o.getContext('2d'); ox.filter = 'blur(4px)'; ox.drawImage(c, 0, 0); c.width = c.height = 0;
      return o;
    });
  }
  // the page margin: blank paper around the painting, dissolving as the page gains depth
  function paintMargin() {
    return K.cached('s4:pass:margin', () => {
      const w = 480, h = 270, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
      // painting area inside, ragged wash edges
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = (i / w - 0.5) * 2, v = (j / h - 0.5) * 2, e = Math.max(Math.abs(u) * 1.0, Math.abs(v) * 1.0);
        const n = K.fbm(i / 34, j / 34, 4, 808) - 0.5, n2 = K.fbm(i / 6, j / 6, 2, 809) - 0.5;
        const a = clamp((e + n * 0.22 + n2 * 0.05 - 0.8) / 0.12);
        const k = (j * w + i) * 4; d[k] = PAPER[0]; d[k + 1] = PAPER[1]; d[k + 2] = PAPER[2]; d[k + 3] = 255 * a;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // the convoy: small figures in silhouette (the wide shot)
  const CONVOY = [
    { k: 'spear', s: 0 }, { k: 'spear', s: 24 }, { k: 'rider', s: 66, banner: true }, { k: 'man', s: 104 }, { k: 'wagon', s: 170 },
    { k: 'man', s: 238 }, { k: 'spear', s: 258 }, { k: 'wagon', s: 322 }, { k: 'rider', s: 396 }, { k: 'man', s: 430 }, { k: 'man', s: 452 }, { k: 'spear', s: 474 },
  ];
  const BANNER_DULL = css(mixc(VERM, INK, 0.25));
  function smallWagon(x, X, Y, h, ph, col, canvasCol) {
    // two horses ahead, a box, an arched canvas cover, two spoked wheels
    K.horse(x, X + h * 1.45, Y, h * 0.62, { walk: ph, fill: col, face: 1 });
    K.horse(x, X + h * 1.05, Y + 0.5, h * 0.62, { walk: ph + 1.6, fill: col, face: 1 });
    x.fillStyle = col; x.fillRect(X - h * 0.9, Y - h * 0.62, h * 1.5, h * 0.26);
    x.strokeStyle = col; x.lineWidth = Math.max(1, h * 0.05); x.beginPath(); x.moveTo(X + h * 0.6, Y - h * 0.5); x.lineTo(X + h * 1.2, Y - h * 0.45); x.stroke();
    x.fillStyle = canvasCol; x.beginPath(); x.moveTo(X - h * 0.92, Y - h * 0.6); x.bezierCurveTo(X - h * 0.95, Y - h * 1.25, X + h * 0.62, Y - h * 1.25, X + h * 0.6, Y - h * 0.6); x.closePath(); x.fill();
    x.strokeStyle = col; x.lineWidth = Math.max(0.8, h * 0.035); x.stroke();
    for (const wx of [X - h * 0.55, X + h * 0.32]) {
      const R = h * 0.26, cy = Y - R; x.lineWidth = Math.max(1, h * 0.045); x.beginPath(); x.arc(wx, cy, R, 0, TAU); x.stroke();
      for (let k = 0; k < 6; k++) { const a = ph * 0.9 + k * Math.PI / 3; x.beginPath(); x.moveTo(wx, cy); x.lineTo(wx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke(); }
    }
  }
  function drawConvoySmall(x, t, X0, speed, h, o = {}) {
    const col = o.col || tone(0.92), canvasCol = o.canvas || tone(0.25);
    for (const m of CONVOY) {
      const X = X0 + m.s + speed, Y = roadY(X) + 9, ph = (X0 + m.s + speed) * 0.09;
      if (m.k === 'wagon') smallWagon(x, X, Y, h * 0.95, ph, col, canvasCol);
      else if (m.k === 'rider') K.horse(x, X, Y, h * 0.62, { walk: ph, fill: col, rider: { head: 'helm', hold: m.banner ? 'banner' : 'spear', bannerFill: BANNER_DULL, t, kind: 'cloak' } });
      else K.figure(x, X, Y, h, { kind: m.k === 'spear' ? 'armour' : 'cloak', head: m.k === 'spear' ? 'kettle' : 'hood', hold: m.k === 'spear' ? 'spear' : 'staff', walk: ph * 1.4, fill: col, t });
    }
  }

  function shotPage(x, t, sh) {
    const S = K.scene(4), lt = t - S.start, L18 = K.cue('L18');
    const push = ease(span(t, S.start + 0.3, L18.start + 0.4)), depth = smooth(span(t, S.start + 0.9, S.start + 3.4));
    const hd = K.shake(t * 0.35, 9, 401);
    const cam = { x: lerp(-40, 150, smooth(span(t, S.start, sh.b + 0.8))) + hd[0], y: lerp(10, -10, push) + hd[1] * 0.6, z: lerp(0.8, 1.0, push), depth };
    const live = smooth(span(t, S.start + 0.8, S.start + 2.6));
    // sky, far and middle ranges, fog between
    const sky = K.cached('s4:pass:sky', () => paintSky(2600, 820, 811, { top: 0.66, mid: 0.38, bot: 0.1, dark: 0.75, light: 0.55, streaks: 40 }));
    lay(x, sky, -340, -120, cam, 0.06);
    const far = K.cached('s4:pass:far', () => paintRange({ w: 2700, h: 600, seed: 33, base: 470, amp: 430, freq: 0.0016, top: 0.03, body: 0.15, dark: 0.36, streaks: 80, spurs: 2, shade: 0.32, crest: 0.45, soft: 1.5, fogDepth: 0.95, spurLines: 0.2,
      shadowTone: 0.78, minProm: 0.3,
      profile: peakProfile(560, [[180, 250, 260], [330, 175, 130], [560, 330, 300], [720, 225, 150], [980, 210, 260], [1160, 150, 120], [1380, 420, 360], [1570, 300, 190], [1820, 260, 300], [2010, 185, 140], [2200, 360, 330], [2420, 250, 170], [2600, 240, 280]], 33, 60) }));
    lay(x, far, -390, 120, cam, 0.16);
    drawFog(x, fogStrip('passA', 1600, 220, 91), toScreen(cam, 0.3, 0, 520)[1], 220 * cam.z, cam.x * 0.3 + t * 9, 0.75);
    const mid = K.cached('s4:pass:mid', () => paintRange({ w: 2900, h: 600, seed: 57, base: 380, amp: 300, freq: 0.0026, top: 0.3, body: 0.5, dark: 0.85, streaks: 140, spurs: 3, shade: 0.55, crest: 0.8, soft: 2.0, lineW: 1.2, fogDepth: 0.8, spurLines: 0.4 }));
    lay(x, mid, -490, 330, cam, 0.36);
    drawFog(x, fogStrip('passB', 1800, 260, 92), toScreen(cam, 0.5, 0, 700)[1], 260 * cam.z, cam.x * 0.5 + t * 14, 0.85);
    // the cliff and its road, with the convoy on it
    lay(x, paintPass(), PASS.x0, PASS.y0, cam, 1);
    withLayer(x, cam, 1, () => drawConvoySmall(x, t, 220, 26 * Math.max(0, lt - 1.2) * live + 0, 46, { col: tone(0.92) }));
    // mist rising out of the gorge, the foreground rock, snow
    drawFog(x, fogStrip('passC', 2000, 300, 93, FOG, 1.2), toScreen(cam, 1.05, 0, 900)[1], 300 * cam.z, cam.x * 1.05 + t * 18, 0.9);
    lay(x, paintFore(), -330, 470, cam, 1.7, { alpha: smooth(depth) });
    snow(x, t, { n: 260, wind: 140, fall: 60, alpha: 0.85 * live, seed: 42, ox: cam.x * 1.2, gust: 0.3 });
    // the paper around the painting, while it is still a page
    const ma = 1 - smooth(span(t, S.start + 1.2, S.start + 3.2));
    if (ma > 0.001) {
      const L = layerT(cam, 1), mx = L.ox + (-260) * L.Z, my = L.oy + (-170) * L.Z, mw = 2440 * L.Z, mh = 1420 * L.Z;
      x.save(); x.globalAlpha = ma; x.drawImage(paintMargin(), mx, my, mw, mh); x.fillStyle = css(PAPER);
      x.fillRect(-10, -10, mx + 12, H + 20); x.fillRect(mx + mw - 2, -10, W, H + 20); x.fillRect(-10, -10, W + 20, my + 12); x.fillRect(-10, my + mh - 2, W + 20, H); x.restore();
    }
  }

  // ================================================================ finishing: paper, vignette, grade (cached where possible)
  function paperMottle() {
    return K.cached('s4:mottle', () => {
      const c = K.canvas(W, H), x = c.getContext('2d'), r = rng(4407);
      x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, W, H);
      const t1 = noiseTile('mot1', 256, 3, 4, 71, 1.6), t2 = noiseTile('mot2', 256, 9, 3, 72, 1.4);
      x.globalAlpha = 0.5; x.imageSmoothingQuality = 'high'; x.drawImage(t1, 0, 0, W, H); x.globalAlpha = 0.3; K.tile(x, t2, 0, 0, W, H);
      void r; return c;
    });
  }
  function vignetteImg() {
    return K.cached('s4:vig', () => {
      const c = K.canvas(W, H), x = c.getContext('2d');
      x.translate(W / 2, H / 2); x.scale(1.25, 1);
      const g = x.createRadialGradient(0, 0, H * 0.28, 0, 0, H * 0.82);
      g.addColorStop(0, 'rgba(10,14,20,0)'); g.addColorStop(0.6, 'rgba(10,14,20,0.18)'); g.addColorStop(1, 'rgba(6,8,12,0.62)');
      x.fillStyle = g; x.fillRect(-W, -H, 2 * W, 2 * H); return c;
    });
  }
  function finish(x, t, o = {}) {
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    // the paper: a soft mottle and the tooth of the sheet over everything
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = o.mottle != null ? o.mottle : 0.35; x.drawImage(paperMottle(), 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    K.paperTooth(x, o.tooth != null ? o.tooth : 0.16);
    x.globalAlpha = o.vig != null ? o.vig : 1; x.drawImage(vignetteImg(), 0, 0);
    x.restore();
  }

  // ================================================================ the edit: shots keyed to the narration
  // each shot: { id, a, b, draw(x, t, shot), tin: {kind:'cut'|'dissolve'|'ink', d} }; a shot is drawn from a (minus its own
  // incoming transition) until the next shot's transition has finished, so every draw is clamped to its own needs.
  let EDL = null;
  function edl() {
    if (EDL) return EDL;
    const S = K.scene(4), c = id => K.cue(id), at = (id, f) => lerp(c(id).start, c(id).end, f);
    const L19 = c('L19'), L24 = c('L24');
    const shots = [
      { id: 'page', a: S.start, draw: shotPage },
      { id: 'convoy', a: at('L18', 0.12), draw: shotConvoy, tin: { kind: 'dissolve', d: 0.7 } },
      { id: 'lookup', a: at('L18', 0.86), draw: shotLookUp, tin: { kind: 'cut' } },
      { id: 'dive', a: L19.start - 0.05, draw: shotDive, tin: { kind: 'cut' } },
      { id: 'strike', a: at('L19', 0.24), draw: shotStrike, tin: { kind: 'cut' } },
      { id: 'burn', a: at('L19', 0.44), draw: shotBurn, tin: { kind: 'dissolve', d: 0.35 } },
      { id: 'proclaim', a: at('L20', -0.03), draw: shotProclaim, tin: { kind: 'ink', d: 1.0 } },
      { id: 'rejoice', a: at('L21', -0.12), draw: shotRejoice, tin: { kind: 'cut' } },
      { id: 'procession', a: at('L22', -0.02), draw: shotProcession, tin: { kind: 'dissolve', d: 0.6 } },
      { id: 'obey', a: at('L23', -0.04), draw: shotObey, tin: { kind: 'dissolve', d: 0.6 } },
      { id: 'tithe', a: at('L24', -0.06), draw: shotTithe, tin: { kind: 'dissolve', d: 0.6 } },
      { id: 'turn', a: L24.end + 0.15, draw: shotTurn, tin: { kind: 'dissolve', d: 0.5 } },
      { id: 'eye', a: L24.end + 1.85, draw: shotEye, tin: { kind: 'cut' } },
    ];
    for (let i = 0; i < shots.length; i++) { shots[i].b = i + 1 < shots.length ? shots[i + 1].a : S.end + 1.6; shots[i].tin = shots[i].tin || { kind: 'cut' }; shots[i].i = i; }
    EDL = shots; return EDL;
  }
  function placeholderShot(name) {
    return (x, t, sh) => { x.fillStyle = tone(0.1); x.fillRect(0, 0, W, H); K.text(x, name.toUpperCase(), W / 2, H / 2, '500 40px Cinzel', css(INK), 10, 'center', 0.7); K.text(x, (t - sh.a).toFixed(2), W / 2, H / 2 + 60, '400 28px "EB Garamond"', css(INK), 2, 'center', 0.6); };
  }
  function shotConvoy(x, t, sh) { placeholderShot('convoy')(x, t, sh); }
  function shotLookUp(x, t, sh) { placeholderShot('lookup')(x, t, sh); }
  function shotDive(x, t, sh) { placeholderShot('dive')(x, t, sh); }
  function shotStrike(x, t, sh) { placeholderShot('strike')(x, t, sh); }
  function shotBurn(x, t, sh) { placeholderShot('burn')(x, t, sh); }
  function shotProclaim(x, t, sh) { placeholderShot('proclaim')(x, t, sh); }
  function shotRejoice(x, t, sh) { placeholderShot('rejoice')(x, t, sh); }
  function shotProcession(x, t, sh) { placeholderShot('procession')(x, t, sh); }
  function shotObey(x, t, sh) { placeholderShot('obey')(x, t, sh); }
  function shotTithe(x, t, sh) { placeholderShot('tithe')(x, t, sh); }
  function shotTurn(x, t, sh) { placeholderShot('turn')(x, t, sh); }
  function shotEye(x, t, sh) { placeholderShot('eye')(x, t, sh); }

  // an ink-bleed reveal between shots: the new picture soaks through the paper behind a dark wet front
  function inkField() { return K.cached('s4:inkfield', () => K.field(320, 180, [{ x: 0.55, y: 0.45 }, { x: 0.2, y: 0.7, d: 0.12 }, { x: 0.85, y: 0.25, d: 0.18 }, { x: 0.4, y: 0.1, d: 0.22 }], 4411, { warp: 0.32, scale: 3.2, grain: 0.06 })); }
  function drawShot(x, sh, t) { x.save(); try { sh.draw(x, t, sh); } finally { x.restore(); } x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  function render(ctx, t) {
    const shots = edl();
    let i = shots.findIndex(s => t >= s.a && t < s.b); if (i < 0) i = t < shots[0].a ? 0 : shots.length - 1;
    const sh = shots[i], tin = sh.tin, prev = shots[i - 1];
    if (prev && tin.kind !== 'cut' && t < sh.a + tin.d) {
      const u = (t - sh.a) / tin.d;
      if (tin.kind === 'dissolve') {
        drawShot(ctx, prev, t);
        const B = K.layer('s4:shotB'), bx = B.getContext('2d'); drawShot(bx, sh, t);
        ctx.globalAlpha = smooth(u); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1;
      } else {
        // ink: the old shot darkens toward the front, the new one is revealed behind it
        drawShot(ctx, prev, t);
        const F = inkField(), p = ease(u) * 1.15, B = K.layer('s4:shotB'), bx = B.getContext('2d');
        drawShot(bx, sh, t);
        const m = K.mask(F, p, 0.05); K.cutBy(B, m);
        const rimC = K.rim(F, p, 0.07, 0.03);
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.85 * (1 - smooth(span(u, 0.75, 1)));
        ctx.imageSmoothingEnabled = true; ctx.filter = 'none';
        const R = K.layer('s4:rim', 320, 180), rx = R.getContext('2d'); rx.drawImage(rimC, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = css(INK); rx.fillRect(0, 0, 320, 180);
        ctx.drawImage(R, 0, 0, W, H); ctx.restore();
        ctx.drawImage(B, 0, 0);
      }
      return;
    }
    drawShot(ctx, sh, t);
  }

  // ================================================================ debug hook (used only by working scripts)
  const DBG = {
    build, camera, drawBeast, paintRange: o => paintRange(o), peakProfile: (a, b, c, d) => peakProfile(a, b, c, d), man: (...a) => man(...a), steed: (...a) => steed(...a),
    beast(x, name, o = {}) {
      x.fillStyle = css(PAPER); x.fillRect(0, 0, W, H);
      const poses = {
        side: {}, spread: { wingL: { w: { spread: 1 } }, wingR: { w: { spread: 1 } } },
        mantle: { wingL: { w: { mantle: 1 } }, wingR: { w: { mantle: 1 } }, jaw: 0.6 },
        tuck: { wingL: { w: { tuck: 1 } }, wingR: { w: { tuck: 1 } } },
      };
      const pose = Object.assign({}, poses[name] || {}, o.pose || {});
      const B = build(pose);
      const cam = camera(Object.assign({ pos: [3, 3, 60], f: 1500 }, o.cam || {}));
      drawBeast(x, cam, B, o.style || {});
      if (o.man) { const m = cam.p([o.man[0], 0, o.man[1] || 0]); const top = cam.p([o.man[0], 1.8, o.man[1] || 0]); x.fillStyle = css(INK); x.fillRect(m[0] - 3, top[1], 6, m[1] - top[1]); }
    },
  };

  SCENES[4] = {
    join: 'dissolve', joinDur: 1.4,
    _dbg: DBG,
    draw(ctx, t, sc) {
      t = clamp(t, sc.start, sc.end + 1.6);
      render(ctx, t);
      finish(ctx, t);
    },
  };
})();
