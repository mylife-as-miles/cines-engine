/* AUTOPILOT · SETS.car — Daniel's car (Look C, "Through Glass").
   A small, ordinary five-door family hatchback: muted dark teal-grey paint, privacy-tinted rear glass, a dark interior.
   England: right-hand drive (the driver sits on the right; Emily's child seat is behind him, on the right rear), traffic on
   the left, UK plates (white front, yellow rear).
   - SETS.car.exterior(g, opts): the car from outside, a small 3D model drawn in true perspective through LC.camera, from any
     side, at any position and scale, in a host set's own camera or on its own. Doors open or shut, indicators, the light (tod)
     and its rim, and glass that only ever reflects what it is given. Documented in film/api/car.md.
   - views: the interior and close views (film/api/car.md).
   Restraint: after the mirror moment nothing of this set shows the back seat. From outside the rear glass only reflects;
   an open rear door shows a dark void.
   Deterministic: OTM.rng / vnoise / fbm only. Static layers are cached under 'car:' keys. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const TAU = Math.PI * 2;
  const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // =================================================================================================================
  // 1. LIGHT BY TIME OF DAY: paint values (three per surface, plus the sky laid along the top), glass, rim
  // =================================================================================================================
  // sun: the default world direction toward the sun (x right, y up, z away from the camera) when a host gives none
  const TOD = {
    dawn:      { sun: [-0.5, 0.12, 0.86], rim: '#C9D6D6', sky: ['#3A4A52', '#7E8C8E', '#A9B4AE'], hz: '#1C2628', gnd: '#141A1B',
                 paint: { deep: '#080D0E', dark: '#0F181A', mid: '#1C292C', light: '#33454A', top: '#4E5E62' }, refl: 'sky' },
    morning:   { sun: [-0.62, 0.42, 0.66], rim: '#FFE9C4', sky: ['#AEBFBD', '#DCDDD0', '#F2E8D2'], hz: '#55625D', gnd: '#3A3C36',
                 paint: { deep: '#0E1719', dark: '#172427', mid: '#2A3B3E', light: '#506A69', top: '#7D908D' }, refl: 'sky' },
    noon:      { sun: [0.18, 0.94, 0.28], rim: '#FFF6E6', sky: ['#E3E6DC', '#F3EEDF', '#FBF5E8'], hz: '#7A7F76', gnd: '#6E6A60',
                 paint: { deep: '#1A2322', dark: '#283433', mid: '#3B4C4C', light: '#6E827E', top: '#BFC9C2' }, refl: 'noon' },
    afternoon: { sun: [0.55, 0.62, -0.45], rim: '#F6E3BC', sky: ['#B9C6BF', '#E3DDC9', '#F1DFBC'], hz: '#5E625A', gnd: '#48443B',
                 paint: { deep: '#111A1C', dark: '#1B2628', mid: '#2C3D3F', light: '#556D6A', top: '#96A39B' }, refl: 'sky' },
    evening:   { sun: [0.78, 0.2, -0.58], rim: '#F2A65E', sky: ['#7A5A50', '#C27A4C', '#F0A462'], hz: '#3A2A28', gnd: '#2A2020',
                 paint: { deep: '#0C0F10', dark: '#15191B', mid: '#283032', light: '#544A3C', top: '#8C6048' }, refl: 'copper' },
    dusk:      { sun: [0.15, 0.06, 1], rim: '#F2A35E', sky: ['#232D38', '#6A5A5C', '#E39A5C'], hz: '#2C2428', gnd: '#1E1A1E',
                 paint: { deep: '#06090B', dark: '#0B1013', mid: '#172127', light: '#2C3540', top: '#4A4C5C' }, refl: 'dusk' },
    night:     { sun: [0.0, 0.5, -1], rim: '#8FA3B0', sky: ['#0D141A', '#18222A', '#232F36'], hz: '#0A0E10', gnd: '#08090A',
                 paint: { deep: '#040506', dark: '#07090A', mid: '#0E1416', light: '#1C2628', top: '#26323A' }, refl: 'sky' },
  };
  const todOf = s => TOD[(s && s.tod) || s] || TOD.morning;

  // =================================================================================================================
  // 2. THE MODEL, in car space (metres): x = the car's right (the driver's side), y = up, z = forward. Ground at y = 0,
  //    the origin under the middle of the car. 4.18 m long, 1.78 m wide, 1.47 m high, wheelbase 2.62 m (a Golf-sized hatch).
  // =================================================================================================================
  const D = { zF: 1.30, zR: -1.32, wr: 0.315, rimR: 0.21, wo: 0.85, wi: 0.65, archR: 0.378, archY: 0.33, archHalf: 0.355,
    hingeF: 0.93, shutF: -0.05, hingeR: -0.05, shutR: -1.0, sideX: 0.89, nose: 2.16, tail: -2.02 };
  // the beltline rises gently toward the C-pillar; forward of the windscreen it becomes the wing top, falling to the nose
  const yBelt = z => 0.99 + 0.045 * clamp((1.08 - z) / 2.82, 0, 1) + 0.025 * smooth01((-0.9 - z) / 0.8);
  const yTop = z => z <= 1.08 ? yBelt(z) : 0.99 - 0.19 * Math.pow(clamp((z - 1.08) / 0.87, 0, 1), 1.6);
  const swage = z => Math.min(0.80, yTop(z) - 0.09);
  // cross-section rows of the lower body [height, inset along the outward plan normal]: sill, rocker, door, swage, top
  const ROWS = {
    tail: [[0.26, 0.05], [0.42, 0.0], [0.52, 0.0], [0.66, 0.01], [0.86, 0.035], [1.04, 0.07]],
    side: [[0.20, 0.034], [0.34, 0.006], [0.50, 0.0], [null, 0.0], [null, 0.02], [null, 0.05]],
    nose: [[0.22, 0.06], [0.36, 0.0], [0.47, 0.0], [0.60, 0.02], [0.70, 0.05], [0.79, 0.10]],
  };
  const BANDS = ['sill', 'rocker', 'door', 'shoulder', 'shoulderHi'];
  const NR = 6;                    // rows per cross-section
  const archAt = z => { for (const za of [D.zF, D.zR]) { const d = z - za; if (Math.abs(d) <= D.archHalf) return D.archY + Math.sqrt(D.archR * D.archR - d * d); } return null; };
  // the plan outline of the right half, from the middle of the tail round the right side to the middle of the nose
  const PER = (() => {
    const pts = [[0, D.tail, -1], [0.36, D.tail + 0.004, -1], [0.62, D.tail + 0.022, -1], [0.79, D.tail + 0.075, -0.62], [0.868, D.tail + 0.165, -0.24]];
    // side samples [z, inArch, order]: each arch end is a zero-width step (an outside point and an inside point at the same z)
    const marks = [-1.79, -1.74, -1.62, D.shutR, D.shutF, -0.5, 0.4, D.hingeF, 1.08, 1.12, 1.80, 1.90], zs = [];
    marks.forEach(z => zs.push([z, archAt(z) != null, 0]));
    [D.zR, D.zF].forEach(za => { zs.push([za - D.archHalf, false, -1]); for (let i = 0; i <= 12; i++) zs.push([za - D.archHalf + 2 * D.archHalf * i / 12, true, 0]); zs.push([za + D.archHalf, false, 1]); });
    zs.sort((a, b) => a[0] - b[0] || a[2] - b[2]).filter((q, i, a) => i === 0 || q[0] - a[i - 1][0] > 0.0015 || q[1] !== a[i - 1][1])
      .forEach(q => pts.push([D.sideX - 0.014 * smooth01((q[0] - 1.78) / 0.14) - 0.01 * smooth01((-1.70 - q[0]) / 0.1), q[0], 0, q[1]]));
    [[0.87, 1.97, 0.22], [0.83, 2.05, 0.55], [0.70, 2.115, 0.9], [0.40, 2.15, 1], [0, D.nose, 1]].forEach(a => pts.push(a));
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const k = p[2], z = p[1];
      const side = ROWS.side.map((r, j) => [j === 3 ? swage(z) : j === 4 ? lerp(swage(z), yTop(z), 0.5) : j === 5 ? yTop(z) : r[0], r[1]]);
      let rows = side; if (k) { const e = k < 0 ? ROWS.tail : ROWS.nose, u = Math.abs(k); rows = side.map((r, j) => [lerp(r[0], e[j][0], u), lerp(r[1], e[j][1], u)]); }
      if (!k && p[3]) { const ay = archAt(z); if (ay != null) { rows = rows.map(r => r.slice()); rows[0] = [ay, 0.012]; rows[1] = [Math.max(rows[1][0], ay + 0.035), 0.004]; rows[2] = [Math.max(rows[2][0], ay + 0.055), 0.0]; } }
      return p[0] === 0 ? { x: 0, z, k, nx: 0, nz: z > 0 ? 1 : -1, rows } : { x: p[0], z, k, nx: tz, nz: -tx, rows };
    });
  })();
  const perPt = (q, r) => [q.x - q.nx * q.rows[r][1], q.rows[r][0], q.z - q.nz * q.rows[r][1]];

  // ---- faces ----
  // outward normal from the winding (vertices counter-clockwise seen from outside); a hint fixes the winding if it is reversed
  function newell(pts) { let nx = 0, ny = 0, nz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); } const l = Math.hypot(nx, ny, nz) || 1; return [-nx / l, -ny / l, -nz / l]; }
  function face(pts, hint, props) { let n = newell(pts); if (hint && n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { pts = pts.slice().reverse(); n = n.map(v => -v); } return Object.assign({ pts, n }, props); }
  const mirP = p => [-p[0], p[1], p[2]];
  const mirDoor = d => d ? d.slice(0, 1) + 'L' : null;
  function mirFace(f) { return Object.assign({}, f, { pts: f.pts.map(mirP).reverse(), n: [-f.n[0], f.n[1], f.n[2]], side: 'L', door: mirDoor(f.door), name: f.name ? f.name + 'L' : f.name }); }

  // the greenhouse side surface (between the beltline and the roof rail): S(z, v), v = 0 at the belt, 1 at the rail
  const SIDE = PER.filter(q => !q.k);
  const SIDE_TOP = SIDE.map(q => perPt(q, NR - 1));
  const beltAt = z => {
    let best = null; SIDE_TOP.forEach(q => { if (Math.abs(q[2] - z) < 0.006 && (!best || Math.abs(q[2] - z) < Math.abs(best[2] - z))) best = q; }); if (best) return best;   // snap to the skirt's own vertex
    let i = 0; while (i < SIDE_TOP.length - 2 && SIDE_TOP[i + 1][2] < z) i++; const a = SIDE_TOP[i], c = SIDE_TOP[i + 1], u = clamp((z - a[2]) / ((c[2] - a[2]) || 1), 0, 1); return [lerp(a[0], c[0], u), lerp(a[1], c[1], u), z];
  };
  const railY = z => z >= 0.29 ? 1.425 : lerp(1.425, 1.385, (0.29 - z) / 1.63);
  const railX = z => z >= 0.29 ? 0.70 : lerp(0.70, 0.68, (0.29 - z) / 1.63);
  const rail = z => [railX(z), railY(z), z];
  const ghPt = (z, v) => { const b = beltAt(z), r = rail(z); return [lerp(b[0], r[0], v), lerp(b[1], r[1], v), z]; };
  // the belt between two z (exclusive), as the skirt's own top-row vertices (so the greenhouse meets the skirt edge to edge)
  const beltRun = (z0, z1) => { const lo = Math.min(z0, z1), hi = Math.max(z0, z1); const r = SIDE_TOP.filter(q => q[2] > lo + 0.006 && q[2] < hi - 0.006); return z0 < z1 ? r : r.reverse(); };
  const aLine = v => 1.08 - 0.79 * v;          // the A-pillar: its foot at z 1.08 on the belt, its head at z 0.29 on the rail
  const cLine = v => -1.74 + 0.40 * v;         // the C-pillar's rear edge, raked forward, meeting the tailgate
  const ghPoly = zv => zv.map(q => ghPt(q[0], q[1]));
  // the lower flank at (z, y) on the right side
  function sidePt(z, y) {
    let i = 5; while (i < PER.length - 7 && PER[i + 1].z < z) i++;
    const a = PER[i], b = PER[i + 1], u = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1);
    const ins = q => { const R = q.rows; let j = 0; while (j < NR - 2 && y > R[j + 1][0]) j++; return lerp(R[j][1], R[j + 1][1], clamp((y - R[j][0]) / ((R[j + 1][0] - R[j][0]) || 1), 0, 1)); };
    return [lerp(a.x - a.nx * ins(a), b.x - b.nx * ins(b), u), y, z];
  }
  // the nose and tail at (x, y); negative x mirrors onto the left half
  const NOSE = PER.slice(PER.length - 5).reverse(), TAIL = PER.slice(0, 5);
  function endPt(which, x, y) {
    const sx = x < 0 ? -1 : 1, ax = Math.abs(x), pts = which === 'nose' ? NOSE : TAIL;
    let i = 0; while (i < pts.length - 2 && pts[i + 1].x < ax) i++;
    const a = pts[i], b = pts[i + 1], u = clamp((ax - a.x) / ((b.x - a.x) || 1), 0, 1);
    const at = q => { const R = q.rows; let j = 0; while (j < NR - 2 && y > R[j + 1][0]) j++; const t = clamp((y - R[j][0]) / ((R[j + 1][0] - R[j][0]) || 1), 0, 1); const ins = lerp(R[j][1], R[j + 1][1], t); return [q.x - q.nx * ins, q.z - q.nz * ins]; };
    const pa = at(a), pb = at(b); return [sx * lerp(pa[0], pb[0], u), y, lerp(pa[1], pb[1], u)];
  }

  const MODEL = (() => {
    const F = [];                 // right-half faces (mirrored afterwards)
    const C = [];                 // faces across the middle
    // ---- lower body: four bands (sill, rocker, door, shoulder) round the perimeter ----
    const doorOf = (za, zb) => { const lo = Math.min(za, zb), hi = Math.max(za, zb); if (lo >= D.shutR - 1e-4 && hi <= D.hingeR + 1e-4) return 'RR'; if (lo >= D.shutF - 1e-4 && hi <= D.hingeF + 1e-4) return 'FR'; return null; };
    for (let i = 0; i < PER.length - 1; i++) {
      const a = PER[i], b = PER[i + 1]; const hint = [(a.nx + b.nx) / 2, 0, (a.nz + b.nz) / 2];
      const kk = (a.k + b.k) / 2, region = kk > 0.5 ? 'nose' : kk < -0.5 ? 'tail' : (a.k || b.k) ? 'corner' : 'side';
      for (let r = 0; r < NR - 1; r++) {
        const pts = [perPt(a, r), perPt(b, r), perPt(b, r + 1), perPt(a, r + 1)];
        const door = region === 'side' && r > 0 ? doorOf(a.z, b.z) : null;
        F.push(face(pts, hint, { kind: 'paint', band: BANDS[r], region, door, side: 'R', sliver: Math.abs(a.z - b.z) < 1e-6 && Math.abs(a.x - b.x) < 1e-6 }));
      }
    }
    // ---- bonnet: two facets a side, crowned along the middle ----
    const top = PER.map(q => perPt(q, NR - 1));
    const front = top.filter((q, i) => PER[i].z > 1.121 && PER[i].x >= 0.399);
    const inner = [0.40, 1.003, 1.125], noseIn = endPt('nose', 0.40, 0.79);
    F.push(face([inner, beltAt(1.12)].concat(front, [noseIn]), [0.1, 1, 0.25], { kind: 'paint', band: 'top', region: 'bonnet', side: 'R' }));
    C.push(face([[-0.40, 1.003, 1.125], inner, noseIn, endPt('nose', 0, 0.79), endPt('nose', -0.40, 0.79)], [0, 1, 0.25], { kind: 'paint', band: 'top', region: 'bonnet' }));
    // ---- windscreen, roof, tailgate glass ----
    C.push(face([[-0.80, 1.0, 1.12], [0.80, 1.0, 1.12], [0.66, 1.44, 0.30], [0.40, 1.44, 0.30], [-0.40, 1.44, 0.30], [-0.66, 1.44, 0.30]], [0, 0.6, 0.8], { kind: 'glass', glass: 'windscreen', name: 'windscreen' }));
    const rA = rail(-0.40), rC = rail(-1.34);
    C.push(face([[-0.40, 1.44, 0.30], [0.40, 1.44, 0.30], [0.40, 1.465, -0.40], [-0.40, 1.465, -0.40]], [0, 1, 0], { kind: 'paint', band: 'top', region: 'roof' }));
    C.push(face([[-0.40, 1.465, -0.40], [0.40, 1.465, -0.40], [0.40, 1.418, -1.56], [-0.40, 1.418, -1.56]], [0, 1, -0.05], { kind: 'paint', band: 'top', region: 'roof' }));
    F.push(face([[0.40, 1.44, 0.30], [0.66, 1.44, 0.30], rail(0.29), rail(D.shutF), rA, [0.40, 1.465, -0.40]], [0.25, 1, 0], { kind: 'paint', band: 'top', region: 'roof', side: 'R' }));
    F.push(face([[0.40, 1.465, -0.40], rA, rail(D.shutR + 0.02), rC, [0.60, 1.405, -1.56], [0.40, 1.418, -1.56]], [0.25, 1, -0.05], { kind: 'paint', band: 'top', region: 'roof', side: 'R' }));
    C.push(face([[-0.60, 1.405, -1.56], [-0.40, 1.418, -1.56], [0.40, 1.418, -1.56], [0.60, 1.405, -1.56], [0.72, 1.06, -1.86], [0, 1.06, -1.86], [-0.72, 1.06, -1.86]], [0, 0.7, -1], { kind: 'glass', glass: 'tailgate', name: 'tailgate' }));
    // ---- A- and C-pillar wraps ----
    F.push(face([[0.80, 1.0, 1.12], [0.66, 1.44, 0.30], rail(0.29), beltAt(aLine(0))], [1, 0.3, 0.6], { kind: 'paint', band: 'pillar', region: 'apillar', side: 'R' }));
    F.push(face([[0.60, 1.405, -1.56], [0.72, 1.06, -1.86], beltAt(cLine(0)), rC], [1, 0.25, -1], { kind: 'paint', band: 'pillar', region: 'cpillar', side: 'R' }));
    // ---- the tail's ledge under the tailgate glass ----
    const tailTop = top.filter((q, i) => PER[i].z <= -1.78 && PER[i].k <= 0);
    F.push(face([[0, 1.06, -1.86], [0.72, 1.06, -1.86], beltAt(cLine(0))].concat(tailTop.slice().reverse()), [0, 1, -0.6], { kind: 'paint', band: 'shoulder', region: 'tail', side: 'R' }));
    // ---- greenhouse: the front door's frame, the rear door's frame, the quarter (C-pillar); bottoms on the skirt, tops on the roof's vertices ----
    const GH = (pts, door, region) => F.push(face(pts, [1, 0.4, 0], { kind: 'paint', band: 'pillar', region, door, side: 'R' }));
    GH([beltAt(aLine(0))].concat(beltRun(aLine(0), D.shutF), [beltAt(D.shutF), rail(D.shutF), rail(0.29)]), 'FR', 'ghF');
    GH([beltAt(D.hingeR)].concat(beltRun(D.hingeR, D.shutR), [beltAt(D.shutR), rail(D.shutR + 0.02), rA, rail(D.hingeR)]), 'RR', 'ghR');
    GH([beltAt(D.shutR)].concat(beltRun(D.shutR, cLine(0)), [beltAt(cLine(0)), rC, rail(D.shutR + 0.02)]), null, 'ghQ');
    const faces = F.concat(F.map(mirFace), C.map(f => Object.assign({ side: 'C' }, f)));
    return { faces };
  })();

  // ---- decals: on the skin, drawn in this order after the body, each when its own winding faces the camera ----
  const DEC = (() => {
    const R = [], Cn = [];
    const gh = (zv, props) => R.push(face(ghPoly(zv), [1, 0.4, 0], props));
    const ep = (w, pts) => pts.map(q => endPt(w, q[0], q[1]));
    // window frames (satin black, the B-pillar between them), then the glass
    gh([[aLine(0) - 0.012, 0.0], [D.shutF, 0.0], [D.shutF, 0.965], [aLine(0.965) - 0.03, 0.965]], { kind: 'trim', door: 'FR', name: 'frameF' });
    gh([[D.hingeR, 0.0], [D.shutR + 0.004, 0.0], [D.shutR + 0.024, 0.965], [D.hingeR, 0.965]], { kind: 'trim', door: 'RR', name: 'frameR' });
    gh([[D.shutR - 0.02, 0.02], [cLine(0.02) + 0.12, 0.02], [cLine(0.95) + 0.11, 0.95], [D.shutR - 0.02, 0.95]], { kind: 'trim', name: 'frameQ' });
    gh([[0.86, 0.04], [-0.025, 0.04], [-0.025, 0.925], [aLine(0.925) - 0.075, 0.925], [aLine(0.30) - 0.075, 0.30], [0.86, 0.30]], { kind: 'glass', glass: 'front', door: 'FR', name: 'winF' });
    gh([[-0.125, 0.04], [-0.97, 0.04], [-0.95, 0.925], [-0.125, 0.925]], { kind: 'glass', glass: 'rear', door: 'RR', name: 'winR' });
    gh([[-1.045, 0.045], [cLine(0.045) + 0.145, 0.045], [cLine(0.91) + 0.135, 0.91], [-1.045, 0.91]], { kind: 'glass', glass: 'rear', name: 'winQ' });
    // headlights: the lens on the nose and its wrap round the corner; the amber indicator in the wrap
    R.push(face(ep('nose', [[0.40, 0.615], [0.72, 0.628], [0.745, 0.738], [0.43, 0.752]]), [0, 0.5, 1], { kind: 'lamp', lamp: 'head', name: 'headF' }));
    R.push(face(ep('nose', [[0.72, 0.628], [0.868, 0.645], [0.868, 0.722], [0.745, 0.738]]), [0.6, 0.2, 0.8], { kind: 'lamp', lamp: 'head', name: 'headW' }));
    R.push(face(ep('nose', [[0.785, 0.648], [0.862, 0.655], [0.862, 0.684], [0.79, 0.68]]), [0.6, 0.2, 0.8], { kind: 'lamp', lamp: 'indF', name: 'indF' }));
    R.push(face(ep('nose', [[0.60, 0.285], [0.74, 0.285], [0.745, 0.335], [0.61, 0.335]]), [0, 0, 1], { kind: 'lamp', lamp: 'fogF', name: 'fogF' }));
    // tail lights on the tailgate panel and round the corner; the amber indicator inside; the bumper reflectors
    R.push(face(ep('tail', [[0.47, 0.845], [0.80, 0.825], [0.81, 1.005], [0.54, 1.015]]), [0, 0, -1], { kind: 'lamp', lamp: 'tail', name: 'tailB' }));
    R.push(face(ep('tail', [[0.80, 0.825], [0.868, 0.825], [0.868, 1.015], [0.81, 1.005]]), [0.6, 0, -0.8], { kind: 'lamp', lamp: 'tail', name: 'tailW' }));
    R.push(face(ep('tail', [[0.60, 0.86], [0.785, 0.85], [0.79, 0.895], [0.61, 0.902]]), [0, 0, -1], { kind: 'lamp', lamp: 'indR', name: 'indR' }));
    R.push(face(ep('tail', [[0.64, 0.445], [0.78, 0.445], [0.78, 0.475], [0.64, 0.475]]), [0, 0, -1], { kind: 'lamp', lamp: 'refl', name: 'reflR' }));
    // across the middle: grilles, plates, badges, the cowl, the high brake light, the lower bumpers
    const C = (w, pts, hint, props) => Cn.push(face(ep(w, pts), hint, props));
    C('nose', [[-0.38, 0.632], [0.38, 0.632], [0.40, 0.728], [-0.40, 0.728]], [0, 0.4, 1], { kind: 'trim', name: 'grilleU' });
    C('nose', [[-0.55, 0.25], [0.55, 0.25], [0.60, 0.43], [-0.60, 0.43]], [0, 0, 1], { kind: 'trim', name: 'grilleL' });
    C('nose', [[-0.26, 0.44], [0.26, 0.44], [0.26, 0.551], [-0.26, 0.551]], [0, 0, 1], { kind: 'plate', plate: 'front', name: 'plateF' });
    C('nose', [[-0.05, 0.66], [0.05, 0.66], [0.05, 0.70], [-0.05, 0.70]], [0, 0.4, 1], { kind: 'badge', name: 'badgeF' });
    C('tail', [[-0.275, 0.68], [0.275, 0.68], [0.275, 0.806], [-0.275, 0.806]], [0, 0, -1], { kind: 'trim', name: 'recess' });
    C('tail', [[-0.26, 0.687], [0.26, 0.687], [0.26, 0.798], [-0.26, 0.798]], [0, 0, -1], { kind: 'plate', plate: 'rear', name: 'plateR' });
    C('tail', [[-0.05, 0.86], [0.05, 0.86], [0.05, 0.9], [-0.05, 0.9]], [0, 0, -1], { kind: 'badge', name: 'badgeR' });
    C('tail', [[-0.92, 0.262], [0.92, 0.262], [0.92, 0.335], [-0.92, 0.335]], [0, 0, -1], { kind: 'trim', name: 'diffuser' });
    C('tail', [[0.30, 0.445], [0.44, 0.445], [0.44, 0.475], [0.30, 0.475]], [0, 0, -1], { kind: 'lamp', lamp: 'fogR', name: 'fogR' });
    Cn.push(face([[-0.80, 1.005, 1.128], [0.80, 1.005, 1.128], [0.79, 1.04, 1.07], [-0.79, 1.04, 1.07]], [0, 0.6, 0.8], { kind: 'trim', name: 'cowl' }));
    Cn.push(face([[-0.15, 1.402, -1.565], [0.15, 1.402, -1.565], [0.15, 1.384, -1.58], [-0.15, 1.384, -1.58]], [0, 0.5, -1], { kind: 'lamp', lamp: 'brake', name: 'chmsl' }));
    R.forEach(f => { f.side = 'R'; });
    return R.concat(R.map(mirFace)).concat(Cn.map(f => Object.assign({ side: 'C' }, f)));
  })();

  // ---- features: lines on the skin (shut lines), the door handles ----
  const FEAT = {
    shut: [
      { door: 'FR', pts: [[D.hingeF, 0.34], [D.hingeF, swage(D.hingeF) + 0.02], [aLine(0) - 0.015, yTop(aLine(0) - 0.015) - 0.004]] },
      { door: 'FR', pts: [[D.shutF, 0.34], [D.shutF, yTop(D.shutF) - 0.004]] },
      { door: 'RR', pts: [[D.shutR, (archAt(D.shutR) || 0.5) + 0.01], [D.shutR, yTop(D.shutR) - 0.004]] },
      { door: 'FR', pts: [[D.hingeF, 0.342], [D.shutF, 0.342]] },
      { door: 'RR', pts: [[D.hingeR, 0.342], [D.zR + D.archHalf + 0.01, 0.342]] },
    ],
    handles: [{ door: 'FR', z0: 0.06, z1: 0.28, y: 0.885, name: 'handleF' }, { door: 'RR', z0: -0.86, z1: -0.65, y: 0.905, name: 'handleR' }],
  };
  // a door's hinge and its rotation (1 = fully open, about 68 degrees)
  const DOOR = { FR: { z: D.hingeF, x: D.sideX - 0.01, s: 1 }, RR: { z: D.hingeR, x: D.sideX - 0.01, s: 1 }, FL: { z: D.hingeF, x: -(D.sideX - 0.01), s: -1 }, RL: { z: D.hingeR, x: -(D.sideX - 0.01), s: -1 } };
  const DOOR_MAX = 1.19;
  function doorXf(name, open) {
    const d = DOOR[name], th = open * DOOR_MAX, c = Math.cos(th), s = Math.sin(th);
    return p => { const dx = p[0] - d.x, dz = p[2] - d.z; return d.s > 0 ? [d.x + dx * c - dz * s, p[1], d.z + dx * s + dz * c] : [d.x + dx * c + dz * s, p[1], d.z - dx * s + dz * c]; };
  }
  const rotN = (name, open, n) => { const d = DOOR[name], th = open * DOOR_MAX, c = Math.cos(th), s = Math.sin(th); return d.s > 0 ? [n[0] * c - n[2] * s, n[1], n[0] * s + n[2] * c] : [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c]; };

  // =================================================================================================================
  // 3. REFLECTIONS: what the glass gives back. Each is fn(g, win), drawn inside the window's clip in screen space.
  //    win = { name, glass ('windscreen'|'front'|'rear'|'tailgate'), privacy, path, box {x,y,w,h}, quad,
  //            yaw (the glass's facing in radians, 0 = square to the camera; slide your picture by it so a swinging door
  //            sweeps its reflection), hz (where the horizon sits, 0..1 down the box), ppm, T (the tod palette), t, L, door }
  // =================================================================================================================
  function skyBand(g, b, cols, hzFrac) {
    const y0 = b.y, yh = y0 + b.h * hzFrac;
    g.fillStyle = LC.lin(g, 0, y0, 0, yh, [[0, cols[0]], [0.7, cols[1]], [1, cols[2]]]); g.fillRect(b.x - 4, y0 - 4, b.w + 8, yh - y0 + 5);
    return yh;
  }
  function skyline(g, b, yh, col, seed, shift, rough) {
    g.fillStyle = col; g.beginPath(); g.moveTo(b.x - 10, b.y + b.h + 10); g.lineTo(b.x - 10, yh);
    const step = Math.max(6, b.w / 18), off = (((shift % 1) + 1) % 1) * step * 7, sd = seed.length * 3.7;
    for (let x = b.x - 10 - off; x < b.x + b.w + step * 8; x += step) { const hh = b.h * (0.04 + (rough || 0.1) * OTM.vnoise(x / step * 0.61 + sd, 1.3, 5)); g.lineTo(x, yh - hh); g.lineTo(x + step * 0.9, yh - hh); }
    g.lineTo(b.x + b.w + 10, b.y + b.h + 10); g.closePath(); g.fill();
  }
  const REFLECT = {
    sky(g, w) { const T = w.T, b = w.box; const yh = skyBand(g, b, T.sky, w.hz); skyline(g, b, yh + 1, T.hz, 'skyline', w.yaw * 0.6, 0.12); g.fillStyle = T.gnd; g.fillRect(b.x - 4, yh + b.h * 0.08, b.w + 8, b.h); },
    noon(g, w) { const b = w.box, yh = skyBand(g, b, ['#E8E8DE', '#F6F1E4', '#FFF8EA'], w.hz); skyline(g, b, yh + 1, '#8A8C82', 'noonline', w.yaw * 0.6, 0.08); g.fillStyle = '#77736A'; g.fillRect(b.x - 4, yh + b.h * 0.06, b.w + 8, b.h); },
    copper(g, w) { const b = w.box, yh = skyBand(g, b, ['#8A5E4C', '#D98A50', '#F6B070'], w.hz);
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, b.x + b.w * (0.5 - w.yaw * 0.5), yh, 0, Math.max(b.w, b.h) * 0.7, [[0, '#FFD39A', 0.75], [0.4, '#F2A65E', 0.3], [1, '#F2A65E', 0]]); g.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); g.restore();
      skyline(g, b, yh + 1, '#3E2A26', 'copline', w.yaw * 0.6, 0.1); g.fillStyle = '#2A1E1E'; g.fillRect(b.x - 4, yh + b.h * 0.07, b.w + 8, b.h); },
    dusk(g, w) { const b = w.box, yh = skyBand(g, b, ['#2A3340', '#6A5A5C', '#D9925A'], w.hz); skyline(g, b, yh + 1, '#2C2428', 'duskline', w.yaw * 0.6, 0.1); g.fillStyle = '#1C1719'; g.fillRect(b.x - 4, yh + b.h * 0.06, b.w + 8, b.h); },
    building(g, w) { const T = w.T, b = w.box; skyBand(g, b, T.sky, 0.3);
      const top = b.y + b.h * 0.16, bot = b.y + b.h * 0.8, face = mix(T.hz, '#3E4C50', 0.5);
      g.fillStyle = face; g.fillRect(b.x - 4, top, b.w + 8, bot - top);
      const cw = Math.max(7, b.h / 3.2), rh = Math.max(5, b.h / 7.5), off = ((w.yaw * b.w * 0.8) % cw + cw) % cw; g.fillStyle = mix(face, T.sky[0], 0.32);
      for (let y = top + rh * 0.35; y < bot - rh * 0.5; y += rh) for (let x = b.x - cw + off; x < b.x + b.w + cw; x += cw) g.fillRect(x, y, cw * 0.84, rh * 0.66);
      g.fillStyle = mix(face, T.sky[1], 0.5); g.fillRect(b.x - 4, top, b.w + 8, Math.max(1, b.h * 0.012));
      g.fillStyle = T.gnd; g.fillRect(b.x - 4, bot, b.w + 8, b.h); },
    house(g, w) { const T = w.T, b = w.box; skyBand(g, b, T.sky, 0.32);
      const hx = b.x - b.w * 0.1 - w.yaw * b.w * 0.9, hw = b.w * 1.3, top = b.y + b.h * 0.16, eave = b.y + b.h * 0.33, bot = b.y + b.h * 0.8;
      g.fillStyle = '#4A4F50'; g.beginPath(); g.moveTo(hx, eave); g.lineTo(hx + hw * 0.2, top); g.lineTo(hx + hw * 0.8, top); g.lineTo(hx + hw, eave); g.closePath(); g.fill();
      g.fillStyle = '#B98660'; g.fillRect(hx, eave, hw, bot - eave);
      [[0.12, 0.42], [0.62, 0.42]].forEach(([u, v]) => { g.fillStyle = '#E8E2D2'; g.fillRect(hx + hw * u, b.y + b.h * v, hw * 0.22, b.h * 0.17); g.fillStyle = '#5A6E70'; g.fillRect(hx + hw * u + 2, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); g.fillRect(hx + hw * (u + 0.11) + 1, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); });
      g.fillStyle = '#1F3A3B'; g.fillRect(hx + hw * 0.42, b.y + b.h * 0.48, hw * 0.12, bot - b.y - b.h * 0.48);
      g.fillStyle = '#34463A'; g.fillRect(b.x - 4, bot - b.h * 0.06, b.w + 8, b.h * 0.1); g.fillStyle = T.gnd; g.fillRect(b.x - 4, bot + b.h * 0.04, b.w + 8, b.h); },
    trees(g, w) { const T = w.T, b = w.box, yh = skyBand(g, b, T.sky, w.hz + 0.05); skyline(g, b, yh, mix(T.hz, '#3E5048', 0.5), 'treeline', w.yaw * 0.6, 0.35); g.fillStyle = T.gnd; g.fillRect(b.x - 4, yh + b.h * 0.1, b.w + 8, b.h); },
    black() { },
  };
  // a canvas or image as a reflection: mirrored left-right, slid by the glass's facing
  function reflectCanvas(img) { return (g, w) => { const b = w.box, s = Math.max(b.w / img.width, b.h / img.height) * 1.25; const dw = img.width * s, dh = img.height * s; g.save(); g.translate(b.x + b.w / 2 - w.yaw * b.w * 0.6, b.y + b.h / 2); g.scale(-1, 1); g.drawImage(img, -dw / 2, -dh / 2, dw, dh); g.restore(); }; }

  // =================================================================================================================
  // 4. EXTERIOR
  // =================================================================================================================
  const VIEWS = { side: Math.PI / 2, front3q: Math.PI / 2 + 0.72, rear3q: Math.PI / 2 - 0.72, rear: 0, front: Math.PI, front3qWide: Math.PI / 2 + 1.0, rear3qWide: Math.PI / 2 - 1.0 };
  function headingOf(o) {
    if (o.heading != null) return o.heading;
    const v = VIEWS[o.view] == null ? 'side' : o.view, base = VIEWS[v];
    return (v === 'rear' || v === 'front') ? base : ((o.side || 'right') === 'left' ? -base : base);
  }
  function simpleCam(o) {
    const dist = o.dist || 9, eye = o.eye == null ? 1.3 : o.eye, s = o.scale || 170, look = o.look == null ? 0.7 : o.look;
    const pitch = Math.atan2(look - eye, dist);
    const c0 = LC.camera({ x: 0, y: eye, z: -dist, pitch, f: s * dist, cx: 0, cy: 0 }); const p0 = c0.p(0, 0, 0);
    return LC.camera({ x: 0, y: eye, z: -dist, pitch, f: s * dist, cx: (o.x == null ? W / 2 : o.x) - p0[0], cy: (o.y == null ? H * 0.78 : o.y) - p0[1] });
  }
  const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  const polyPath = (pts, p) => { p = p || new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const boxOf = sp => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; sp.forEach(q => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  // which parts to draw: opts.only / opts.skip, lists of 'shadow', 'wheels', 'body', 'glass', 'mirrors', 'rim', 'doorFR', 'doorRR', 'doorFL', 'doorRL'
  function want(o, part) { if (o.only) return o.only.indexOf(part) >= 0; if (o.skip) return o.skip.indexOf(part) < 0; return true; }

  function exterior(g, opts) {
    const o = Object.assign({}, opts || {});
    const T = todOf(o), pal = Object.assign({}, T.paint, o.paint || {}), rimCol = (o.light && o.light.color) || o.rimColor || T.rim;
    const cam = o.cam || simpleCam(o);
    const hd = headingOf(o), ch = Math.cos(hd), sh = Math.sin(hd), at = o.at || [0, 0, 0];
    const toW = p => [at[0] + p[0] * ch + p[2] * sh, at[1] + p[1], at[2] - p[0] * sh + p[2] * ch];
    const nW = n => [n[0] * ch + n[2] * sh, n[1], -n[0] * sh + n[2] * ch];
    const L = norm(o.sun || T.sun);
    const dd = o.doors || {};
    const doors = { FR: dd.driver || dd.FR || 0, RR: dd.rear || dd.RR || 0, FL: dd.passenger || dd.FL || 0, RL: dd.rearLeft || dd.RL || 0 };
    const xf = {}; Object.keys(doors).forEach(k => { if (doors[k] > 0.001) xf[k] = doorXf(k, clamp(doors[k], 0, 1)); });
    const isOpen = d => !!(d && xf[d]);
    const P3 = (p, door) => cam.p(toW(door && xf[door] ? xf[door](p) : p));
    const NW = (n, door) => nW(door && xf[door] ? rotN(door, clamp(doors[door], 0, 1), n) : n);
    const ppm = (() => { const a = cam.p(toW([0, 0.7, 0])), b = cam.p(toW([0, 1.7, 0])); return Math.abs(a[1] - b[1]); })();
    const lod = ppm < 60 ? 0 : ppm < 140 ? 1 : 2;
    const info = { ppm, cam, heading: hd, toWorld: toW, p: (pt, door) => P3(pt, door), points: {}, box: null, path: new Path2D(), windows: [] };
    const A0 = o.alpha == null ? 1 : o.alpha;
    g.save(); g.globalAlpha = A0;

    // ---- which flank faces the camera ----
    const sideVis = s => { const a = P3([s * 0.89, 0.3, -1.0]), b = P3([s * 0.89, 0.3, 1.0]), c = P3([s * 0.89, 0.9, 0]); return area([a, b, c]) * s < 0; };
    const nearSide = sideVis(1) ? 1 : sideVis(-1) ? -1 : 0;

    // ---- shadow on the ground: the footprint, and the cast shadow stretched away from the sun ----
    if (want(o, 'shadow') && o.shadow !== false) {
      const foot = [], R = PER; for (let i = 0; i < R.length; i += 2) foot.push([R[i].x + R[i].nx * 0.05, R[i].z + R[i].nz * 0.05]); for (let i = R.length - 1; i >= 0; i -= 2) foot.push([-(R[i].x + R[i].nx * 0.05), R[i].z + R[i].nz * 0.05]);
      const Lc = [L[0] * ch - L[2] * sh, L[1], L[0] * sh + L[2] * ch];       // the sun in car space
      const k = Math.min(3.0, 0.6 / Math.max(0.12, Lc[1])), ox = -Lc[0] * k, oz = -Lc[2] * k;
      const sc = o.shadowColor || '#081011', sa = o.shadowAlpha == null ? 0.62 : o.shadowAlpha;
      [[1.0, 0.42], [0.5, 0.5]].forEach(([f, a]) => { g.fillStyle = rgba(sc, a * sa); g.fill(polyPath(foot.map(q => P3([q[0] * (1 + 0.05 * f) + ox * f, 0, q[1] * (1 + 0.025 * f) + oz * f])))); });
      g.fillStyle = rgba(sc, Math.min(1, sa * 1.3)); g.fill(polyPath(foot.map(q => P3([q[0] * 0.95, 0, q[1] * 0.97]))));
    }

    // ---- wheels ----
    const wheels = [[1, D.zF], [1, D.zR], [-1, D.zF], [-1, D.zR]];
    const steer = o.steer || 0, spin = o.wheelRot || 0;
    function wheel(s, zc) {
      const st = zc > 0 ? steer : 0, cs = Math.cos(st), sn = Math.sin(st), xc = s * 0.75;
      const W3 = (x, y, z) => { const dx = x - xc, dz = z - zc; return P3([xc + dx * cs + dz * sn, y, zc - dx * sn + dz * cs]); };
      const circ = (x, r, n, a0) => { const out = []; for (let i = 0; i < n; i++) { const a = (a0 || 0) + i / n * TAU; out.push(W3(x, D.wr + Math.sin(a) * r, zc + Math.cos(a) * r)); } return out; };
      const N = lod ? 30 : 16, outer = circ(s * D.wo, D.wr, N), inner = circ(s * D.wi, D.wr, N);
      g.fillStyle = '#0D1112'; g.fill(polyPath(hull(outer.concat(inner))));
      const lit = clamp(dot(NW([s, 0, 0]), L), -1, 1);
      // the tread catches the light on its upper edge
      if (lod) { const tr = circ(s * (D.wo - 0.005), D.wr, N).filter((q, i) => i > N * 0.12 && i < N * 0.38); g.strokeStyle = rgba(rimCol, 0.12); g.lineWidth = Math.max(1, ppm * 0.008); g.beginPath(); tr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }
      if (!(area(outer) * s < 0)) { g.fillStyle = '#111516'; g.fill(polyPath(inner)); return; }
      g.fillStyle = '#191F21'; g.fill(polyPath(outer));
      const rimC = lit > 0.25 ? '#9AA4A1' : lit > -0.15 ? '#76807E' : '#586260', rimD = lit > 0.25 ? '#5E6866' : '#3E4746';
      const xr = s * (D.wo - 0.014);
      g.fillStyle = '#0A0D0E'; g.fill(polyPath(circ(xr, D.rimR + 0.006, N)));
      if (lod) {
        g.fillStyle = rimC; g.fill(polyPath(circ(xr, D.rimR, N))); g.fillStyle = '#121618'; g.fill(polyPath(circ(xr, D.rimR * 0.88, N)));
        g.fillStyle = rimC; for (let k = 0; k < 5; k++) { const a = spin + k / 5 * TAU; const pts = [[0.05, a - 0.42], [D.rimR * 0.9, a - 0.15], [D.rimR * 0.9, a + 0.15], [0.05, a + 0.42]].map(([r, aa]) => W3(xr, D.wr + Math.sin(aa) * r, zc + Math.cos(aa) * r)); g.fill(polyPath(pts)); }
        g.fillStyle = rimD; g.fill(polyPath(circ(xr, 0.055, 12)));
        g.strokeStyle = rgba(rimCol, 0.22); g.lineWidth = Math.max(0.8, ppm * 0.004); const up = circ(xr, D.rimR, N).filter((q, i) => i > N * 0.15 && i < N * 0.35); g.beginPath(); up.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
      } else { g.fillStyle = rimD; g.fill(polyPath(circ(xr, D.rimR * 0.85, N))); }
    }
    const archClip = (s, zc) => { const pts = [P3([s * 0.9, -0.6, zc - D.archHalf])]; for (let i = 0; i <= 16; i++) { const z = zc - D.archHalf + 2 * D.archHalf * i / 16; pts.push(P3([s * 0.9, archAt(z) - 0.01, z])); } pts.push(P3([s * 0.9, -0.6, zc + D.archHalf])); return polyPath(pts); };
    if (want(o, 'wheels')) wheels.forEach(([s, zc]) => { if (s !== nearSide) wheel(s, zc); });

    // ---- faces: projected, back faces culled ----
    const list = [], decList = [], proj = [];
    const prep = (f, out) => {
      const sp = f.pts.map(q => P3(q, f.door)); if (sp.some(q => q[2] < 0.05)) return;
      const a = area(sp); if (out === list) proj[f.i] = a;
      if (a >= -0.3) return;
      let d = 0; sp.forEach(q => { d += q[2]; }); out.push({ f, sp, d: d / sp.length });
    };
    MODEL.faces.forEach(f => { if (f.door ? want(o, 'door' + f.door) : want(o, f.kind === 'glass' ? 'glass' : 'body')) prep(f, list); });
    DEC.forEach(f => { if (f.door ? want(o, 'door' + f.door) : want(o, f.kind === 'glass' ? 'glass' : 'body')) prep(f, decList); });
    const shade = (f, door) => {
      const n = NW(f.n, door), up = n[1], lit = dot(n, L);
      if (f.kind === 'trim') return lit > 0.3 ? '#1C2224' : '#101416';
      if (f.band === 'top' || up > 0.66) { const tp = up > 0.86 ? pal.top : mix(pal.top, pal.light, 0.45); return lit > 0.55 ? mix(tp, rimCol, 0.1) : tp; }
      let v = lit > 0.38 ? 2 : lit > -0.05 ? 1 : 0;
      if (f.band === 'shoulder' && up > 0.03) v = Math.min(3, v + 1);
      if (f.band === 'shoulderHi') v = Math.min(3, v + (up > 0.08 ? 2 : 1));
      if (f.band === 'rocker') v -= 1;
      if (f.band === 'sill') v -= 2;
      if (f.band === 'pillar') v = Math.min(v, 1);
      return v < 0 ? pal.deep : [pal.dark, pal.mid, pal.light, pal.sheen || mix(pal.light, pal.top, 0.42)][v];
    };
    const reflectFn = gl => { const r = (o.glass && o.glass[gl]) || o.reflect || T.refl; return typeof r === 'function' ? r : (r && (r.getContext || r.naturalWidth)) ? reflectCanvas(r) : (REFLECT[r] || REFLECT.sky); };
    const drawFace = e => {
      const f = e.f; if (f.kind === 'glass') { drawGlass(e); return; }
      const p = polyPath(e.sp); g.fillStyle = shade(f, f.door); g.fill(p); if (lod) { g.strokeStyle = g.fillStyle; g.lineWidth = 0.7; g.stroke(p); }
    };
    function drawGlass(e) {
      const f = e.f, p = polyPath(e.sp), priv = f.glass === 'rear' || f.glass === 'tailgate', box = boxOf(e.sp);
      info.path.addPath(p);
      const n = NW(f.n, f.door), yaw = Math.atan2(n[0], -n[2]);
      g.save(); g.clip(p);
      g.fillStyle = priv ? '#060A0B' : '#0E1619'; g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
      // the front glass lets a little of the cabin through: the front headrests, the wheel's rim; never anything behind them
      if (!priv && o.interior !== false && T !== TOD.night && T !== TOD.dusk) {
        g.fillStyle = 'rgba(2,4,5,0.55)';
        [1, -1].forEach(s => { const hr = [[0.34, 1.13, -0.34], [0.33, 1.33, -0.38], [0.15, 1.33, -0.38], [0.14, 1.13, -0.34]].map(q => P3([s * (q[0] + 0.04), q[1], q[2]])); g.fill(polyPath(hull(hr))); });
        if (f.glass === 'windscreen') { const pts = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * i / 18; pts.push(P3([0.38 + Math.cos(a) * 0.19, 0.98 + Math.sin(a) * 0.15, 0.55 - Math.sin(a) * 0.05])); } g.strokeStyle = 'rgba(2,4,5,0.6)'; g.lineWidth = Math.max(1, ppm * 0.025); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }
      }
      const fk = f.glass === 'windscreen' || f.glass === 'tailgate' ? f.glass : f.side;
      const win = { name: f.name || f.glass, glass: f.glass, privacy: priv, path: p, box: (!isOpen(f.door) && frames[fk]) || box, pane: box, quad: e.sp.slice(0, 4), yaw, ppm, T, tod: o.tod || 'morning', t: o.t || 0, L, hz: f.glass === 'tailgate' || f.glass === 'windscreen' ? 0.74 : 0.56, side: f.side, door: f.door };
      g.globalCompositeOperation = 'screen'; g.globalAlpha = A0 * (priv ? (o.reflectStrength == null ? 0.82 : o.reflectStrength) : (o.reflectStrength == null ? 0.66 : o.reflectStrength * 0.85));
      reflectFn(f.glass)(g, win);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = A0;
      LC.glare(g, null, { x: box.x + box.w * 0.4, y: box.y + box.h * 0.5, angle: -1.0, color: rimCol, bands: [{ d: -box.h * 0.2 - box.w * 0.05, w: Math.max(8, box.w * 0.18), a: 0.05 }, { d: box.h * 0.1, w: Math.max(2, box.w * 0.025), a: 0.07 }] });
      g.restore();
      // the upper edge of the glass catches the sky
      const top2 = e.sp.slice().sort((a, b) => a[1] - b[1]).slice(0, 2);
      g.strokeStyle = rgba(rimCol, 0.2); g.lineWidth = Math.max(1, ppm * 0.005); g.beginPath(); g.moveTo(top2[0][0], top2[0][1]); g.lineTo(top2[1][0], top2[1][1]); g.stroke();
      info.points[win.name] = [box.x + box.w / 2, box.y + box.h / 2]; info.windows.push(win);
    }
    const drawDecal = e => {
      const f = e.f, p = polyPath(e.sp);
      if (f.kind === 'trim') { g.fillStyle = '#0E1213'; g.fill(p); g.strokeStyle = '#0E1213'; g.lineWidth = 0.7; g.stroke(p); return; }
      if (f.kind === 'plate') { drawPlate(g, e.sp, f.plate, lod); return; }
      if (f.kind === 'badge') { if (lod) { g.fillStyle = '#8E9897'; g.fill(p); } return; }
      if (f.kind === 'lamp') { drawLamp(g, e.sp, f.lamp, o, T, lod, rimCol); return; }
      if (f.kind === 'glass') drawGlass(e);
    };
    const doorFaces = k => list.filter(e => e.f.door === k).sort((a, b) => b.d - a.d);
    // one reflection frame per flank (and per screen) so a reflected world runs on across the panes
    const frames = {}; list.concat(decList).forEach(e => { if (e.f.kind !== 'glass' || isOpen(e.f.door)) return; const k = e.f.glass === 'windscreen' || e.f.glass === 'tailgate' ? e.f.glass : e.f.side; const b = boxOf(e.sp); const F0 = frames[k]; frames[k] = F0 ? { x: Math.min(F0.x, b.x), y: Math.min(F0.y, b.y), w: Math.max(F0.x + F0.w, b.x + b.w) - Math.min(F0.x, b.x), h: Math.max(F0.y + F0.h, b.y + b.h) - Math.min(F0.y, b.y) } : b; });
    // the body, far to near
    list.filter(e => !isOpen(e.f.door)).sort((a, b) => b.d - a.d).forEach(drawFace);
    // the near arches: the liners' darkness, then the near wheels inside them
    if (nearSide && want(o, 'body')) [D.zF, D.zR].forEach(zc => { const pts = []; for (let i = 0; i <= 16; i++) { const z = zc - D.archHalf + 2 * D.archHalf * i / 16; pts.push(P3([nearSide * 0.885, archAt(z) - 0.004, z])); } pts.push(P3([nearSide * 0.885, 0.2, zc + D.archHalf])); pts.push(P3([nearSide * 0.885, 0.2, zc - D.archHalf])); g.fillStyle = '#060909'; g.fill(polyPath(pts)); });
    if (want(o, 'wheels') && nearSide) wheels.forEach(([s, zc]) => { if (s === nearSide) { g.save(); g.clip(archClip(s, zc)); wheel(s, zc); g.restore(); } });
    // the apertures of open doors on the near side: a dark void (the cabin is never lit enough to show anything)
    Object.keys(xf).forEach(k => { if (DOOR[k].s === nearSide && want(o, 'body')) aperture(k); });
    // decals on the fixed body, in their authored order (frames under glass)
    decList.filter(e => !isOpen(e.f.door)).forEach(drawDecal);
    if (want(o, 'body')) drawFeatures(null);
    if (want(o, 'mirrors') && nearSide) drawMirror(nearSide);
    // open doors last, each with its inside, its skin, its decals and features
    Object.keys(xf).forEach(k => {
      if (!want(o, 'door' + k)) return;
      drawDoorInner(k); doorFaces(k).forEach(drawFace); decList.filter(e => e.f.door === k).forEach(drawDecal); drawFeatures(k);
    });

    function aperture(door) {
      const s = DOOR[door].s, isF = door[0] === 'F', S = q => [s * q[0], q[1], q[2]];
      const z0 = isF ? D.hingeF : D.hingeR, z1 = isF ? D.shutF : D.shutR;
      const pts = isF ? [[0.885, 0.34, z0], [0.885, 0.34, z1], ghPt(z1, 1), ghPt(aLine(1), 1), ghPt(aLine(0), 0), [0.885, swage(z0), z0]]
        : [[0.885, 0.34, z0], [0.885, 0.34, D.zR + D.archHalf], [0.885, (archAt(z1) || 0.54), z1], ghPt(z1 + 0.02, 1), ghPt(z0, 1)];
      g.fillStyle = '#050808'; g.fill(polyPath(pts.map(q => P3(S(q)))));
      // the sill catches a little light; inside, nothing
      g.strokeStyle = rgba(pal.light, 0.45); g.lineWidth = Math.max(1, ppm * 0.01); g.beginPath(); const a = P3(S([0.86, 0.36, z0])), b = P3(S([0.86, 0.36, isF ? z1 : D.zR + D.archHalf])); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      if (isF && o.interior !== false) { const seat = [[0.55, 0.52, -0.02], [0.55, 1.22, -0.18], [0.55, 1.26, -0.34], [0.55, 0.52, -0.34]].map(q => P3(S(q))); g.fillStyle = '#0C1112'; g.fill(polyPath(seat)); }
    }
    function drawFeatures(door) {
      const s = nearSide; if (!s) return;
      const dn = d => d ? (s > 0 ? d : mirDoor(d)) : null;
      const S = (z, y, d) => { const q = sidePt(z, y); return P3([s * q[0], q[1], q[2]], d); };
      const mine = d => door === null ? !isOpen(d) : d === door;
      if (lod) FEAT.shut.forEach(sl => { const d = dn(sl.door); if (!mine(d)) return; const pts = sl.pts.map(q => S(q[0], q[1], d)); g.strokeStyle = 'rgba(3,6,7,0.8)'; g.lineWidth = Math.max(1, ppm * 0.006); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); });
      FEAT.handles.forEach(h => {
        const d = dn(h.door); if (!mine(d)) return;
        const a = S(h.z0, h.y + 0.022, d), b = S(h.z1, h.y + 0.022, d), c = S(h.z1, h.y - 0.026, d), e = S(h.z0, h.y - 0.026, d);
        g.fillStyle = 'rgba(3,5,6,0.85)'; g.fill(polyPath([a, b, c, e]));
        const a2 = S(h.z0 + 0.012, h.y + 0.013, d), b2 = S(h.z1 - 0.012, h.y + 0.013, d), c2 = S(h.z1 - 0.012, h.y - 0.012, d), e2 = S(h.z0 + 0.012, h.y - 0.012, d);
        g.fillStyle = pal.mid; g.fill(polyPath([a2, b2, c2, e2])); g.strokeStyle = rgba(rimCol, 0.5); g.lineWidth = Math.max(0.8, ppm * 0.004); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke();
        info.points[h.name + (s > 0 ? 'R' : 'L')] = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      });
      // the swage: a fine line where the shoulder turns to the sky
      if (door === null && lod) {
        g.strokeStyle = rgba(rimCol, 0.14); g.lineWidth = Math.max(1, ppm * 0.004); g.beginPath(); let pen = false;
        for (let z = -1.72; z <= 1.86; z += 0.04) { const fd = s > 0 ? 'FR' : 'FL', rd = s > 0 ? 'RR' : 'RL'; if ((isOpen(fd) && z > D.shutF && z < D.hingeF) || (isOpen(rd) && z > D.shutR && z < D.hingeR)) { pen = false; continue; } const q = S(z, swage(z) + 0.004); if (!pen) { g.moveTo(q[0], q[1]); pen = true; } else g.lineTo(q[0], q[1]); }
        g.stroke();
      }
    }
    function drawMirror(s) {
      const d = s > 0 ? 'FR' : 'FL';
      const box3 = (x0, x1, y0, y1, z0, z1) => [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const B = box3(0.86, 1.06, 0.99, 1.12, 0.88, 0.985).map(q => [s * q[0], q[1], q[2]]);
      const Fq = [[0, 1, 2, 3, [0, 0, -1], 'glass'], [5, 4, 7, 6, [0, 0, 1], 'shell'], [4, 0, 3, 7, [-1, 0, 0], 'shell'], [1, 5, 6, 2, [1, 0, 0], 'end'], [3, 2, 6, 7, [0, 1, 0], 'top'], [4, 5, 1, 0, [0, -1, 0], 'under']];
      const fs = Fq.map(q => face([B[q[0]], B[q[1]], B[q[2]], B[q[3]]], [s * q[4][0], q[4][1], q[4][2]], { kind: q[5] }));
      const arm = face([[s * 0.835, 0.995, 0.96], [s * 0.88, 0.995, 0.96], [s * 0.88, 1.045, 0.94], [s * 0.835, 1.045, 0.94]], [s, 0, 0], { kind: 'arm' });
      [arm].concat(fs).map(f => ({ f, sp: f.pts.map(q => P3(q, d)) })).filter(e => area(e.sp) < 0).sort((a, b) => b.sp.reduce((t, q) => t + q[2], 0) - a.sp.reduce((t, q) => t + q[2], 0)).forEach(e => {
        const k = e.f.kind, p = polyPath(e.sp);
        g.fillStyle = k === 'glass' ? '#0B1113' : k === 'arm' || k === 'under' ? '#0E1213' : shade({ n: e.f.n, band: k === 'top' ? 'top' : 'door', kind: 'paint' }, d); g.fill(p);
        if (k === 'glass') { g.save(); g.clip(p); g.globalCompositeOperation = 'screen'; g.globalAlpha = A0 * 0.6; reflectFn('front')(g, { box: boxOf(e.sp), yaw: 0, T, hz: 0.5, ppm, glass: 'mirror' }); g.restore(); }
        if (k === 'end') { const q = e.sp; drawLamp(g, [q[0], q[1], [lerp(q[1][0], q[2][0], 0.28), lerp(q[1][1], q[2][1], 0.28)], [lerp(q[0][0], q[3][0], 0.28), lerp(q[0][1], q[3][1], 0.28)]], 'indM', o, T, lod, rimCol); }
        info.path.addPath(p);
      });
      const c = P3([s * 0.98, 1.05, 0.93], d); info.points['mirror' + (s > 0 ? 'R' : 'L')] = [c[0], c[1]];
    }
    function drawDoorInner(k) {
      const s = DOOR[k].s, isF = k[0] === 'F', S = q => [s * q[0], q[1], q[2]];
      const z0 = isF ? D.hingeF : D.hingeR, z1 = isF ? D.shutF : D.shutR, x = 0.77;
      const pts = [[x, 0.36, z0], [x, 0.36, isF ? z1 : D.zR + D.archHalf], [x, isF ? 0.36 : 0.56, z1], [x, yTop(z1) - 0.02, z1], [x, yTop(z0) - 0.02, z0]].map(S);
      const f = face(pts, [-s, 0, 0], {}), sp = f.pts.map(q => P3(q, k));
      if (area(sp) < 0) {
        g.fillStyle = '#111617'; g.fill(polyPath(sp));
        const arm = [[x - 0.01, 0.62, z0 - 0.15], [x - 0.01, 0.62, z1 + 0.12], [x - 0.01, 0.70, z1 + 0.12], [x - 0.01, 0.70, z0 - 0.15]].map(q => P3(S(q), k)); g.fillStyle = '#0A0D0E'; g.fill(polyPath(arm));
        const pull = [[x - 0.012, 0.74, z1 + 0.3], [x - 0.012, 0.74, z1 + 0.14], [x - 0.012, 0.77, z1 + 0.14], [x - 0.012, 0.77, z1 + 0.3]].map(q => P3(S(q), k)); g.fillStyle = '#1E2527'; g.fill(polyPath(pull));
      }
      // the door's free edge (its thickness), turned to the light
      const ed = [[0.89, 0.36, z1], [0.77, 0.36, z1], [0.77, yTop(z1) - 0.02, z1], [0.89, yTop(z1), z1]].map(S);
      const fe = face(ed, [0, 0, -1], {}), se = fe.pts.map(q => P3(q, k));
      if (area(se) < 0) { const lit = dot(NW(fe.n, k), L); g.fillStyle = lit > 0.2 ? mix(pal.light, rimCol, 0.5) : pal.dark; g.fill(polyPath(se)); }
    }

    // the screen box of all that was drawn
    { const xs = [], ys = []; list.concat(decList).forEach(e => e.sp.forEach(q => { xs.push(q[0]); ys.push(q[1]); })); if (xs.length) info.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
    // ---- rim: the shot's one light along the edges that face it (only when that light is ahead of the camera) ----
    if (want(o, 'rim') && o.rim !== 0 && info.box) {
      const sunP = cam.p([at[0] + L[0] * 400, at[1] + L[1] * 400, at[2] + L[2] * 400]);
      if (sunP[2] > 0.5 || o.light) {
        const lp = o.light || { x: sunP[0], y: sunP[1] };
        rimEdges(g, list, proj, lp, rimCol, Math.max(1.1, ppm * 0.009) * (o.rim == null ? 1 : o.rim), isOpen);
      }
    }
    if (o.em) emissiveLamps(o.em, o, decList);
    // ---- heat rising off the roof ----
    if (o.heat && o.t != null) {
      const r = [[0.6, 1.47, 0.3], [-0.6, 1.47, 0.3], [0.6, 1.47, -1.5], [-0.6, 1.47, -1.5]].map(q => P3(q)), bb = boxOf(r);
      shimmer(g, { x: bb.x - ppm * 0.3, y: bb.y - ppm * 0.9, w: bb.w + ppm * 0.6, h: ppm * 0.95 }, o.t, { amp: o.heat * Math.max(1.2, ppm * 0.012), rise: 1 });
    }
    g.restore();
    // ---- anchors for the choreography (screen points) ----
    const pt = (q, d) => { const s = P3(q, d); return [s[0], s[1]]; };
    Object.assign(info.points, {
      roof: pt([0, 1.47, -0.5]), centre: pt([0, 0.7, 0]), ground: pt([0, 0, 0]),
      doorFR: pt([0.95, 0.75, 0.45], 'FR'), doorRR: pt([0.95, 0.75, -0.5], 'RR'), doorFL: pt([-0.95, 0.75, 0.45], 'FL'), doorRL: pt([-0.95, 0.75, -0.5], 'RL'),
      seatDriver: pt([0.38, 0.95, -0.15]), tailgate: pt([0, 1.22, -1.72]), plateR: pt([0, 0.74, -2.0]), plateF: pt([0, 0.5, 2.14]),
      wheelFR: pt([0.86, D.wr, D.zF]), wheelRR: pt([0.86, D.wr, D.zR]), wheelFL: pt([-0.86, D.wr, D.zF]), wheelRL: pt([-0.86, D.wr, D.zR]),
      indFR: pt([0.84, 0.67, 2.06]), indRR: pt([0.82, 0.88, -1.98]), indFL: pt([-0.84, 0.67, 2.06]), indRL: pt([-0.82, 0.88, -1.98]),
    });
    if (!info.points.handleRR && !info.points.handleRL) { info.points.handleRR = pt([0.9, 0.905, -0.75], 'RR'); info.points.handleRL = pt([-0.9, 0.905, -0.75], 'RL'); }
    info.near = nearSide > 0 ? 'right' : nearSide < 0 ? 'left' : 'none';
    return info;
  }

  // ---- rim: the silhouette edges of the visible faces whose outward side faces the light's screen point ----
  // edges are matched once in car space; an edge is on the outline when only one of its two faces is visible
  // (or when the faces either side belong to an open door and the body)
  const EDGES = (() => {
    const key = p => p.map(v => Math.round(v * 500)).join(','), m = new Map();
    MODEL.faces.forEach((f, i) => { f.i = i; if (f.sliver) return; f.pts.forEach((a, k) => { const b = f.pts[(k + 1) % f.pts.length]; const ka = key(a), kb = key(b); if (ka === kb) return; const kk = ka < kb ? ka + '|' + kb : kb + '|' + ka; if (!m.has(kk)) m.set(kk, []); m.get(kk).push([i, k]); }); });
    return [...m.values()];
  })();
  function rimEdges(g, list, proj, lp, col, w, isOpen) {
    const vis = new Map(); list.forEach(e => { if (e.f.i != null) vis.set(e.f.i, e); });
    const buckets = [new Path2D(), new Path2D(), new Path2D()], soft = new Path2D();
    const add = (e, k) => {
      const A = e.sp[k], B = e.sp[(k + 1) % e.sp.length]; const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy); if (l < 1.5) return;
      const nx = -dy / l, ny = dx / l, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; let lx = lp.x - mx, ly = lp.y - my; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
      const s = nx * lx + ny * ly; if (s < 0.12) return;
      const b = s > 0.7 ? 2 : s > 0.4 ? 1 : 0, o = w * 0.5;
      buckets[b].moveTo(A[0] - nx * o, A[1] - ny * o); buckets[b].lineTo(B[0] - nx * o, B[1] - ny * o);
      if (b > 0) { soft.moveTo(A[0] - nx * o, A[1] - ny * o); soft.lineTo(B[0] - nx * o, B[1] - ny * o); }
    };
    EDGES.forEach(es => {
      if (es.length !== 2) return;                                     // open edges (the underside, the scuttle) never rim
      const [i, ki] = es[0], [j, kj] = es[1], ei = vis.get(i), ej = vis.get(j);
      if (!ei && !ej) return;
      const da = MODEL.faces[i].door, db = MODEL.faces[j].door;
      if (da !== db && (isOpen(da) || isOpen(db))) { if (ei) add(ei, ki); if (ej) add(ej, kj); return; }
      if (ei && !ej && proj[j] > 0.3) add(ei, ki);                     // a true outline: the other face turns away
      else if (ej && !ei && proj[i] > 0.3) add(ej, kj);
    });
    g.save(); g.lineCap = 'round'; g.strokeStyle = col;
    g.globalAlpha *= 0.22; g.lineWidth = w * 2.6; g.stroke(soft); g.globalAlpha /= 0.22;
    [[0.35, 0.7], [0.7, 1], [1, 1]].forEach(([a, k], i) => { g.globalAlpha *= a; g.lineWidth = w * k; g.stroke(buckets[i]); g.globalAlpha /= a; });
    g.restore();
  }

  // ---- lamps ----
  function indLevel(o) { const v = o.indicators; if (v == null) return 0; if (typeof v === 'number') return v; return Math.max(v.right || 0, v.left || 0); }
  function drawLamp(g, sp, kind, o, T, lod, rimCol) {
    const p = polyPath(sp), bb = boxOf(sp);
    if (kind === 'head') {
      g.fillStyle = '#131A1C'; g.fill(p);
      if (lod) { g.save(); g.clip(p); g.fillStyle = 'rgba(150,168,164,0.22)'; g.fillRect(bb.x, bb.y, bb.w, bb.h * 0.42); g.fillStyle = 'rgba(205,216,212,0.5)'; g.fillRect(bb.x, bb.y + bb.h * 0.74, bb.w, Math.max(1, bb.h * 0.1)); g.restore();
        g.strokeStyle = rgba(rimCol, 0.4); g.lineWidth = Math.max(1, bb.h * 0.08); const t2 = sp.slice().sort((a, b) => a[1] - b[1]).slice(0, 2); g.beginPath(); g.moveTo(t2[0][0], t2[0][1]); g.lineTo(t2[1][0], t2[1][1]); g.stroke(); }
      if (o.headlights) { g.save(); g.globalAlpha *= o.headlights; g.fillStyle = '#FFF4DE'; g.fill(p); g.restore(); } return;
    }
    if (kind === 'tail') { const on = o.brake || 0; g.fillStyle = mix('#4A1012', '#D8402E', on); g.fill(p); if (lod) { g.save(); g.clip(p); g.fillStyle = 'rgba(255,190,170,0.16)'; g.fillRect(bb.x, bb.y, bb.w, Math.max(1.5, bb.h * 0.12)); g.restore(); } return; }
    if (kind === 'brake') { g.fillStyle = mix('#3A0E10', '#E04A34', o.brake || 0); g.fill(p); return; }
    if (kind === 'refl' || kind === 'fogR') { g.fillStyle = '#561315'; g.fill(p); return; }
    if (kind === 'fogF') { g.fillStyle = '#1A2224'; g.fill(p); return; }
    if (kind === 'indF' || kind === 'indR' || kind === 'indM') {
      const lv = clamp(indLevel(o), 0, 1);
      g.fillStyle = mix('#5C3E18', '#FFC062', lv); g.fill(p); if (lv > 0.05) { g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha *= lv * 0.9; g.fillStyle = '#FFE2A8'; g.fill(p); g.restore(); }
    }
  }
  function emissiveLamps(E, o, decList) {
    const lv = clamp(indLevel(o), 0, 1);
    decList.forEach(e => {
      const k = e.f.lamp; if (!k) return; const bb = boxOf(e.sp), cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, r = Math.max(6, Math.hypot(bb.w, bb.h) * 0.5);
      if ((k === 'indF' || k === 'indR') && lv > 0.02) { E.save(); E.globalAlpha = lv; E.fillStyle = '#FFB04A'; E.beginPath(); E.arc(cx, cy, r * 1.6, 0, TAU); E.fill(); E.globalAlpha = lv * 0.45; E.beginPath(); E.arc(cx, cy, r * 3.2, 0, TAU); E.fill(); E.restore(); }
      if ((k === 'tail' || k === 'brake') && o.brake > 0.02) { E.save(); E.globalAlpha = o.brake * 0.8; E.fillStyle = '#E0402C'; E.beginPath(); E.arc(cx, cy, r, 0, TAU); E.fill(); E.restore(); }
      if (k === 'head' && o.headlights > 0.02) { E.save(); E.globalAlpha = o.headlights; E.fillStyle = '#FFF2D8'; E.beginPath(); E.arc(cx, cy, r * 1.2, 0, TAU); E.fill(); E.restore(); }
    });
  }
  // ---- UK number plates: white at the front, yellow at the back, black characters (a condensed face), the blue band ----
  const CAR_REG = 'HN17 WKS';
  function drawPlate(g, sp, which, lod) {
    const p = polyPath(sp); g.fillStyle = which === 'rear' ? '#E0BC3A' : '#E4E1D6'; g.fill(p);
    if (lod < 1) return;
    const byX = sp.slice().sort((a, b) => a[0] - b[0]), L2 = byX.slice(0, 2).sort((a, b) => a[1] - b[1]), R2 = byX.slice(2).sort((a, b) => a[1] - b[1]);
    const tl = L2[0], bl = L2[1], tr = R2[0];
    if (Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) < 24) return;
    g.save(); g.clip(p); g.transform((tr[0] - tl[0]) / 520, (tr[1] - tl[1]) / 520, (bl[0] - tl[0]) / 111, (bl[1] - tl[1]) / 111, tl[0], tl[1]);
    g.fillStyle = '#2B3F7A'; g.fillRect(0, 0, 46, 111);
    g.fillStyle = '#141617'; g.font = '500 80px "Oswald"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(CAR_REG, 283, 59);
    g.restore();
  }

  // =================================================================================================================
  // 5. SMALL HELPERS FOR EVERYONE: the lock blink, heat shimmer
  // =================================================================================================================
  // blink(t, t0, n): the indicators' light level for a lock/unlock confirmation starting at t0 (n flashes; the beep is at t0)
  function blink(t, t0, n, on, off) {
    n = n == null ? 2 : n; on = on || 0.34; off = off || 0.26; const u = t - t0; if (u < 0 || u > n * (on + off)) return 0;
    const ph = u % (on + off); if (ph > on) return 0.35 * Math.exp(-(ph - on) * 18);
    return Math.min(1, ph / 0.04) * (1 - 0.15 * ph / on);
  }
  // shimmer(g, box, t, {amp, rise, freq, row}): heat refraction, by sliding thin rows of what is already drawn inside a box
  // (in g's current coordinates; works on the world canvas or any layer). Cheap: one copy and a few hundred thin blits.
  const _sh = { c: null };
  function shimmer(g, box, t, o) {
    o = o || {}; const amp = o.amp == null ? 2 : o.amp, rise = o.rise == null ? 1 : o.rise, fq = o.freq || 0.045, rows = o.row || 3;
    const m = g.getTransform(); const x0 = Math.max(0, Math.floor(m.a * box.x + m.e)), y0 = Math.max(0, Math.floor(m.d * box.y + m.f));
    const w = Math.min(g.canvas.width - x0, Math.ceil(box.w * m.a)), h = Math.min(g.canvas.height - y0, Math.ceil(box.h * m.d)); if (w <= 2 || h <= 2) return;
    if (!_sh.c || _sh.c.width < w || _sh.c.height < h) _sh.c = OTM.makeCanvas(Math.max(w, _sh.c ? _sh.c.width : 0), Math.max(h, _sh.c ? _sh.c.height : 0));
    const sg = _sh.c.getContext('2d'); sg.clearRect(0, 0, w, h); sg.drawImage(g.canvas, x0, y0, w, h, 0, 0, w, h);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (let y = 0; y < h; y += rows) { const k = y / h, fall = o.fade === false ? 1 : Math.sin(Math.PI * k); const dx = amp * fall * (Math.sin(y * fq * 2.1 + t * 5.3 * rise) * 0.6 + Math.sin(y * fq * 0.7 - t * 3.1 * rise + 1.7) * 0.4); if (Math.abs(dx) < 0.25) continue; g.drawImage(_sh.c, 0, y, w, rows, x0 + dx, y0 + y, w, rows); }
    g.restore();
  }

  // =================================================================================================================
  // 6. DEMOS (each view adds its own below)
  // =================================================================================================================
  const studio = (c, key, tod, o) => {
    const T = todOf(tod); o = o || {};
    c.g.drawImage(c.cache('car:studio:' + key, g => {
      const hz = o.hz || 640;
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, [[0, T.sky[0]], [0.7, T.sky[1]], [1, T.sky[2]]]); g.fillRect(0, 0, W, hz);
      skyline(g, { x: 0, y: hz - 260, w: W, h: 260 }, hz, T.hz, 'studioline', 0, 0.3);
      g.fillStyle = LC.lin(g, 0, hz, 0, H, [[0, mix(T.gnd, T.sky[2], 0.25)], [1, T.gnd]]); g.fillRect(0, hz, W, H - hz);
      g.strokeStyle = rgba(T.sky[1], 0.16); g.lineWidth = 3; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(W / 2 + i * 60, hz + 2); g.lineTo(W / 2 + i * 520, H + 40); g.stroke(); }
    }), 0, 0);
  };
  const DEMOS = [
    { name: 'exterior: side, driver\'s flank, morning', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'side', side: 'right', x: 960, y: 860, scale: 290, tod: 'morning', em: c.em, t }); } },
    { name: 'exterior: side, passenger flank, noon', draw(c, t) { studio(c, 'n', 'noon'); exterior(c.g, { view: 'side', side: 'left', x: 960, y: 860, scale: 290, tod: 'noon', em: c.em, t }); } },
    { name: 'exterior: three-quarter front, morning, heat', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'front3q', side: 'right', x: 930, y: 900, scale: 320, tod: 'morning', em: c.em, t, heat: 1 }); } },
    { name: 'exterior: three-quarter rear, office glass, locks blinking', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'rear3q', side: 'right', x: 980, y: 900, scale: 320, tod: 'morning', reflect: 'building', indicators: blink(t, 0.6, 2), em: c.em, t }); } },
    { name: 'exterior: rear, evening copper', draw(c, t) { studio(c, 'e', 'evening'); exterior(c.g, { view: 'rear', x: 960, y: 900, scale: 340, tod: 'evening', em: c.em, t }); } },
    { name: 'exterior: driver\'s door open, evening', draw(c, t) { studio(c, 'e', 'evening'); exterior(c.g, { view: 'front3q', side: 'right', x: 900, y: 900, scale: 310, tod: 'evening', doors: { driver: 1 }, em: c.em, t }); } },
    { name: 'exterior: rear door open, dusk, indicators', draw(c, t) { studio(c, 'd', 'dusk'); exterior(c.g, { view: 'rear3q', side: 'right', x: 980, y: 900, scale: 310, tod: 'dusk', doors: { rear: 1 }, indicators: blink(t, 0.6, 2), em: c.em, t }); } },
    { name: 'exterior: side close, dusk, the rear window a mirror', draw(c, t) { studio(c, 'd', 'dusk'); exterior(c.g, { view: 'side', side: 'right', x: 1500, y: 1000, scale: 600, dist: 5, tod: 'dusk', em: c.em, t }); } },
    { name: 'exterior: in a host camera (a car park, cam/at/heading)', draw(c, t) {
      studio(c, 'mh', 'morning', { hz: 319 });       // the backdrop's horizon matches this camera's
      const cam = LC.camera({ x: 0, y: 1.6, z: -2, pitch: -0.12, f: 1500, cx: 960, cy: 500 });
      // a host lays its own world out with LC.camera and drops cars into it: the far one parked nose-in, ours side-on, the near one nose-out
      exterior(c.g, { cam, at: [3.2, 0, 16], heading: 0.15, tod: 'morning', paint: { deep: '#2A1414', dark: '#3A1C1C', mid: '#5A2A28', light: '#7A3C36', top: '#A8807A' }, rim: 0.6 });
      exterior(c.g, { cam, at: [-1.2, 0, 10], heading: Math.PI / 2, tod: 'morning', em: c.em, t });
      exterior(c.g, { cam, at: [-4.6, 0, 6.5], heading: Math.PI - 0.25, tod: 'morning', paint: { deep: '#2E3234', dark: '#4A5052', mid: '#7A8285', light: '#A9B1B3', top: '#D6DCDC' } });
    } },
    { name: 'exterior: a custom reflection (a figure in the dark rear glass)', draw(c, t) {
      studio(c, 'd', 'dusk');
      const figure = (g, w) => { REFLECT.dusk(g, w); if (w.name !== 'winR') return; const b = w.pane, x = b.x + b.w * 0.55, y = b.y + b.h * 0.18, s = b.h * 0.9;
        g.fillStyle = '#4A4E5A'; g.beginPath(); g.ellipse(x, y + s * 0.2, s * 0.13, s * 0.17, 0, 0, TAU); g.fill(); g.fillRect(x - s * 0.3, y + s * 0.42, s * 0.6, s); };
      exterior(c.g, { view: 'side', side: 'right', x: 1350, y: 980, scale: 560, dist: 5, tod: 'dusk', reflect: figure, em: c.em, t });
    } },
  ];

  window.SETS = window.SETS || {};
  SETS.car = { _dev: { MODEL, DEC, PER, FEAT }, exterior, blink, shimmer, reflect: REFLECT, reflectCanvas, tod: TOD, model: { D, yTop, sidePt, endPt, ghPt }, views: {}, demos: DEMOS };
})();
