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
    // a brick house front (Daniel's, behind the camera), repeating along the street so it is always there to slide across the glass
    house(g, w) { const T = w.T, b = w.box; skyBand(g, b, T.sky, 0.32);
      const hw = b.w * 1.3, gap = b.w * 0.25, per = hw + gap, top = b.y + b.h * 0.16, eave = b.y + b.h * 0.33, bot = b.y + b.h * 0.8;
      const off = (((w.yaw * b.w * 0.9) % per) + per) % per;
      for (let hx = b.x - per - off; hx < b.x + b.w + per; hx += per) {
        g.fillStyle = '#4A4F50'; g.beginPath(); g.moveTo(hx, eave); g.lineTo(hx + hw * 0.2, top); g.lineTo(hx + hw * 0.8, top); g.lineTo(hx + hw, eave); g.closePath(); g.fill();
        g.fillStyle = '#B98660'; g.fillRect(hx, eave, hw, bot - eave);
        [[0.12, 0.42], [0.62, 0.42]].forEach(([u, v]) => { g.fillStyle = '#E8E2D2'; g.fillRect(hx + hw * u, b.y + b.h * v, hw * 0.22, b.h * 0.17); g.fillStyle = '#5A6E70'; g.fillRect(hx + hw * u + 2, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); g.fillRect(hx + hw * (u + 0.11) + 1, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); });
        g.fillStyle = '#1F3A3B'; g.fillRect(hx + hw * 0.42, b.y + b.h * 0.48, hw * 0.12, bot - b.y - b.h * 0.48);
        g.fillStyle = '#4E6656'; g.fillRect(hx + hw, b.y + b.h * 0.5, gap, bot - b.y - b.h * 0.5);
      }
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
      const see = o.seeThrough && o.seeThrough[f.glass] != null ? o.seeThrough[f.glass] : null;    // a tint you can see through (Q05's buckle view only)
      g.fillStyle = see != null ? rgba(priv ? '#060A0B' : '#0E1619', 1 - see) : priv ? '#060A0B' : '#0E1619'; g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
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
      const asp = pts.map(q => P3(S(q))); (info.apertures = info.apertures || {})[door] = asp; g.fillStyle = '#050808'; g.fill(polyPath(asp));
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
    const p = polyPath(sp); g.fillStyle = which === 'rear' ? '#C9BF7E' : '#E4E1D6';   // the rear plate is a duller, cooler yellow than Emily's #E0B34F, which belongs to her alone g.fill(p);
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
  // 7. INTERIOR · POV: Daniel's view (C2's camera). The windscreen with the sun in the frit's dot-matrix, the cabin in its
  //    own shade, and the rear-view mirror, the frame within the frame. The mirror's content is a state:
  //    tilt 0 = aimed at the back seat (Q05 only: Emily, drawn by the sequence through s.inMirror), tilt 1 = aimed through
  //    the rear window at the road behind (the default, and the only state after Q05).
  // =================================================================================================================
  const POV = {
    morning: { sun: [588, 244], sky: [P.sunWhite, '#FCEFD3', '#EFDDB9', '#CFCDB8', '#9EB1AD'], house: '#5C706D', haze: '#E6DCC2', win: '#4A5D5B', winHaze: '#D8CFB6', edge: '#FFF0D2',
      tree: '#56706A', treeHaze: '#D9D3BC', treeRim: '#FBE6BC', bonnet: '#2E3534', sheen: '#E8DCC0', glint: '#FFF4DC', dust: '#FFF3DA', frit: '#060808', fritSun: '#3A3024',
      head: ['#4A4842', '#5E5B53'], visor: '#6A665C', pillar: ['#3E3C37', '#2C2B27', '#1E1D1A'], dash: ['#2A2A27', '#1A1B19', '#0E0F0E'], rim: '#FFE9C4', bloom: [P.sunWhite, P.sunCream, P.honey], sunR: 34, glow: 1 },
    noon: { sun: [1180, -160], sky: ['#FFFDF6', '#FBF6EA', '#F3EEDF', '#E6E4D6', '#CDD4CC'], house: '#9AA49C', haze: '#F2EDE0', win: '#7E8A84', winHaze: '#E8E2D2', edge: '#FFFFFF',
      tree: '#8A9A8E', treeHaze: '#E8E6D8', treeRim: '#FFFFFF', bonnet: '#3B4646', sheen: '#F6F1E4', glint: '#FFFFFF', dust: '#FFFFFF', frit: '#070909', fritSun: '#2E2E2A',
      head: ['#5A5953', '#6E6C64'], visor: '#7A776C', pillar: ['#4A4842', '#38372F', '#262521'], dash: ['#2E2E2A', '#1E1F1C', '#121311'], rim: '#FFF6E6', bloom: ['#FFFFFF', '#FFF6E6', '#F6E3BC'], sunR: 0, glow: 0.6 },
    evening: { sun: [880, 1000], sky: ['#FFD8A0', '#F6B878', '#E2925A', '#B06C48', '#6A4A44'], house: '#4A3434', haze: '#E8A06A', win: '#3A2828', winHaze: '#D88A5A', edge: '#FFC890',
      tree: '#3E3030', treeHaze: '#D08A5C', treeRim: '#FFB878', bonnet: '#2A2626', sheen: '#E4894A', glint: '#FFD0A0', dust: '#FFC890', frit: '#070606', fritSun: '#4A2A1A',
      head: ['#3E3430', '#4E423C'], visor: '#5A4A42', pillar: ['#382E2A', '#28221F', '#1A1614'], dash: ['#262220', '#181514', '#0E0C0B'], rim: '#F2A65E', bloom: ['#FFE6C0', '#F6B070', '#E4894A'], sunR: 0, glow: 1 },
    dusk: { sun: [700, 760], sky: ['#E39A5C', '#B07050', '#6A5A5C', '#3A4250', '#232D38'], house: '#2A2630', haze: '#7A5A5C', win: '#201C24', winHaze: '#5A4A50', edge: '#E39A5C',
      tree: '#22202A', treeHaze: '#4A4250', treeRim: '#C88060', bonnet: '#161A1E', sheen: '#6A5A5C', glint: '#E8A070', dust: '#C89878', frit: '#050607', fritSun: '#2A1E1A',
      head: ['#24262A', '#2E3034'], visor: '#34363A', pillar: ['#202226', '#18191C', '#101113'], dash: ['#181A1C', '#101213', '#08090A'], rim: '#F2A35E', bloom: ['#FFD9A0', '#E89A5E', '#B06A44'], sunR: 0, glow: 0.5 },
  };
  POV.afternoon = POV.morning; POV.dawn = POV.dusk; POV.night = POV.dusk;
  const POV_TOP = 138, POV_DASH = 806, POV_BOT = 942;
  const MQ = { tl: [462, 334], tr: [1322, 300], br: [1328, 606], bl: [468, 590] };       // the mirror glass (C2)
  const MBALL = [898, 292];                                                              // the stem's ball joint
  const CW = 1000, CH = 340;                                                             // mirror space: C2's cabin canvas
  const ROADX = -1150;                                                                   // the road framing's left edge in mirror space
  const povGlassPath = (() => { const p = new Path2D(); p.moveTo(60, 150); p.lineTo(1760, 150); p.lineTo(1880, POV_DASH); p.lineTo(0, POV_DASH); p.closePath(); return p; })();

  // the fixed frame: the street against the sun, the windscreen's own marks, the frit, the sun, the cabin in its shade, the mirror mount
  function povBase(g, tod) {
    const C = POV[tod] || POV.morning, SUN = C.sun;
    // 1. ahead, through the windscreen: the far side of the street against the light
    const v = LC.layer();
    v.fillStyle = LC.rad(v, SUN[0], SUN[1], 0, 1700, [[0, C.sky[0]], [0.08, C.sky[1]], [0.24, C.sky[2]], [0.5, C.sky[3]], [1, C.sky[4]]]); v.fillRect(0, 0, W, H);
    [[640, 0.05], [420, 0.06], [260, 0.08], [150, 0.1]].forEach(([r, a]) => { v.fillStyle = rgba(C.sky[0], a * C.glow); v.beginPath(); v.arc(SUN[0], SUN[1], r, 0, TAU); v.fill(); });
    const haze = (x, y) => Math.max(0, 1 - Math.hypot(x - SUN[0], (y - SUN[1]) * 1.4) / 1250);
    [[-60, 680], [190, 650, 'gable'], [470, 672], [760, 648], [1050, 676, 'gable'], [1320, 654], [1600, 674]].forEach(([x, y, kind], i) => {
      const w = 290, col = mix(C.house, C.haze, 0.85 * haze(x + w / 2, y));
      v.fillStyle = col; v.beginPath();
      if (kind === 'gable') { v.moveTo(x, 900); v.lineTo(x, y + 52); v.lineTo(x + w / 2, y - 26); v.lineTo(x + w, y + 52); v.lineTo(x + w, 900); }
      else { v.moveTo(x - 10, 900); v.lineTo(x - 10, y + 44); v.lineTo(x + 66, y); v.lineTo(x + w - 66, y); v.lineTo(x + w + 10, y + 44); v.lineTo(x + w + 10, 900); }
      v.closePath(); v.fill();
      const cx = x + (i % 2 ? 0.26 : 0.72) * w; v.fillRect(cx, y - 44, 26, 50); v.fillRect(cx - 4, y - 50, 34, 8);
      v.fillStyle = mix(C.win, C.winHaze, 0.85 * haze(x + w / 2, y)); for (let k = 0; k < 2; k++) v.fillRect(x + 40 + k * 130, y + 80, 70, 54);
      v.strokeStyle = rgba(C.edge, 0.35 + 0.5 * haze(x, y)); v.lineWidth = 2.2; v.beginPath();
      if (kind === 'gable') { v.moveTo(x, y + 52); v.lineTo(x + w / 2, y - 26); v.lineTo(x + w, y + 52); } else { v.moveTo(x - 10, y + 44); v.lineTo(x + 66, y); v.lineTo(x + w - 66, y); v.lineTo(x + w + 10, y + 44); }
      v.stroke(); v.strokeRect(cx - 4, y - 50, 34, 8);
    });
    const tree = (cx, cy, rx, ry, seed) => { const R = OTM.rng(seed), pts = [];
      for (let a = 0; a < 48; a++) { const t = a / 48 * TAU, n = 0.82 + 0.36 * OTM.fbm(Math.cos(t) * 1.8 + 3, Math.sin(t) * 1.8, R() * 100 | 0, 3); pts.push([cx + Math.cos(t) * rx * n, cy + Math.sin(t) * ry * n]); }
      const p = LC.pathPts(pts); v.save(); v.fillStyle = C.treeRim; v.fill(p); v.translate(-3, 6); v.fillStyle = mix(C.tree, C.treeHaze, 0.25 + 0.75 * haze(cx, cy)); v.fill(p); v.restore();
      v.save(); v.clip(p); v.fillStyle = LC.lin(v, 0, cy - ry, 0, cy + ry, [[0, C.sky[2], 0.35], [1, C.sky[2], 0]]); v.fillRect(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6); v.restore(); };
    tree(1560, 640, 230, 150, 'treeR'); tree(130, 650, 190, 130, 'treeL');
    v.fillStyle = C.bonnet; v.fill(LC.smooth([[-20, 900], [-20, 790], [600, 772], [1300, 772], [1940, 790], [1940, 900]], true));
    v.fillStyle = LC.lin(v, 0, 772, 0, 806, [[0, C.sheen, 0.85], [1, '#8E9590', 0.2]]); v.fill(LC.smooth([[-20, 806], [-20, 792], [600, 775], [1300, 775], [1940, 792], [1940, 806]], true));
    g.drawImage(LC.blurred(v.canvas, 2.2), 0, 0);
    // 2. the windscreen itself: the dashboard ghosted in the lower glass, wiper arcs and dust where the sun catches them, the frit
    const glass = povGlassPath, D2 = POV_DASH;
    g.save(); g.clip(glass); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.lin(g, 0, D2 - 190, 0, D2, [[0, '#D9D2C2', 0], [1, '#D9D2C2', 0.24 * C.glow]]); g.fillRect(0, D2 - 190, W, 190);
    g.fillStyle = rgba('#D9D2C2', 0.10 * C.glow); g.fill(LC.smooth([[1160, D2], [1240, D2 - 40], [1460, D2 - 54], [1680, D2 - 40], [1760, D2]], true));
    for (let x = 380; x < 1100; x += 26) { g.fillStyle = 'rgba(30,30,30,0.18)'; g.fillRect(x, D2 - 44, 10, 30); }
    g.restore();
    { const pv = [980, 1180]; g.save(); g.clip(glass); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
      for (let i = 0; i < 60; i++) { const r = 700 + i * 9.5; for (let a = -Math.PI * 0.86; a < -Math.PI * 0.42; a += 0.01) { const x = pv[0] + Math.cos(a) * r, y = pv[1] + Math.sin(a) * r; const d = Math.hypot(x - SUN[0], y - SUN[1]); const al = Math.max(0, 1 - d / 420) * (0.05 + 0.05 * OTM.vnoise(i * 3.1, a * 9, 4)) * C.glow;
        if (al < 0.004) continue; g.strokeStyle = rgba(C.glint, al); g.lineWidth = 1.1; g.beginPath(); g.arc(pv[0], pv[1], r, a, a + 0.012); g.stroke(); } }
      g.restore(); }
    LC.specks(g, glass, { x: 0, y: 150, w: W, h: D2 - 150 }, 'screenDust', { n: 900, color: C.dust, rMin: 0.5, rMax: 1.6, aMin: 0.1 * C.glow, aMax: 0.55 * C.glow, scratch: 0.1, near: { x: clamp(SUN[0], 0, W), y: clamp(SUN[1], 150, D2), r: 520 } });
    povFrit(g, C);
    // 3. the sun in the frit's dot-matrix (morning and evening; at noon it is above the roof, at dusk below the bonnet)
    if (C.sunR) {
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, SUN[0], SUN[1], 0, 420, [[0, C.bloom[0], 1], [0.1, C.bloom[0], 0.95], [0.26, C.bloom[1], 0.5], [0.6, C.bloom[2], 0.12], [1, C.bloom[2], 0]]); g.fillRect(SUN[0] - 420, SUN[1] - 420, 840, 840); g.restore();
      g.fillStyle = C.bloom[0]; g.beginPath(); g.arc(SUN[0], SUN[1], C.sunR, 0, TAU); g.fill();
      if (SUN[1] < 300) { g.save(); g.beginPath(); g.arc(SUN[0], SUN[1], 70, 0, TAU); g.clip();
        for (let row = 0; row < 7; row++) { const y = 214 + 6 + row * 11, r0 = 4.6 * (1 - row / 7.2); for (let x = (row % 2) * 6; x < W; x += 12) { const d = Math.hypot(x - SUN[0], y - SUN[1]); if (d > 70) continue; const r = r0 * (0.35 + 0.65 * d / 70); g.fillStyle = rgba(C.fritSun, 0.35 + 0.6 * d / 70); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
        g.restore(); }
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, SUN[0] - 1000, 0, SUN[0] + 1000, 0, [[0, C.glint, 0], [0.5, C.glint, 0.4], [1, C.glint, 0]]); g.fillRect(SUN[0] - 1000, SUN[1] - 2.5, 2000, 5); g.restore();
    } else if (tod === 'noon') {
      // the noon sun is above the roof: the whole glass is bleached, the frit's lower edge burns white
      g.save(); g.clip(glass); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 150, 0, 520, [[0, '#FFFFFF', 0.4], [1, '#FFFFFF', 0]]); g.fillRect(0, 150, W, 380); g.restore();
    }
    // 4. the cabin frame: headliner, visors, A-pillars, dashboard, all in their own shade (contre-jour)
    g.fillStyle = LC.lin(g, 0, POV_TOP, 0, 196, [[0, C.head[0]], [1, C.head[1]]]); g.fillRect(0, 0, W, 186);
    g.fillStyle = mix(C.pillar[1], '#000000', 0.1); g.fillRect(0, 184, W, 4);
    const visor = (x0, x1, y1) => { const p = LC.rrect(x0, 120, x1 - x0, y1 - 120, 22); g.fillStyle = C.visor; g.fill(p); g.strokeStyle = 'rgba(30,29,26,0.6)'; g.lineWidth = 2; g.stroke(p); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(40,38,34,0.5)'; g.stroke(LC.rrect(x0 + 10, 126, x1 - x0 - 20, y1 - 136, 16)); g.setLineDash([]);
      g.fillStyle = rgba(C.rim, 0.12); g.fillRect(x0 + 20, y1 - 10, x1 - x0 - 40, 4); };
    visor(110, 600, 206); visor(1110, 1650, 202);
    { const ap = new Path2D(); ap.moveTo(1700, 0); ap.lineTo(W, 0); ap.lineTo(W, 900); ap.lineTo(1876, POV_DASH); ap.bezierCurveTo(1840, 560, 1790, 330, 1700, 150); ap.closePath();
      g.fillStyle = LC.lin(g, 1700, 0, W, 0, [[0, C.pillar[0]], [0.5, C.pillar[1]], [1, C.pillar[2]]]); g.fill(ap);
      g.strokeStyle = '#0B0C0B'; g.lineWidth = 7; g.beginPath(); g.moveTo(1702, 150); g.bezierCurveTo(1792, 330, 1842, 560, 1878, POV_DASH); g.stroke();
      g.strokeStyle = rgba(C.rim, 0.25); g.lineWidth = 2; g.beginPath(); g.moveTo(1714, 160); g.bezierCurveTo(1802, 336, 1850, 560, 1886, POV_DASH); g.stroke();
      const lp = new Path2D(); lp.moveTo(0, 150); lp.lineTo(64, 150); lp.bezierCurveTo(40, 400, 18, 600, 0, 760); lp.closePath(); g.fillStyle = C.pillar[1]; g.fill(lp); }
    { const d = new Path2D(); d.rect(0, POV_DASH, W, H - POV_DASH);
      g.fillStyle = LC.lin(g, 0, POV_DASH, 0, POV_BOT, [[0, C.dash[0]], [0.25, C.dash[1]], [1, C.dash[2]]]); g.fill(d);
      g.fillStyle = rgba(C.rim, 0.14); g.fillRect(0, POV_DASH, W, 3);
      for (let x = 380; x < 1100; x += 26) { g.fillStyle = '#0A0B0A'; g.fillRect(x, POV_DASH + 14, 10, 22); g.fillStyle = rgba(C.rim, 0.09); g.fillRect(x, POV_DASH + 12, 10, 2); }
      const bn = LC.smooth([[1150, POV_BOT + 10], [1180, POV_DASH + 30], [1300, POV_DASH - 12], [1460, POV_DASH - 26], [1620, POV_DASH - 12], [1740, POV_DASH + 30], [1770, POV_BOT + 10]]);
      g.fillStyle = '#121312'; g.fill(bn); g.strokeStyle = rgba(C.rim, 0.16); g.lineWidth = 2.5; g.stroke(bn); }
    // the mirror's mount on the glass and its stem
    g.fillStyle = '#0D0F10'; g.fill(LC.rquad([[836, 204], [956, 204], [946, 288], [846, 288]], 10));
    g.fillStyle = rgba(C.rim, 0.35); g.fillRect(840, 204, 112, 2);
    g.fillStyle = '#121516'; g.fill(LC.rquad([[880, 282], [912, 282], [918, 318], [884, 318]], 6)); g.beginPath(); g.arc(MBALL[0], MBALL[1], 17, 0, TAU); g.fill();
    g.strokeStyle = rgba(C.rim, 0.45); g.lineWidth = 2; g.beginPath(); g.arc(MBALL[0], MBALL[1], 17, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
  }
  // the frit: the black ceramic band along the top of the windscreen, its dot-matrix edge, and the patch round the mirror mount
  function povFrit(g, C) {
    const FB = 214, fr = new Path2D(); fr.moveTo(0, 0); fr.lineTo(W, 0); fr.lineTo(W, FB); fr.lineTo(990, FB); fr.lineTo(976, 290); fr.lineTo(816, 290); fr.lineTo(802, FB); fr.lineTo(0, FB); fr.closePath();
    g.fillStyle = C.frit; g.fill(fr);
    const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    for (let row = 0; row < 7; row++) { const y = FB + 6 + row * 11, r = 4.6 * (1 - row / 7.2); for (let x = (row % 2) * 6; x < W; x += 12) { if (x > 798 && x < 994 && y < 294) continue; dot(x, y, r); } }
    for (let row = 0; row < 6; row++) { const r = 4.4 * (1 - row / 6.4); for (let y = FB; y < 298; y += 11) { dot(808 - 6 - row * 11 + (y / 11 % 2) * 3, y, r); dot(984 + 6 + row * 11 - (y / 11 % 2) * 3, y, r); } }
    for (let row = 0; row < 6; row++) { const y = 298 + row * 11, r = 4.4 * (1 - row / 6.4); for (let x = 816 - row * 4; x < 978 + row * 4; x += 12) dot(x + (row % 2) * 6, y, r); }
  }

  // ---- mirror space: the rear cabin as the mirror holds it (mirror image: the car's right is the image's right) ----
  // x 0..1000 is C2's framing (aimed at the child seat behind the driver); x -1150..-150 is the road framing (aimed through
  // the rear window); between them the dark C-pillar trim. Only the unlit cabin is cached here; the sun's strip, the
  // headrests and the road behind are laid on per frame so they fall on whatever the sequence draws in the mirror.
  const STRIP = (() => {
    const yT = x => x < 470 ? 146 + x * 6 / 470 : x < 560 ? 152 + (x - 470) / 90 * 14 : 166 + (x - 560) / 440 * 6, yB = x => yT(x) + 44;
    const p = new Path2D(), top = [], bot = [];
    for (let x = -10; x <= 1010; x += 10) { top.push([x, yT(x) + 1.6 * (OTM.vnoise(x * 0.05, 1, 7) - 0.5)]); bot.push([x, yB(x) + 1.6 * (OTM.vnoise(x * 0.05, 9, 7) - 0.5)]); }
    top.concat(bot.reverse()).forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath();
    return { path: p, yT, yB, shadeX: 666 };
  })();
  function povCabin(tod) {
    const C = POV[tod] || POV.morning, warm = tod === 'morning' || tod === 'afternoon';
    const c = LC.layer(CW - ROADX, CH); c.translate(-ROADX, 0);
    const S = (pts, col) => { c.fillStyle = col; c.fill(LC.smooth(pts)); };
    const base = warm ? '#202B2B' : mix('#202B2B', '#0B0E10', 0.45);
    c.fillStyle = base; c.fillRect(ROADX, 0, CW - ROADX, CH);
    c.fillStyle = LC.lin(c, 0, 0, 0, 50, [[0, '#161E1E'], [1, '#242E2E']]); c.fillRect(-150, 0, CW + 150, 50);
    // the rear window, upper left: the house in the morning sun (the phone is in there)
    const RWp = LC.pathPts([[96, 16], [560, 12], [618, 104], [40, 110]]);
    c.save(); c.clip(RWp);
    if (warm) {
      c.fillStyle = '#E3DFCF'; c.fillRect(0, 0, CW, CH);
      c.fillStyle = '#4A4F50'; c.beginPath(); c.moveTo(20, 46); c.lineTo(200, 18); c.lineTo(520, 18); c.lineTo(660, 46); c.closePath(); c.fill();
      c.fillStyle = '#C08A5D'; c.fillRect(20, 44, 660, 70); c.fillStyle = 'rgba(110,64,36,0.25)'; for (let y = 50; y < 112; y += 6) c.fillRect(20, y, 660, 1.4);
      c.fillStyle = '#E6D6B4'; c.fillRect(300, 54, 70, 58); c.fillStyle = '#1F3A3B'; c.fillRect(306, 59, 58, 53); c.fillStyle = '#5E7A78'; c.fillRect(312, 65, 20, 17); c.fillRect(338, 65, 20, 17);
      c.fillStyle = '#B8C5C1'; c.fillRect(120, 56, 112, 42); c.fillStyle = '#E4EAE4'; c.fillRect(125, 60, 48, 34); c.fillRect(179, 60, 48, 34);
      c.fillStyle = '#B8C5C1'; c.fillRect(430, 56, 100, 40); c.fillStyle = '#DCE4DE'; c.fillRect(435, 60, 43, 32); c.fillRect(483, 60, 43, 32);
      c.fillStyle = '#34463A'; c.fillRect(20, 96, 660, 30); c.fillStyle = '#495E4E'; for (let x = 20; x < 680; x += 16) { c.beginPath(); c.arc(x, 98, 9, 0, TAU); c.fill(); }
    } else { c.fillStyle = LC.lin(c, 0, 12, 0, 110, [[0, C.sky[4]], [0.6, C.sky[2]], [1, C.sky[1]]]); c.fillRect(0, 0, CW, CH); c.fillStyle = mix(C.house, '#000000', 0.2); c.fillRect(20, 70, 660, 60); }
    c.restore();
    c.strokeStyle = 'rgba(30,26,22,0.5)'; c.lineWidth = 1.3;
    for (let i = 1; i < 8; i++) { const t = i / 8, y = 14 + t * 94, xl = 96 - 56 * t, xr = 560 + 58 * t; c.beginPath(); c.moveTo(xl + 12, y); c.quadraticCurveTo(320, y + 3, xr - 12, y); c.stroke(); }
    c.strokeStyle = '#1C2424'; c.lineWidth = 9; c.stroke(RWp);
    c.fillStyle = '#1A2020'; c.fillRect(0, 106, 640, 22);
    c.fillStyle = mix('#262E30', base, warm ? 0 : 0.5); c.fillRect(0, 126, 640, CH);
    c.strokeStyle = 'rgba(12,16,16,0.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(250, 130); c.lineTo(244, CH); c.stroke();
    S([[110, 96], [240, 92], [252, 126], [246, 176], [110, 180], [100, 130]], '#313A3C');
    // the child seat behind the driver: high shell, head wings, teal insert
    S([[478, 10], [990, 4], [1010, 120], [1004, 340], [488, 340], [470, 120]], '#1B2123');
    S([[520, 40], [940, 34], [962, 120], [956, 236], [526, 240], [506, 120]], '#355150');
    S([[468, 54], [548, 44], [570, 140], [556, 262], [478, 270], [460, 160]], '#29393A');
    S([[488, 262], [606, 252], [622, 340], [484, 340]], '#253133');
    c.strokeStyle = 'rgba(14,20,20,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(560, 70); c.quadraticCurveTo(580, 150, 566, 236); c.stroke();
    // the C-pillar trim between the cabin framing and the road framing: the dark wipe the tilt passes through
    c.fillStyle = '#0E1314'; c.fillRect(-150, 0, 150, CH); c.fillStyle = '#141B1C'; c.fill(LC.smooth([[-150, -10], [-20, -10], [10, 60], [30, 200], [10, CH + 10], [-150, CH + 10]]));
    c.fillStyle = '#0E1314'; c.fillRect(ROADX, 0, 1000, CH);
    return c.canvas;
  }
  // the road framing (mirror space x ROADX..ROADX+1000): the rear window square-on, the road behind through it; drawn per frame
  // when the road moves (travel), otherwise cached. Mirror image: the kerb is on the left, the centre line on the right.
  const RW_OPEN = (() => { const p = LC.rrect(ROADX + 46, 26, 908, 268, 40); return p; })();
  // the road behind, as the mirror gives it back: a residential street seen from the driver's eye (1.2 m), mirror-imaged
  // (the near kerb on the left, the oncoming lane on the right). o.travel (m) makes it recede; o.tod lights it.
  const RB = {
    morning: { sky: ['#B4C4C0', '#DAD8C6', '#EFE2C4'], road: '#7C807A', roadFar: '#B8B8A8', pave: '#A3A59A', brick: ['#8A6A56', '#7A6050', '#946E58'], roof: '#454A4C', win: '#DCE2DC', hedge: '#4E6656', haze: '#DCD8C6', line: '#ECE8DA', post: '#3A3E3E' },
    noon: { sky: ['#E8E8DE', '#F6F1E4', '#FFF8EA'], road: '#9C9A90', roadFar: '#D8D2C2', pave: '#CFC9B8', brick: ['#A88A72', '#9A806C', '#B0907A'], roof: '#6A6C68', win: '#F2EEE2', hedge: '#7A8A70', haze: '#F2ECDC', line: '#FFFFFF', post: '#5A5C58' },
    evening: { sky: ['#7A5A50', '#C27A4C', '#F0A462'], road: '#4A3A34', roadFar: '#9A6A4C', pave: '#6A5044', brick: ['#7A4A36', '#6A4232', '#844E38'], roof: '#2E2626', win: '#F2B070', hedge: '#3A3428', haze: '#D08A5C', line: '#E8C8A0', post: '#2A2222' },
    dusk: { sky: ['#232D38', '#4A4A58', '#8A6A62'], road: '#26262C', roadFar: '#4A4248', pave: '#34323A', brick: ['#3E3438', '#383034', '#443838'], roof: '#1E1C22', win: '#E8B070', hedge: '#24262A', haze: '#5A4E54', line: '#9A949A', post: '#18181C' },
  };
  RB.afternoon = RB.morning; RB.dawn = RB.dusk; RB.night = RB.dusk;
  function roadBehind(g, x0, y0, w, h, o) {
    const C = RB[o.tod] || RB.morning, travel = o.travel || 0, warm = !(o.tod === 'dusk' || o.tod === 'night');
    const cam = LC.camera({ x: 0, y: 1.2, z: 0, pitch: -0.02, f: w * 1.05, cx: x0 + w * 0.5, cy: y0 + h * 0.44 });
    const hzY = cam.p(0, 1.2, 1e5)[1];
    g.fillStyle = LC.lin(g, 0, y0, 0, hzY, [[0, C.sky[0]], [0.65, C.sky[1]], [1, C.sky[2]]]); g.fillRect(x0, y0, w, hzY - y0 + 1);
    g.fillStyle = C.pave; g.fillRect(x0, hzY, w, y0 + h - hzY);
    const Q = (pts, col) => { const sp = pts.map(q => cam.p(q)); if (sp.some(q => q[2] < 0.3)) return; g.fillStyle = col; g.fill(polyPath(sp)); };
    const hz = (col, z) => mix(col, C.haze, clamp(z / 140, 0, 0.85));
    // the carriageway: the near kerb at x -1.9, the centre line at 1.7, the far kerb at 5.3
    g.fillStyle = LC.lin(g, 0, hzY, 0, y0 + h, [[0, C.roadFar], [0.25, C.road], [1, C.road]]); g.fill(polyPath([cam.p(-1.9, 0, 260), cam.p(5.3, 0, 260), cam.p(5.3, 0, 1.2), cam.p(-1.9, 0, 1.2)]));
    // the dashes of the centre line, and the near kerb's double yellow lines near the junction
    for (let i = 0; i < 16; i++) { const z0 = 3 + ((i * 12 + travel) % 192), z1 = z0 + 4; Q([[1.62, 0, z0], [1.78, 0, z0], [1.78, 0, z1], [1.62, 0, z1]], hz(C.line, z0)); }
    [[-1.78], [-1.66]].forEach(([x]) => Q([[x, 0, 1.5], [x + 0.08, 0, 1.5], [x + 0.08, 0, 60], [x, 0, 60]], hz(warm ? '#D8B048' : '#7A6A3A', 20)));
    // kerbstones' lit edges
    [[-1.9, 1], [5.3, -1]].forEach(([x, sd]) => Q([[x, 0, 1.5], [x, 0.12, 1.5], [x, 0.12, 240], [x, 0, 240]], mix(C.pave, '#FFFFFF', 0.2)));
    // houses either side: semis in pairs with gaps, front gardens, low walls; far to near, sliding away as we go
    const items = [];
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 18; i++) {
      const seed = OTM.rng('rb' + side + ':' + i); const z0 = 6 + ((i * 11 + travel + (side > 0 ? 5 : 0)) % 198), depth = 7 + seed() * 1.5, wide = 7.6 + seed() * 1.6, ht = 5.4 + seed() * 0.9;
      items.push({ side, z0, depth, wide, ht, seed, col: C.brick[(i + (side > 0 ? 1 : 0)) % 3] });
    }
    items.sort((a, b) => b.z0 - a.z0).forEach(it => {
      const xf = it.side < 0 ? -9.5 : 12.5, xb = xf + it.side * it.depth * -1 * -1; // fronts face the road
      const xr = it.side < 0 ? xf - it.depth : xf + it.depth, z0 = it.z0, z1 = z0 + it.wide, top = it.ht;
      const near = z0 < z1 ? z0 : z1;
      // the gable end facing us, the front facing the road, the roof
      Q([[xf, 0, near], [xr, 0, near], [xr, top, near], [xf, top, near]], hz(mix(it.col, '#000000', 0.18), near));
      Q([[xf, 0, z0], [xf, 0, z1], [xf, top, z1], [xf, top, z0]], hz(it.col, near));
      Q([[xf, top, z0], [xf, top, z1], [(xf + xr) / 2, top + 2.4, z1], [(xf + xr) / 2, top + 2.4, z0]], hz(C.roof, near));
      // windows on the front: two up, two down; the door
      if (near < 70) for (let k = 0; k < 2; k++) for (let r = 0; r < 2; r++) { const za = z0 + 1.2 + k * 3.6, zb = za + 1.5, ya = 1.0 + r * 2.6, yb = ya + 1.3; Q([[xf + it.side * 0.02, ya, za], [xf + it.side * 0.02, ya, zb], [xf + it.side * 0.02, yb, zb], [xf + it.side * 0.02, yb, za]], hz(C.win, near)); }
      // the low front wall or hedge along the pavement
      const xw = it.side < 0 ? -4.0 : 7.4; Q([[xw, 0, z0 - 0.5], [xw, 0, z1 + 0.5], [xw, 0.7, z1 + 0.5], [xw, 0.7, z0 - 0.5]], hz(it.seed() > 0.4 ? C.hedge : mix(it.col, '#000000', 0.25), near));
    });
    // lamp posts on the near side, a street tree on the far side
    for (let i = 0; i < 7; i++) { const z = 8 + ((i * 30 + travel) % 210); const a = cam.p(-2.3, 0, z), b = cam.p(-2.3, 5.6, z), c2 = cam.p(-1.5, 5.6, z); if (a[2] < 0.3) continue; g.strokeStyle = hz(C.post, z); g.lineWidth = Math.max(1, cam.k(z) * 0.12); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke(); }
    for (let i = 0; i < 6; i++) { const z = 14 + ((i * 34 + travel + 9) % 204); const c3 = cam.p(6.4, 4.2, z), k = cam.k(z); if (c3[2] < 0.3) continue; g.fillStyle = hz(warm ? '#4E6656' : '#24262A', z); g.beginPath(); g.ellipse(c3[0], c3[1], k * 2.0, k * 2.3, 0, 0, TAU); g.fill(); const tb = cam.p(6.4, 0, z); g.fillRect(tb[0] - k * 0.12, c3[1], k * 0.24, tb[1] - c3[1]); }
    // the sun's light lies along the road in the evening; at dusk the windows are lit
    // in the evening the low sun is behind the car: it sits in the road behind, in the mirror, and blazes
    if (o.tod === 'evening') { const sx = x0 + w * 0.56, sy = hzY - h * 0.02; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, sx, sy, 0, w * 0.75, [[0, '#FFE2B0', 0.95], [0.08, '#FFC890', 0.75], [0.3, '#F2A65E', 0.32], [1, '#E4894A', 0]]); g.fillRect(x0, y0, w, h); g.restore();
      g.fillStyle = '#FFF2DA'; g.beginPath(); g.arc(sx, sy, Math.max(2, h * 0.07), 0, TAU); g.fill(); }
  }
  function drawRoadFraming(g, s) {
    g.save(); g.clip(RW_OPEN); roadBehind(g, ROADX + 46, 26, 908, 268, s); g.restore();
    // demister lines across the rear glass, the wiper parked on it, the glass's own faint sheen
    g.strokeStyle = 'rgba(20,22,22,0.35)'; g.lineWidth = 1.3; for (let i = 1; i < 9; i++) { const y = 26 + i * 268 / 9; g.beginPath(); g.moveTo(ROADX + 90, y); g.quadraticCurveTo(ROADX + 500, y + 3, ROADX + 910, y); g.stroke(); }
    g.lineCap = 'round'; g.strokeStyle = 'rgba(8,11,12,0.85)'; g.lineWidth = 6; g.beginPath(); g.moveTo(ROADX + 520, 296); g.lineTo(ROADX + 300, 262); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(ROADX + 300, 262); g.lineTo(ROADX + 140, 276); g.stroke();
    g.strokeStyle = '#1A2122'; g.lineWidth = 16; g.stroke(RW_OPEN);
  }

  // the mirror's quad for a given tilt: the glass turns a few degrees round the ball as Daniel aims it at the traffic
  function mirrorQuad(tilt) {
    const a = -0.045 * tilt, ca = Math.cos(a), sa = Math.sin(a), sy = 1 - 0.03 * tilt;
    const T = q => { const dx = q[0] - MBALL[0], dy = (q[1] - MBALL[1]) * sy; return [MBALL[0] + dx * ca - dy * sa, MBALL[1] + dx * sa + dy * ca + 5 * tilt]; };
    return { tl: T(MQ.tl), tr: T(MQ.tr), br: T(MQ.br), bl: T(MQ.bl) };
  }
  function lozenge(Q, grow) {
    const bil = (u, w) => { const t = [Q.tl[0] + (Q.tr[0] - Q.tl[0]) * u, Q.tl[1] + (Q.tr[1] - Q.tl[1]) * u], b = [Q.bl[0] + (Q.br[0] - Q.bl[0]) * u, Q.bl[1] + (Q.br[1] - Q.bl[1]) * u]; return [t[0] + (b[0] - t[0]) * w, t[1] + (b[1] - t[1]) * w]; };
    const pts = [], N = 96, cxm = (Q.tl[0] + Q.br[0]) / 2, cym = (Q.tl[1] + Q.br[1]) / 2;
    for (let i = 0; i < N; i++) { const a = i / N * TAU, cx = Math.cos(a), sy = Math.sin(a); const sx = Math.sign(cx) * Math.pow(Math.abs(cx), 0.42), syy = Math.sign(sy) * Math.pow(Math.abs(sy), 0.62); let u = 0.5 + 0.5 * sx, w = 0.5 + 0.5 * syy; w -= 0.03 * Math.sin(u * Math.PI) * (w < 0.5 ? 1 : 0);
      const p = bil(u, w); pts.push([p[0] + (p[0] - cxm) * grow / 440, p[1] + (p[1] - cym) * grow / 140]); }
    return LC.pathPts(pts);
  }
  // the static pieces of the mirror's content, in mirror space: the passenger headrest's soft shadow in the strip, the motes, the driver's headrest
  function mirrorBits() {
    const sh = LC.layer(CW, CH); const gapP = LC.smooth([[150, 120], [262, 124], [282, 170], [268, 230], [160, 226], [142, 170]]);
    sh.fillStyle = '#2A3234'; sh.fill(gapP); sh.globalCompositeOperation = 'destination-in'; sh.fill(STRIP.path);
    const shadow = LC.blurred(sh.canvas, 4, false);
    const mo = LC.layer(CW, CH); { const R = OTM.rng('motes'); for (let i = 0; i < 70; i++) { const x = R() * 660, y = 120 + R() * 120; const inS = mo.isPointInPath(STRIP.path, x, y); const a = inS ? 0.55 + R() * 0.45 : 0.08 + R() * 0.12; mo.fillStyle = rgba(inS ? '#FFFFFF' : '#F4DDB0', a); mo.beginPath(); mo.arc(x, y, inS ? 0.9 + R() * 1.6 : 0.8 + R(), 0, TAU); mo.fill(); } }
    const hr = LC.layer(CW + 60, CH + 30);
    hr.fillStyle = '#131819'; hr.fill(LC.smooth([[726, 66], [800, 26], [960, 18], [1040, 60], [1040, 300], [1010, 352], [760, 352], [734, 300], [720, 170]]));
    hr.strokeStyle = 'rgba(132,148,146,0.4)'; hr.lineWidth = 6; hr.beginPath(); hr.moveTo(734, 86); hr.quadraticCurveTo(800, 32, 960, 26); hr.stroke();
    hr.fillStyle = '#151A1B'; hr.fill(LC.smooth([[-40, 196], [50, 182], [130, 192], [150, 240], [146, 352], [-40, 352]]));
    return { shadow, motes: mo.canvas, headrest: LC.blurred(hr.canvas, 8, false) };
  }
  let _mbits = null;
  const MIRROR_ANCHORS = {
    headStrip: [604, 172],       // her head upright in the seat, the strip of sun across her eyes
    headTurn: [650, 182],        // turning away from it
    headShade: [712, 188],       // leaning into the shade behind Daniel's headrest: half her face behind it (C2)
    headGone: [846, 196],        // wholly behind the headrest
    seat: [740, 336],            // the base of the child seat's cushion, mid
    rabbit: [604, 262],
  };

  function povView() {
    return {
      // s: { tod, mirror: 'road' (default) | 'cabin', tilt 0..1 (overrides mirror), inMirror(g, M), stripOver (true), dash 0..1,
      //      vibrate 0..1, travel (m, the road behind moving), behind: 'road' }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', C = POV[tod] || POV.morning;
        const tilt = clamp(s.tilt != null ? s.tilt : s.mirror === 'cabin' ? 0 : 1, 0, 1), te = FILM.ease.inOutSine(tilt);
        const g = c.g;
        g.drawImage(c.cache('car:pov:base:' + tod, gg => povBase(gg, tod)), 0, 0);
        // the dashboard waking (engine on): the binnacle's glow under its hood, the radio's display along the bottom edge
        if (s.dash > 0) {
          g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(s.dash, 0, 1);
          g.strokeStyle = 'rgba(191,212,216,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1190, POV_DASH + 40); g.bezierCurveTo(1300, POV_DASH + 2, 1620, POV_DASH + 2, 1730, POV_DASH + 40); g.stroke();
          g.fillStyle = LC.lin(g, 0, POV_DASH + 20, 0, POV_DASH + 120, [[0, '#BFD4D8', 0.1], [1, '#BFD4D8', 0]]); g.fillRect(1200, POV_DASH + 20, 520, 100);
          g.save(); g.translate(560, H + 30); g.scale(1, 0.35); g.fillStyle = LC.rad(g, 0, 0, 0, 260, [[0, '#E8C890', 0.22], [1, '#E8C890', 0]]); g.fillRect(-260, -260, 520, 520); g.restore();
          g.restore();
          c.em.save(); c.em.globalAlpha = 0.25 * s.dash; c.em.fillStyle = '#BFD4D8'; c.em.fillRect(1240, POV_DASH + 30, 440, 40); c.em.restore();
        }
        if (C.sunR) { const E = c.em, SUN = C.sun; E.fillStyle = C.bloom[0]; E.beginPath(); E.arc(SUN[0], SUN[1], 90, 0, TAU); E.fill(); E.fillStyle = rgba(C.bloom[1], 0.6); E.beginPath(); E.arc(SUN[0], SUN[1], 230, 0, TAU); E.fill(); E.fillStyle = rgba(C.bloom[2], 0.25); E.beginPath(); E.arc(SUN[0], SUN[1], 420, 0, TAU); E.fill(); }
        // ---- the mirror ----
        const Q = tilt <= 0 ? MQ : mirrorQuad(te);
        const glassP = lozenge(Q, 0), housing = lozenge(Q, 13), housingB = lozenge(Q, 15);
        g.save(); g.translate(0, 16); g.fillStyle = '#0B0D0E'; g.fill(housingB); g.restore();
        g.fillStyle = '#1B1F21'; g.fill(housing);
        // the light behind lays a hot line along the housing's top edge, hottest at the end nearest the sun
        { const bx = Math.min(Q.tl[0], Q.bl[0]) - 30, by = Math.min(Q.tl[1], Q.tr[1]) - 30, bw = Math.max(Q.tr[0], Q.br[0]) - bx + 60, bh = Math.max(Q.bl[1], Q.br[1]) - by + 60;
          const cut = new Path2D(); cut.rect(bx, by, bw, bh); cut.addPath(housing, new DOMMatrix([1, 0, 0, 1, 3, 5]));
          g.save(); g.clip(housing); g.fillStyle = LC.lin(g, 450, 0, 1340, 0, [[0, C.rim, 1], [0.55, C.rim, 0.45], [1, C.rim, 0.15]]); g.fill(cut, 'evenodd'); g.restore(); }
        // the glass: the content through the mirror-space transform
        const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], ux = sub(Q.tr, Q.tl), vy = sub(Q.bl, Q.tl);
        const vib = s.vibrate ? s.vibrate * 1.6 : 0, jx = vib * FILM.wob(t, 13, 3), jy = vib * FILM.wob(t, 11, 9);
        const panX = lerp(0, ROADX, te), panY = lerp(0, -4, te);
        const M = { w: CW, h: CH, tilt, pan: [panX, panY], anchors: MIRROR_ANCHORS, ppm: 900, strip: STRIP, light: { x: -400, y: -300, color: '#FFF6E6' }, toScreen: null };
        g.save(); g.clip(glassP);
        g.fillStyle = '#101414'; g.fillRect(400, 250, 1000, 420);
        g.transform(ux[0] / CW, ux[1] / CW, vy[0] / CH, vy[1] / CH, Q.tl[0] + jx, Q.tl[1] + jy); g.translate(-panX, -panY);
        const mt = g.getTransform(); M.toScreen = (x, y) => [mt.a * x + mt.c * y + mt.e, mt.b * x + mt.d * y + mt.f];
        const cab = c.cache('car:pov:cab:' + (tod === 'morning' || tod === 'afternoon' ? 'warm' : 'cool'), gg => gg.drawImage(povCabin(tod), 0, 0), CW - ROADX, CH);
        g.drawImage(cab, ROADX, 0);
        if (tilt > 0) {   // the road framing (the road behind), live when it moves
          if (s.travel != null) { g.save(); drawRoadFraming(g, s); g.restore(); }
          else g.drawImage(c.cache('car:pov:road:' + tod, gg => { gg.translate(-ROADX, 0); drawRoadFraming(gg, { tod }); }, 1000, CH), ROADX, 0);
        }
        if (tilt < 1) {
          if (!_mbits) _mbits = mirrorBits();
          const warm = tod === 'morning' || tod === 'afternoon', stripOn = warm && s.strip !== false;
          if (!stripOn || s.stripOver === false) { if (stripOn) layStrip(g); if (s.inMirror) { g.save(); s.inMirror(g, M); g.restore(); } }
          else { if (s.inMirror) { g.save(); s.inMirror(g, M); g.restore(); } layStrip(g); }
          g.drawImage(_mbits.headrest, 0, 0);
        }
        g.restore();
        // the glass's own finish: a day/night mirror's prismatic ghost, cooler and a little darker, dust, a sheen, the bevel
        g.save(); g.clip(glassP);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(200,214,210,1)'; g.fillRect(400, 250, 1000, 420);
        g.globalCompositeOperation = 'source-over';
        g.drawImage(c.cache('car:pov:mfinish', gg => { LC.specks(gg, null, { x: 462, y: 300, w: 870, h: 310 }, 'mirrorDust', { n: 120, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.05, aMax: 0.22, scratch: 0.1 }); LC.glare(gg, null, { x: 640, y: 440, angle: -0.5, color: '#FFFFFF', bands: [{ d: -40, w: 60, a: 0.035 }, { d: 30, w: 10, a: 0.05 }] }); }), 0, 0);
        g.strokeStyle = 'rgba(255,248,232,0.5)'; g.lineWidth = 2; g.stroke(glassP);
        g.restore();
        if (tilt < 0.5 && (tod === 'morning' || tod === 'afternoon')) { const E = c.em; E.save(); E.transform(ux[0] / CW, ux[1] / CW, vy[0] / CH, vy[1] / CH, Q.tl[0], Q.tl[1]); E.translate(-panX, -panY); E.globalAlpha = 0.35 * (1 - tilt * 2); E.fillStyle = P.sunWhite; E.fillRect(0, 116, 720, 38); E.restore(); }
        // the day/night tab under the housing
        { const tb = [lerp(Q.bl[0], Q.br[0], 0.5) - 26, lerp(Q.bl[1], Q.br[1], 0.5) + 20]; g.fillStyle = '#0C0E0F'; g.fill(LC.rrect(tb[0], tb[1], 52, 20, 6)); }
        this._M = M;
      },
      // in front of everything (a hand on the mirror is drawn between back and front): nothing physical, only the light in the air
      front(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', C = POV[tod] || POV.morning; if (!C.sunR) return;
        const g = c.g, SUN = C.sun;
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5;
        g.drawImage(c.cache('car:pov:air:' + tod, gg => { const R = OTM.rng('povair'); for (let i = 0; i < 46; i++) { const a = R() * TAU, d = 60 + R() * 380; const x = SUN[0] + Math.cos(a) * d * 1.5, y = SUN[1] + 120 + Math.sin(a) * d * 0.8; gg.fillStyle = rgba(C.glint, 0.25 + R() * 0.5); gg.beginPath(); gg.arc(x, y, 0.8 + R() * 1.4, 0, TAU); gg.fill(); } }), 0, Math.sin(t * 0.4) * 6);
        g.restore();
      },
      anchors: { mirror: MQ, ball: MBALL, sun: POV.morning.sun, dash: [960, 860], binnacle: [1460, 860], mirrorAnchors: MIRROR_ANCHORS, mirrorSpace: { w: CW, h: CH, roadX: ROADX } },
      light: { x: POV.morning.sun[0], y: POV.morning.sun[1], color: P.sunWhite },
    };
    function layStrip(g) {
      // the light lies on the fabric (and on her): brighten what is there, break it where the passenger's headrest stands in the sun's way
      const lit = new Path2D(); lit.rect(-10, 0, STRIP.shadeX + 10, CH);
      g.save(); g.clip(STRIP.path); g.clip(lit);
      g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 146, 0, 216, [[0, '#FFF6E4', 0.96], [0.5, '#FFFFFF', 1], [1, '#F6E2BC', 0.95]]); g.fillRect(-10, 0, 690, CH);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(170,150,120,0.22)'; g.fillRect(243, 140, 3, 80); g.fillRect(99, 140, 2, 80); g.fillRect(546, 150, 4, 70);
      g.strokeStyle = 'rgba(176,156,126,0.2)'; g.lineWidth = 1.4; for (let y = 156; y < 212; y += 10) { g.beginPath(); g.moveTo(470, y); g.lineTo(666, y + 4); g.stroke(); }
      g.restore();
      g.drawImage(_mbits.shadow, 0, 0);
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 116, 0, 250, [[0, '#E8C890', 0], [0.42, '#E8C890', 0.14], [0.58, '#E8C890', 0.14], [1, '#E8C890', 0]]); g.fillRect(0, 116, 660, 134); g.restore();
      g.drawImage(_mbits.motes, 0, 0);
      g.save(); g.clip(STRIP.path); g.fillStyle = LC.lin(g, 648, 0, 676, 0, [[0, '#FFF6E6', 0], [1, '#355150', 0.65]]); g.fillRect(648, 150, 28, 80); g.restore();
    }
  }
  const VIEWS_OUT = {};
  VIEWS_OUT.pov = povView();

  // =================================================================================================================
  // 8. INTERIOR · DASH: the dashboard's centre from the driver's seat, the windscreen above it. The clock sits in the top of
  //    the dash; its digits float in the glass (8:32 in Q07), doubled faintly by the glass's two faces. s.lit wakes the
  //    dashboard (the engine starting). The road beyond is out of focus (SETS.roads' street, if loaded).
  // =================================================================================================================
  const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
  function segDigits(g, txt, x, y, h, col, alpha, skew) {
    const w = h * 0.52, t = h * 0.13, k = skew || 0.08; g.save(); g.fillStyle = col; g.globalAlpha *= alpha;
    let cx = x; const seg = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * t / 2, ny = dx / l * t / 2, ux = dx / l * t * 0.45, uy = dy / l * t * 0.45;
      g.beginPath(); g.moveTo(x0 + ux, y0 + uy); g.lineTo(x0 + ux * 2 + nx, y0 + uy * 2 + ny); g.lineTo(x1 - ux * 2 + nx, y1 - uy * 2 + ny); g.lineTo(x1 - ux, y1 - uy); g.lineTo(x1 - ux * 2 - nx, y1 - uy * 2 - ny); g.lineTo(x0 + ux * 2 - nx, y0 + uy * 2 - ny); g.closePath(); g.fill(); };
    for (const ch of txt) {
      if (ch === ':') { [0.32, 0.68].forEach(v => { g.beginPath(); g.arc(cx + w * 0.18 - (v - 0.5) * h * k, y + h * v, t * 0.55, 0, TAU); g.fill(); }); cx += w * 0.42; continue; }
      const on = SEG[ch] || ''; const P2 = (u, v) => [cx + u * w - (v - 0.5) * h * k, y + v * h];
      const S2 = { a: [P2(0, 0), P2(1, 0)], b: [P2(1, 0), P2(1, 0.5)], c: [P2(1, 0.5), P2(1, 1)], d: [P2(0, 1), P2(1, 1)], e: [P2(0, 0.5), P2(0, 1)], f: [P2(0, 0), P2(0, 0.5)], g: [P2(0, 0.5), P2(1, 0.5)] };
      for (const sname of on) { const q = S2[sname]; seg(q[0][0], q[0][1], q[1][0], q[1][1]); }
      cx += w * 1.32;
    }
    g.restore(); return cx;
  }
  function softRoad(c, s, key, o) {
    // the road beyond the glass, far out of focus: SETS.roads' street at quarter size (or a plain gradient before roads loads)
    const R = window.SETS && SETS.roads, sc = 0.25, w = W * sc, h = H * sc;
    const lay = _scratch('car:softroad', w, h);
    if (R && R.street) R.street(lay, Object.assign({ tod: s.tod || 'morning', beat: s.beat || 'quiet', travel: s.travel || 0, t: s.t || 0 }, o.street || {}), { scale: sc, cy: o.cy || 300, f: o.f || 1000 });
    else { lay.fillStyle = LC.lin(lay, 0, 0, 0, h, [[0, '#E6E2D2'], [0.45, '#CFCDB8'], [0.5, '#8A8E86'], [1, '#6A6E68']]); lay.fillRect(0, 0, w, h); }
    const soft = _scratch('car:softroad2', w, h); soft.filter = 'blur(' + (o.blur || 2) + 'px)'; soft.drawImage(lay.canvas, 0, 0); soft.filter = 'none';
    c.g.drawImage(soft.canvas, 0, 0, W, H);
  }
  const _scr = {};
  function _scratch(name, w, h) { w = Math.ceil(w); h = Math.ceil(h); let cv = _scr[name]; if (!cv || cv.width !== w || cv.height !== h) cv = _scr[name] = OTM.makeCanvas(w, h); const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }

  const DASH_GLASS = (() => { const p = new Path2D(); p.moveTo(0, 0); p.lineTo(W, 0); p.lineTo(W, 560); p.bezierCurveTo(1500, 600, 600, 610, 0, 590); p.closePath(); return p; })();
  function dashBase(g, tod) {
    const C = POV[tod] || POV.morning, rim = C.rim;
    // the dashboard's top, seen from above: its far edge meets the glass, a defroster grille along it, the clock's pod at the centre
    const top = new Path2D(); top.moveTo(0, 590); top.bezierCurveTo(600, 610, 1500, 600, W, 560); top.lineTo(W, H); top.lineTo(0, H); top.closePath();
    g.fillStyle = LC.lin(g, 0, 560, 0, H, [[0, C.dash[0]], [0.3, C.dash[1]], [1, C.dash[2]]]); g.fill(top);
    g.save(); g.clip(top); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 560, 0, 760, [[0, rim, 0.16], [1, rim, 0]]); g.fillRect(0, 560, W, 200); g.restore();
    for (let x = 140; x < 1780; x += 34) { const y = 640 + 0.000012 * (x - 960) * (x - 960); g.fillStyle = '#0A0B0A'; g.fill(LC.rrect(x, y, 16, 26, 3)); g.fillStyle = rgba(rim, 0.07); g.fillRect(x, y - 2, 16, 2); }
    // the clock's pod: a shallow hood, the display under it facing up into the glass
    g.fillStyle = '#0D0E0E'; g.fill(LC.rquad([[790, 752], [1130, 748], [1160, 830], [760, 836]], 18));
    g.fillStyle = '#060707'; g.fill(LC.rquad([[820, 770], [1100, 766], [1118, 806], [806, 810]], 8));
    // the binnacle's hood to the right, the centre vents low in the middle, the radio's top edge
    const bn = LC.smooth([[1340, H + 20], [1360, 720], [1480, 668], [1700, 650], [1880, 676], [1960, 760], [1960, H + 20]]); g.fillStyle = '#101110'; g.fill(bn); g.strokeStyle = rgba(rim, 0.12); g.lineWidth = 2.5; g.stroke(bn);
    [[700, 900], [990, 900]].forEach(([x, y]) => { g.fillStyle = '#0B0C0C'; g.fill(LC.rrect(x, y, 230, 120, 18)); g.fillStyle = '#151717'; for (let k = 0; k < 6; k++) g.fillRect(x + 16, y + 16 + k * 16, 198, 6); });
  }
  function dashView() {
    return {
      // s: { tod, lit 0..1, clock ('8:32'), travel, beat }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, lit = s.lit == null ? 1 : clamp(s.lit, 0, 1), C = POV[tod] || POV.morning;
        softRoad(c, Object.assign({ t }, s), 'dash', { cy: 300, f: 900, blur: 3.4 });
        // the glass: the dashboard ghosted in it, dust, glare
        g.drawImage(c.cache('car:dash:glass:' + tod, gg => {
          gg.save(); gg.clip(DASH_GLASS); gg.globalCompositeOperation = 'screen';
          gg.fillStyle = LC.lin(gg, 0, 360, 0, 600, [[0, '#D9D2C2', 0], [1, '#D9D2C2', 0.22]]); gg.fillRect(0, 360, W, 240);
          for (let x = 140; x < 1780; x += 34) { const y = 560 - 0.000012 * (x - 960) * (x - 960); gg.fillStyle = 'rgba(16,16,16,0.2)'; gg.fillRect(x, y - 34, 16, 24); }
          gg.restore();
          LC.glare(gg, DASH_GLASS, { x: 600, y: 200, angle: -0.95, color: C.rim, bands: [{ d: -160, w: 220, a: 0.05 }, { d: 10, w: 22, a: 0.08 }, { d: 420, w: 260, a: 0.035 }] });
          LC.specks(gg, DASH_GLASS, { x: 0, y: 0, w: W, h: 600 }, 'dashDust', { n: 700, color: '#FFF3DA', rMin: 0.5, rMax: 1.5, aMin: 0.06, aMax: 0.4, scratch: 0.12, near: { x: 520, y: 160, r: 700 } });
          dashBase(gg, tod);
        }), 0, 0);
        // the clock's digits floating in the glass, and their faint second image from the glass's inner face
        if (lit > 0.01) {
          const txt = s.clock || '8:32', H2 = 128, x0 = 960 - 160, y0 = 400;
          g.save(); g.clip(DASH_GLASS); g.globalCompositeOperation = 'screen';
          segDigits(g, txt, x0 + 5, y0 + 7, H2, '#B8D4D8', 0.18 * lit);
          segDigits(g, txt, x0, y0, H2, '#DCEAEA', 0.5 * lit);
          g.restore();
          c.em.save(); c.em.globalAlpha = 0.3 * lit; segDigits(c.em, txt, x0, y0, H2, '#CFE6E8', 1); c.em.restore();
          // the display itself, seen edge-on in its pod: a thin pale glow
          g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 768, 0, 808, [[0, '#CFE6E8', 0], [0.5, '#CFE6E8', 0.55 * lit], [1, '#CFE6E8', 0]]); g.fillRect(830, 772, 270, 34); g.restore();
          // the binnacle's lit edge
          g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = lit; g.fillStyle = LC.rad(g, 1660, 760, 10, 280, [[0, '#BFD4D8', 0.16], [1, '#BFD4D8', 0]]); g.fillRect(1380, 600, 560, 420); g.restore();
        }
      },
      front(c, t, s) { },
      anchors: { clock: [960, 464], display: [960, 788], binnacle: [1660, 760], vents: [920, 960] },
      light: { x: 520, y: 160, color: P.sunWhite },
    };
  }
  VIEWS_OUT.dash = dashView();

  // =================================================================================================================
  // 9. INTERIOR · CONSOLE: the centre stack close. The vents (they cough a weak breath of hot air: s.vents), the radio's
  //    display under its glass (s.radio dims it, s.volume is the bar Daniel turns down), the climate knobs. Evening copper
  //    lies across it from the low sun behind.
  // =================================================================================================================
  function consoleBase(g, tod) {
    const C = POV[tod] || POV.morning, rim = C.rim, ev = tod === 'evening' || tod === 'dusk';
    g.fillStyle = LC.lin(g, 0, 0, 0, H, [[0, '#1E1F1E'], [0.5, '#161716'], [1, '#0B0C0B']]); g.fillRect(0, 0, W, H);
    // the stack's bezel: a tall rounded panel, seen a little from the driver's side
    const bz = LC.rquad([[520, 40], [1460, 30], [1500, 1100], [480, 1100]], 40); g.fillStyle = '#121312'; g.fill(bz);
    g.strokeStyle = rgba(rim, 0.14); g.lineWidth = 3; g.stroke(bz);
    // two vents, slatted, with their thumbwheels
    [[600, 100, 380, 300], [1010, 96, 380, 300]].forEach(([x, y, w, h], i) => {
      g.fillStyle = '#070808'; g.fill(LC.rrect(x, y, w, h, 34));
      for (let k = 0; k < 7; k++) { const yy = y + 34 + k * 36; g.fillStyle = '#1C1E1E'; g.fill(LC.rrect(x + 18, yy, w - 36, 16, 6)); g.fillStyle = rgba(rim, 0.16); g.fillRect(x + 26, yy, w - 52, 2); }
      g.fillStyle = '#2A2D2E'; g.fill(LC.rrect(x + w / 2 - 22, y + h - 30, 44, 22, 8)); g.fillStyle = rgba(rim, 0.3); g.fillRect(x + w / 2 - 18, y + h - 30, 36, 2);
      g.strokeStyle = 'rgba(200,210,208,0.18)'; g.lineWidth = 3; g.stroke(LC.rrect(x, y, w, h, 34));
    });
    // the display's glass (its content is drawn live)
    g.fillStyle = '#050607'; g.fill(LC.rrect(640, 470, 720, 260, 22)); g.strokeStyle = 'rgba(200,210,208,0.22)'; g.lineWidth = 2.5; g.stroke(LC.rrect(640, 470, 720, 260, 22));
    // the knobs and the row of buttons; the hazard switch in the middle
    [[700, 860], [1300, 860]].forEach(([x, y], i) => { g.fillStyle = '#0B0C0C'; g.beginPath(); g.arc(x, y, 92, 0, TAU); g.fill(); g.fillStyle = '#232525'; g.beginPath(); g.arc(x, y, 74, 0, TAU); g.fill();
      for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.fillStyle = '#2E3131'; g.fillRect(x + Math.cos(a) * 66 - 2, y + Math.sin(a) * 66 - 2, 4, 4); }
      g.strokeStyle = i ? 'rgba(200,80,60,0.6)' : 'rgba(80,130,200,0.6)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 100, Math.PI * 0.75, Math.PI * (i ? 1.45 : 1.3)); g.stroke();
      g.fillStyle = rgba(rim, 0.28); g.beginPath(); g.arc(x, y, 74, Math.PI * 1.1, Math.PI * 1.6); g.arc(x, y, 70, Math.PI * 1.6, Math.PI * 1.1, true); g.fill(); });
    for (let k = 0; k < 5; k++) { const x = 840 + k * 66; g.fillStyle = '#0D0E0E'; g.fill(LC.rrect(x, 800, 56, 40, 8)); g.fillStyle = '#1C1E1E'; g.fill(LC.rrect(x + 3, 803, 50, 34, 6)); }
    g.fillStyle = '#5A1C18'; g.beginPath(); g.moveTo(1000, 806); g.lineTo(1016, 832); g.lineTo(984, 832); g.closePath(); g.fill();
    // the light across it: the low sun from behind through the side glass, a raking copper band; at noon a pale one
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 1500, 0, 300, 1100, [[0, rim, 0], [0.42, rim, 0], [0.47, rim, ev ? 0.22 : 0.12], [0.62, rim, ev ? 0.18 : 0.08], [0.66, rim, 0], [1, rim, 0]]); g.fillRect(0, 0, W, H); g.restore();
  }
  function consoleView() {
    return {
      // s: { tod, radio 0..1 (the display's brightness), volume 0..1, vents 0..1 (hot air), freq ('98.4'), t }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'evening', g = c.g, C = POV[tod] || POV.morning, radio = s.radio == null ? 1 : clamp(s.radio, 0, 1), vol = s.volume == null ? 0.5 : clamp(s.volume, 0, 1);
        g.drawImage(c.cache('car:console:' + tod, gg => consoleBase(gg, tod)), 0, 0);
        // the display: frequency, band, the volume bar
        if (radio > 0.01) {
          g.save(); g.beginPath(); g.rect(650, 480, 700, 240); g.clip();
          g.fillStyle = rgba('#0E1A22', radio); g.fill(LC.rrect(640, 470, 720, 260, 22));
          g.globalAlpha = radio; g.fillStyle = '#9FC8D8'; g.font = '300 118px "Barlow Condensed"'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText(s.freq || '98.4', 1090, 640);
          g.font = '500 34px "Barlow Condensed"'; g.textAlign = 'left'; g.fillText('FM', 1110, 600); g.fillStyle = '#6E9AAA'; g.font = '400 26px "Barlow Condensed"'; g.fillText('MHz', 1110, 638);
          for (let k = 0; k < 12; k++) { const on = k < Math.round(vol * 12); g.fillStyle = on ? '#9FC8D8' : 'rgba(110,154,170,0.22)'; g.fillRect(720 + k * 22, 680 - k * 2.2, 14, 14 + k * 2.2); }
          g.restore();
          c.em.save(); c.em.globalAlpha = 0.35 * radio; c.em.fillStyle = '#9FC8D8'; c.em.fillRect(700, 540, 600, 120); c.em.restore();
        }
        // hot air: the vents breathe; the air in front of them ripples and a few motes are blown out
        const v = s.vents || 0; if (v > 0.01) {
          shimmer(g, { x: 560, y: 60, w: 880, h: 400 }, t, { amp: 3.2 * v, rise: 2.2, freq: 0.06, row: 2 });
          const R = OTM.rng('ventmotes'); g.save(); g.globalCompositeOperation = 'screen';
          for (let i = 0; i < 40; i++) { const ox = 600 + R() * 780, oy = 120 + R() * 260, sp = 60 + R() * 140, ph = R(); const u = ((t * 0.9 + ph) % 1); const x = ox + (R() - 0.5) * 40 * u, y = oy - u * sp * v; g.fillStyle = rgba(C.rim, (1 - u) * 0.5 * v); g.beginPath(); g.arc(x, y, 1 + R() * 1.5, 0, TAU); g.fill(); }
          g.restore();
        }
      },
      // the display's glass: the windscreen's light laid across it, a thumb's smudge
      front(c, t, s) {
        s = s || {}; const tod = s.tod || 'evening', g = c.g, C = POV[tod] || POV.morning;
        g.drawImage(c.cache('car:console:glass:' + tod, gg => { const p = LC.rrect(640, 470, 720, 260, 22);
          LC.glare(gg, p, { x: 900, y: 470, angle: -0.35, color: C.rim, bands: [{ d: 20, w: 70, a: 0.08 }, { d: 70, w: 10, a: 0.1 }] });
          gg.save(); gg.clip(p); LC.smudge(gg, 1180, 650, 60, 34, 0.4, 'thumb', '#FFFFFF', 0.08); gg.restore();
          LC.specks(gg, p, { x: 640, y: 470, w: 720, h: 260 }, 'dispDust', { n: 90, color: '#FFFFFF', rMin: 0.5, rMax: 1.1, aMin: 0.05, aMax: 0.2, scratch: 0.2 }); }), 0, 0);
      },
      anchors: { volumeKnob: [1300, 860], display: [1000, 600], vents: [[790, 250], [1200, 246]], hazard: [1000, 820] },
      light: { x: 1700, y: 120, color: P.copperHot },
    };
  }
  VIEWS_OUT.console = consoleView();

  // =================================================================================================================
  // 10. INTERIOR · WHEEL: the wheel close, from the driver's seat. The rim's upper left (where two fingers drum), its spoke,
  //     the instrument cluster's glass beyond it holding the windscreen's light, and the shadows of trees sliding across as
  //     the car goes (s.travel). The sleeve and hand are RIG's, placed at the anchors.
  // =================================================================================================================
  const WHEEL = { cx: 1250, cy: 1150, rx: 980, ry: 760, w: 150 };
  function wheelBase(g, tod) {
    const C = POV[tod] || POV.morning, rim = C.rim;
    // beyond the rim: the windscreen's corner (left transparent: the road shows there, out of focus); the binnacle and the cluster
    g.fillStyle = 'rgba(255,246,230,0.12)'; g.fillRect(0, 0, W, 360);
    g.fillStyle = LC.lin(g, 0, 330, 0, H, [[0, C.dash[0]], [0.4, C.dash[1]], [1, C.dash[2]]]); g.beginPath(); g.moveTo(0, 360); g.bezierCurveTo(600, 330, 1300, 320, W, 340); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // the cluster: two dials in a dark well, the needles, ticks
    g.fillStyle = '#070808'; g.fill(LC.rrect(500, 420, 1180, 520, 120));
    [[820, 690, 210], [1360, 690, 210]].forEach(([x, y, r], i) => {
      g.fillStyle = '#0D1011'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      for (let k = 0; k <= 40; k++) { const a = Math.PI * (0.75 + 1.5 * k / 40), L = k % 5 ? 12 : 26; g.strokeStyle = k % 5 ? 'rgba(200,214,212,0.4)' : 'rgba(220,232,230,0.75)'; g.lineWidth = k % 5 ? 2 : 3.5; g.beginPath(); g.moveTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14)); g.lineTo(x + Math.cos(a) * (r - 14 - L), y + Math.sin(a) * (r - 14 - L)); g.stroke(); }
      const na = Math.PI * (0.75 + 1.5 * (i ? 0.22 : 0.3)); g.strokeStyle = '#E8B070'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(na) * (r - 40), y + Math.sin(na) * (r - 40)); g.stroke();
      g.fillStyle = '#1A1C1C'; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill();
    });
    // the cluster's glass: the windscreen laid across it as one pale curved band; dust
    g.save(); g.clip(LC.rrect(500, 420, 1180, 520, 120)); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.lin(g, 0, 430, 0, 620, [[0, C.sky[2], 0.32], [1, C.sky[2], 0]]); g.beginPath(); g.ellipse(1090, 420, 700, 190, 0, 0, Math.PI); g.fill(); g.restore();
    LC.specks(g, LC.rrect(500, 420, 1180, 520, 120), { x: 500, y: 420, w: 1180, h: 520 }, 'clusterDust', { n: 160, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.05, aMax: 0.22, scratch: 0.15 });
    g.fillStyle = '#0E0F0E'; g.beginPath(); g.moveTo(420, 430); g.bezierCurveTo(700, 340, 1400, 330, 1760, 420); g.lineTo(1760, 400); g.bezierCurveTo(1400, 300, 700, 310, 420, 410); g.closePath(); g.fill();
  }
  function wheelRim(g, tod) {
    const C = POV[tod] || POV.morning, rim = C.rim, { cx, cy, rx, ry, w } = WHEEL;
    // the spoke to the hub (lower right), then the rim's arc across the frame: leather, its stitched seam, its lit top
    g.fillStyle = '#121313'; g.beginPath(); g.moveTo(cx - 520, cy - 420); g.lineTo(cx - 470, cy - 520); g.lineTo(cx + 40, cy - 200); g.lineTo(cx - 40, cy - 90); g.closePath(); g.fill();
    g.fillStyle = '#161818'; g.beginPath(); g.ellipse(cx, cy, 300, 240, 0, 0, TAU); g.fill();
    g.save(); g.lineCap = 'butt';
    g.strokeStyle = '#0B0C0C'; g.lineWidth = w; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.98, Math.PI * 1.62); g.stroke();
    g.strokeStyle = '#1A1C1C'; g.lineWidth = w * 0.42; g.beginPath(); g.ellipse(cx - 20, cy - 22, rx, ry, 0, Math.PI * 0.98, Math.PI * 1.62); g.stroke();
    g.strokeStyle = rgba(rim, 0.5); g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, rx + w * 0.38, ry + w * 0.38, 0, Math.PI * 1.02, Math.PI * 1.6); g.stroke();
    g.setLineDash([10, 12]); g.strokeStyle = 'rgba(160,170,168,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, rx - w * 0.18, ry - w * 0.18, 0, Math.PI * 1.0, Math.PI * 1.6); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  function wheelPt(a) { const { cx, cy, rx, ry } = WHEEL; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }
  function wheelView() {
    return {
      // s: { tod, travel (m: the light and the trees' shadows slide across), cluster 0..1 (lit) }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, C = POV[tod] || POV.morning;
        softRoad(c, Object.assign({ t }, s, { travel: (s.travel || 0) + 40 }), 'wheel', { cy: 120, f: 900, blur: 3 });
        g.drawImage(c.cache('car:wheel:base:' + tod, gg => wheelBase(gg, tod)), 0, 0);
        g.drawImage(c.cache('car:wheel:rim:' + tod, gg => wheelRim(gg, tod)), 0, 0);
        // the light through the windscreen across the wheel and the dash, broken by trees as we pass
        // the sun through the windscreen lies across the rim and the dash; trees passing overhead break it (s.travel)
        const tv = (s.travel || 0) * 0.16, k = clamp(0.25 + 1.6 * (OTM.fbm(tv, 3.1, 7, 3) - 0.35), 0, 1);
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = k;
        g.drawImage(c.cache('car:wheel:sun:' + tod, gg => { const C = POV[tod] || POV.morning; gg.fillStyle = LC.lin(gg, 0, 300, 600, 1080, [[0, C.rim, 0], [0.3, C.rim, 0.22], [0.55, C.rim, 0.1], [1, C.rim, 0]]); gg.beginPath(); gg.moveTo(0, 360); gg.lineTo(1100, 330); gg.lineTo(700, 1080); gg.lineTo(0, 1080); gg.closePath(); gg.fill();
          gg.strokeStyle = rgba(C.rim, 0.55); gg.lineWidth = 8; gg.beginPath(); gg.ellipse(WHEEL.cx, WHEEL.cy, WHEEL.rx + WHEEL.w * 0.36, WHEEL.ry + WHEEL.w * 0.36, 0, Math.PI * 1.02, Math.PI * 1.38); gg.stroke(); }), 0, 0);
        g.restore();

      },
      front(c, t, s) { },
      anchors: { rim10: wheelPt(Math.PI * 1.18), rim11: wheelPt(Math.PI * 1.3), rim12: wheelPt(Math.PI * 1.5), tangent10: [Math.cos(Math.PI * 1.18 + Math.PI / 2), Math.sin(Math.PI * 1.18 + Math.PI / 2)], sleeve: [260, 1000], ppm: 1700, centre: [WHEEL.cx, WHEEL.cy] },
      light: { x: 300, y: 80, color: P.sunWhite },
    };
  }
  VIEWS_OUT.wheel = wheelView();

  // =================================================================================================================
  // 11. EXTERIOR CLOSE · DRIVING: Daniel driving, seen through the driver's window from outside, the camera travelling
  //     alongside. The street on our side slides across the glass as reflection; the far side slides past the passenger
  //     window behind his head. RIG draws Daniel between back and front; front lays the glass on him and the door below it.
  //     s.close 0..1 frames tighter (his arm and the wheel, for the coffee on the sleeve). s.window 0..1 lowers the glass.
  // =================================================================================================================
  function drivingCam(close) {
    const d = lerp(2.55, 1.75, close), f = lerp(2150, 2500, close);
    return LC.camera({ x: d, y: lerp(1.2, 1.1, close), z: lerp(0.3, 0.42, close), yaw: -Math.PI / 2, pitch: lerp(-0.03, -0.1, close), f, cx: 960, cy: lerp(560, 470, close) });
  }
  // a passing street as cached strips, tileable and blurred by their speed: the houses across the road (far), the street's
  // trees and walls (mid), the lamp posts and the kerb (near). scroll is in metres travelled; pxm the far strip's px per metre.
  const STRIP_W = 2400;
  function stripCanvas(tod, layer, h) {
    const key = tod + ':' + layer + ':' + h; if (_strips[key]) return _strips[key];
    const C = (window.SETS && SETS.roads && SETS.roads.pal[tod]) || { sky: ['#D3D9D0', '#EDE7D6', '#FBF1DC'], haze: '#F1E9D6', brick: ['#8C6650', '#7A5A46', '#9A7258', '#86705C'], render: '#D6CFBC', roof: '#4A4E50', frame: '#E6E4DC', win: '#3C484A', winLit: '#BFC9C4', door: ['#2E4A52', '#5A2E2E', '#2E3A2E', '#E6E2D6'], hedge: '#4C6454', hedgeLit: '#6E8A70', tree: '#546E5C', treeLit: '#7C987C', trunk: '#3A3A34', post: '#474B4B', pave: '#ADADA2', kerb: '#D3D1C4', road: '#73756F', wall: '#7A6A5C' };
    const raw = OTM.makeCanvas(STRIP_W, h), g = raw.getContext('2d'), R = OTM.rng('strip' + layer);
    if (layer === 'far') {
      const k = h / 560, hz = h * 0.78;
      let x = -40; while (x < STRIP_W + 40) {
        const n = R() < 0.5 ? 2 : 1, w = (180 + R() * 70) * k, ht = (210 + R() * 40) * k, col = R() < 0.25 ? C.render : C.brick[R() * 4 | 0], hip = R() < 0.5;
        for (let i = 0; i < n; i++) { const xx = x + i * w; g.fillStyle = mix(col, C.haze, 0.3); g.fillRect(xx, hz - ht, w + 1, ht);
          for (const u of [0.22, 0.62]) { g.fillStyle = mix(C.frame, C.haze, 0.2); g.fillRect(xx + w * u, hz - ht * 0.82, w * 0.22, ht * 0.25); g.fillStyle = mix(C.win, C.haze, 0.35); g.fillRect(xx + w * u + 3 * k, hz - ht * 0.82 + 3 * k, w * 0.22 - 6 * k, ht * 0.25 - 6 * k);
            g.fillStyle = mix(C.frame, C.haze, 0.2); g.fillRect(xx + w * u, hz - ht * 0.42, w * 0.22, ht * 0.25); g.fillStyle = mix(C.win, C.haze, 0.35); g.fillRect(xx + w * u + 3 * k, hz - ht * 0.42 + 3 * k, w * 0.22 - 6 * k, ht * 0.25 - 6 * k); }
          g.fillStyle = mix(C.door[(i + n) & 3], C.haze, 0.25); g.fillRect(xx + (i ? w * 0.05 : w * 0.83), hz - ht * 0.38, w * 0.12, ht * 0.38); }
        g.fillStyle = mix(C.roof, C.haze, 0.25); g.beginPath(); g.moveTo(x - 8 * k, hz - ht); if (hip) { g.lineTo(x + 60 * k, hz - ht - 80 * k); g.lineTo(x + n * w - 60 * k, hz - ht - 80 * k); } else { g.lineTo(x + n * w / 2, hz - ht - 100 * k); } g.lineTo(x + n * w + 8 * k, hz - ht); g.closePath(); g.fill();
        g.fillRect(x + n * w * 0.5 - 12 * k, hz - ht - (hip ? 104 : 96) * k, 24 * k, 40 * k);
        g.fillStyle = mix(R() < 0.5 ? C.hedge : C.wall, C.haze, 0.15); g.fillRect(x, hz - 34 * k, n * w, 34 * k);
        x += n * w + (14 + R() * 60) * k;
      }
      // street trees on the far pavement
      for (let i = 0; i < 5; i++) { const tx = 200 + i * 460 + R() * 120, ty = hz - 230 * k, r = (70 + R() * 30) * k; g.fillStyle = mix(C.trunk, C.haze, 0.2); g.fillRect(tx - 6 * k, ty, 12 * k, hz - ty); g.fillStyle = mix(C.tree, C.haze, 0.2); g.beginPath(); g.ellipse(tx, ty, r, r * 0.9, 0, 0, TAU); g.fill(); g.fillStyle = mix(C.treeLit, C.haze, 0.2); g.beginPath(); g.ellipse(tx - r * 0.3, ty - r * 0.35, r * 0.6, r * 0.45, 0, 0, TAU); g.fill(); }
      g.fillStyle = mix(C.pave, C.haze, 0.1); g.fillRect(0, hz, STRIP_W, h - hz); g.fillStyle = mix(C.kerb, C.haze, 0.1); g.fillRect(0, hz + 10 * k, STRIP_W, 6 * k);
      g.fillStyle = C.road; g.fillRect(0, hz + 16 * k, STRIP_W, h);
    } else {
      // near: lamp posts and a street tree's trunk, a parked car now and then, fast and blurred; transparent between
      for (let i = 0; i < 3; i++) { const x = 300 + i * 800 + R() * 200; g.fillStyle = C.post; g.fillRect(x, 0, 26, h); }

    }
    // motion blur along the strip (it only ever moves sideways): a few offset copies
    const c2 = OTM.makeCanvas(STRIP_W, h), g2 = c2.getContext('2d'), n2 = layer === 'far' ? 5 : 9, spread = layer === 'far' ? 10 : 70;
    for (let i = 0; i < n2; i++) { g2.globalAlpha = 1 / (i + 1); g2.drawImage(raw, -spread / 2 + spread * i / (n2 - 1), 0); g2.drawImage(raw, -spread / 2 + spread * i / (n2 - 1) + STRIP_W, 0); g2.drawImage(raw, -spread / 2 + spread * i / (n2 - 1) - STRIP_W, 0); }
    return (_strips[key] = c2);
  }
  const _strips = {};
  function streetStrip(g, box, travel, tod, o) {
    o = o || {}; const C = (window.SETS && SETS.roads && SETS.roads.pal[tod]) || null, sky = C ? C.sky : ['#D3D9D0', '#EDE7D6', '#FBF1DC'];
    g.fillStyle = LC.lin(g, 0, box.y, 0, box.y + box.h, [[0, sky[0]], [0.6, sky[1]], [1, sky[2]]]); g.fillRect(box.x, box.y, box.w, box.h);
    const pxm = (o.pxm || 60), h = Math.round(box.h * (o.farH || 0.9));
    const far = stripCanvas(tod, 'far', h), off = (((travel * pxm) % STRIP_W) + STRIP_W) % STRIP_W, y = box.y + box.h - h + (o.dy || 0);
    for (let x = box.x - off; x < box.x + box.w; x += STRIP_W) g.drawImage(far, x, y);
    if (o.near !== false) { const near = stripCanvas(tod, 'near', Math.round(box.h)), off2 = (((travel * pxm * 3.2) % STRIP_W) + STRIP_W) % STRIP_W; for (let x = box.x - off2; x < box.x + box.w; x += STRIP_W) g.drawImage(near, x, box.y); }
  }
  function drivingView() {
    return {
      // s: { tod, travel (m), close 0..1, window 0..1 (lowered), shake }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, close = clamp(s.close || 0, 0, 1), cam = drivingCam(close), travel = s.travel || 0;
        const T = todOf(tod);
        // the far side of the road, behind everything (seen past the car), then the car itself (cached: it holds still)
        const key = 'car:driving:' + tod + ':' + close.toFixed(2);
        streetStrip(g, { x: 0, y: 0, w: W, h: H * 0.62 }, travel, tod, { pxm: 70, near: false });
        g.fillStyle = (window.SETS && SETS.roads ? SETS.roads.pal[tod] || SETS.roads.pal.morning : { road: '#73756F' }).road; g.fillRect(0, H * 0.62 - 2, W, H * 0.4);
        const carC = c.cache(key, gg => { const info = exterior(gg, { cam, at: [0, 0, 0], heading: 0, tod, interior: false, shadow: false, reflect: 'black', rim: 0.5 }); carC_info[key] = info; });
        const info = carC_info[key]; this._info = info;
        g.drawImage(carC, 0, 0);
        const win = info && info.windows.find(w => w.name === 'winF'); this._win = win; if (!win) return;
        // inside the driver's window: the cabin's dark, the passenger window beyond with the far street sliding, the seat, the wheel
        g.save(); g.clip(win.path);
        g.fillStyle = '#0B0F11'; g.fillRect(win.pane.x - 10, win.pane.y - 10, win.pane.w + 20, win.pane.h + 20);
        const far = [[-0.72, 0.98, 0.98], [-0.72, 0.98, -0.06], [-0.62, 1.40, -0.06], [-0.62, 1.40, 0.30]].map(q => info.p(q));
        g.save(); g.clip(polyPath(far)); streetStrip(g, boxOf(far), travel + 13, tod, { pxm: 55 }); g.fillStyle = 'rgba(10,14,16,0.4)'; g.fill(polyPath(far)); g.restore();
        const seat = [[0.62, 0.55, -0.02], [0.62, 1.16, -0.10], [0.16, 1.16, -0.10], [0.16, 0.55, -0.02]].map(q => info.p(q)); g.fillStyle = '#161B1D'; g.fill(polyPath(seat));
        const hr = [[0.55, 1.18, -0.12], [0.55, 1.38, -0.15], [0.24, 1.38, -0.15], [0.24, 1.18, -0.12]].map(q => info.p(q)); g.fillStyle = '#1A2022'; g.fill(LC.rquad(hr, 18));
        // the dash's end and the wheel in front of him
        const dash = [[0.80, 0.78, 0.95], [0.80, 1.0, 0.86], [-0.2, 1.0, 0.86], [-0.2, 0.78, 0.95]].map(q => info.p(q)); g.fillStyle = '#111516'; g.fill(polyPath(dash));
        const wc = [0.37, 0.93, 0.62]; const rimPts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; rimPts.push(info.p([wc[0] + Math.cos(a) * 0.19, wc[1] + Math.sin(a) * 0.19 * 0.92, wc[2] + Math.sin(a) * 0.19 * 0.38])); }
        g.strokeStyle = '#0A0D0E'; g.lineWidth = Math.max(4, info.ppm * 0.032); g.beginPath(); rimPts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        g.strokeStyle = rgba(T.rim, 0.3); g.lineWidth = 2; g.beginPath(); rimPts.slice(8, 20).forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        g.restore();
      },
      front(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, win = this._win, info = this._info, travel = s.travel || 0, T = todOf(tod); if (!win) return;
        const down = clamp(s.window || 0, 0, 1), b = win.pane;
        // the glass, from its lowered top edge down: our side of the street sliding across it, glare
        const glassClip = new Path2D(); glassClip.rect(b.x - 20, b.y + b.h * down, b.w + 40, b.h * (1 - down) + 20);
        g.save(); g.clip(win.path); g.clip(glassClip);
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.34;
        streetStrip(g, { x: b.x - 40, y: b.y - b.h * 0.3, w: b.w + 80, h: b.h * 1.5 }, travel + 31, tod, { pxm: 90 });
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(14,24,28,0.12)'; g.fillRect(b.x, b.y, b.w, b.h);
        LC.glare(g, null, { x: b.x + b.w * 0.4, y: b.y, angle: -1.05, color: T.rim, bands: [{ d: -b.w * 0.1, w: b.w * 0.14, a: 0.06 }, { d: b.w * 0.08, w: b.w * 0.02, a: 0.09 }] });
        if (down > 0.02) { g.strokeStyle = rgba(T.rim, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(b.x, b.y + b.h * down); g.lineTo(b.x + b.w, b.y + b.h * down); g.stroke(); }
        g.restore();
        // the rear glass beside him only reflects: our side of the street sliding across it
        (info.windows || []).filter(w => w.name === 'winR' || w.name === 'winQ').forEach(w => { g.save(); g.clip(w.path); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.7; streetStrip(g, { x: w.pane.x - 40, y: w.pane.y - w.pane.h * 0.3, w: w.pane.w + 80, h: w.pane.h * 1.5 }, travel + 31, tod, { pxm: 90 }); g.restore(); });
        // the door and the body round the window, in front of him (the cached car outside the pane)
        const key = 'car:driving:' + tod + ':' + clamp(s.close || 0, 0, 1).toFixed(2), carC = c.cache(key, () => {});
        g.save(); const outside = new Path2D(); outside.rect(0, 0, W, H); outside.addPath(win.path); g.clip(outside, 'evenodd'); g.drawImage(carC, 0, 0); g.restore();
      },
      get anchors() { const i = this._info; if (!i) return {}; return { head: i.p([0.38, 1.13, 0.12]), shoulder: i.p([0.40, 0.96, 0.10]), wheel: i.p([0.37, 0.93, 0.62]), sleeve: i.p([0.42, 0.88, 0.42]), window: this._win && this._win.pane, ppm: i.ppm, facing: 'right' }; },
      light: { x: 300, y: 100, color: P.sunWhite },
    };
  }
  const carC_info = {};
  VIEWS_OUT.driving = drivingView();

  // =================================================================================================================
  // 12. INTERIOR · PASSENGER: looking out of the front passenger window (the kerb side). The scenery slides past
  //     (s.outside(g, box, s) draws it; by default SETS.roads.pass, the street; roads' own view sets the nursery's wall).
  //     The door mirror, low in the glass's front corner, shows only the road behind.
  // =================================================================================================================
  const PW = (() => { const p = new Path2D(); p.moveTo(70, 150); p.lineTo(1660, 120); p.lineTo(1850, 640); p.lineTo(1840, 720); p.lineTo(60, 735); p.closePath(); return p; })();
  function passengerFrame(g, tod) {
    const C = POV[tod] || POV.morning, rim = C.rim;
    const out = new Path2D(); out.rect(0, 0, W, H); out.addPath(PW);
    g.save(); g.clip(out, 'evenodd');
    g.fillStyle = LC.lin(g, 0, 0, 0, 140, [[0, mix(C.head[0], '#000000', 0.2)], [1, C.head[1]]]); g.fillRect(0, 0, W, 160);
    g.fillStyle = LC.lin(g, 0, 700, 0, H, [[0, '#2A2C2A'], [0.12, '#1A1B1A'], [1, '#0B0C0B']]); g.fillRect(0, 700, W, H - 700);
    g.fillStyle = C.pillar[1]; g.beginPath(); g.moveTo(1660, 100); g.lineTo(W, 60); g.lineTo(W, 760); g.lineTo(1850, 730); g.lineTo(1850, 640); g.closePath(); g.fill();
    g.fillStyle = C.pillar[2]; g.fillRect(0, 120, 72, 640);
    g.restore();
    // the window's rubber seal and the sill's ledge catching the light
    g.strokeStyle = '#090A0A'; g.lineWidth = 14; g.stroke(PW);
    g.fillStyle = rgba(rim, 0.2); g.beginPath(); g.moveTo(60, 742); g.lineTo(1840, 727); g.lineTo(1840, 733); g.lineTo(60, 748); g.closePath(); g.fill();
    // the door card: armrest, the handle's recess, the pocket
    g.fillStyle = '#131414'; g.fill(LC.rrect(260, 830, 1100, 70, 20)); g.fillStyle = rgba(rim, 0.08); g.fillRect(280, 830, 1060, 3);
    g.fillStyle = '#070808'; g.fill(LC.rrect(1450, 800, 220, 60, 18)); g.fillStyle = '#2A2D2E'; g.fill(LC.rrect(1480, 815, 120, 22, 8));
  }
  function passengerView() {
    return {
      // s: { tod, travel (m), outside(g, box, s), mirror ('road', the only state) }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, box = { x: 50, y: 100, w: 1820, h: 660 };
        g.save(); g.clip(PW);
        const pass = s.outside || (window.SETS && SETS.roads && SETS.roads.pass);
        if (pass) pass(g, box, Object.assign({ tod, t }, s)); else streetStrip(g, box, s.travel || 0, tod, { pxm: 110, farH: 0.95 });
        g.restore();
      },
      front(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, C = POV[tod] || POV.morning;
        g.drawImage(c.cache('car:pass:glass:' + tod, gg => {
          gg.save(); gg.clip(PW); gg.globalCompositeOperation = 'screen';
          gg.fillStyle = LC.lin(gg, 0, 520, 0, 735, [[0, '#C9C4B6', 0], [1, '#C9C4B6', 0.14]]); gg.fillRect(0, 520, W, 220);
          gg.restore();
          LC.glare(gg, PW, { x: 900, y: 300, angle: -1.1, color: C.rim, bands: [{ d: -200, w: 200, a: 0.045 }, { d: 30, w: 20, a: 0.07 }] });
          LC.specks(gg, PW, { x: 60, y: 120, w: 1800, h: 620 }, 'passDust', { n: 360, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.26, scratch: 0.15 });
          gg.save(); gg.clip(PW); LC.smudge(gg, 380, 560, 90, 50, -0.3, 'passSmudge', '#FFFFFF', 0.07); gg.restore();
          passengerFrame(gg, tod);
        }), 0, 0);
        // the door mirror, outside in the glass's front corner: the road behind, nothing else
        const mq = { tl: [1450, 520], tr: [1720, 500], br: [1730, 650], bl: [1460, 660] }, L = SETS.car.lib, hous = lozenge(mq, 10), gl = lozenge(mq, 0);
        g.fillStyle = (todOf(tod)).paint.mid; g.fill(hous); g.save(); g.clip(gl); g.fillStyle = '#101414'; g.fillRect(1440, 490, 300, 180);
        g.drawImage(c.cache('car:pass:mirror:' + tod, gg => { gg.save(); gg.translate(1720 + 1440, 0); gg.scale(-1, 1); roadBehind(gg, 1440, 490, 300, 180, { tod }); gg.restore(); }), 0, 0);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(200,214,210,1)'; g.fillRect(1440, 490, 300, 180); g.restore();
        g.strokeStyle = 'rgba(255,248,232,0.4)'; g.lineWidth = 1.5; g.stroke(gl);
      },
      anchors: { window: { x: 60, y: 120, w: 1800, h: 615 }, mirror: [1590, 580], sill: [960, 740] },
      light: { x: 900, y: 120, color: P.sunWhite },
    };
  }
  VIEWS_OUT.passenger = passengerView();

  // =================================================================================================================
  // 13. EXTERIOR CLOSE · HOTWHEEL: through the windscreen from outside, the morning sun on the steering wheel (Q05). The
  //     glass gives back the sky and the house behind us across its top; below, where it reflects the house's dark windows and
  //     the hedge, we see in: the wheel (its top hot in the sun), the dash, the driver's seat. Heat rises off the bonnet.
  //     RIG's hand reaches in from the right (the open driver's door), between back and front.
  // =================================================================================================================
  function hotCam() { return LC.camera({ x: 0.5, y: 1.62, z: 2.2, yaw: Math.PI + 0.06, pitch: -0.36, f: 1650, cx: 960, cy: 400 }); }
  function hotView() {
    return {
      // s: { tod ('morning'), t, heat 0..1 }
      back(c, t, s) {
        s = s || {}; const tod = s.tod || 'morning', g = c.g, cam = hotCam();
        const key = 'car:hot:' + tod;
        const base = c.cache(key, gg => {
          // behind the car: the street's far side in the morning, soft
          gg.fillStyle = LC.lin(gg, 0, 0, 0, H, [[0, '#DCDDD0'], [0.5, '#EFE6D2'], [1, '#B9B6A6']]); gg.fillRect(0, 0, W, H);
          const info = exterior(gg, { cam, at: [0, 0, 0], heading: 0, tod, interior: false, rim: 0.6, sun: [0.3, 0.55, 0.78], reflect: 'black' });
          hot_info[key] = info;
          const ws = info.windows.find(w => w.name === 'windscreen');
          if (!ws) return;
          // the bonnet, near the lens: its paint gives back the bright sky in a long soft band, and it is out of focus
          { const bb = ws.box, y0 = bb.y + bb.h; gg.save(); gg.beginPath(); gg.rect(0, y0, W, H - y0); gg.clip(); gg.globalCompositeOperation = 'screen';
            gg.fillStyle = LC.lin(gg, 0, y0, 0, H, [[0, '#F2EAD6', 0.5], [0.3, '#E8DCC0', 0.18], [0.55, '#E8DCC0', 0.05], [1, '#E8DCC0', 0.2]]); gg.fillRect(0, y0, W, H - y0); gg.restore();
            const soft = LC.blurred(gg.canvas, 7); gg.save(); gg.beginPath(); gg.rect(0, y0 + 6, W, H); gg.clip(); gg.drawImage(soft, 0, 0); gg.restore(); }
          // inside, behind the glass: the dash, the binnacle, the driver's seat and headrest, the wheel (RHD: on the right)
          gg.save(); gg.clip(ws.path);
          gg.fillStyle = '#0B0E0F'; gg.fillRect(ws.box.x - 10, ws.box.y - 10, ws.box.w + 20, ws.box.h + 20);
          const P2 = q => info.p(q);
          // the morning sun comes in over our shoulder: the dash top, the seats' faces and the wheel take it; behind the seats, the dark
          const seat = [[0.62, 0.55, -0.02], [0.62, 1.16, -0.10], [0.14, 1.16, -0.10], [0.14, 0.55, -0.02]].map(P2); gg.fillStyle = '#3A3C3A'; gg.fill(polyPath(seat));
          const hr = [[0.52, 1.18, -0.12], [0.52, 1.38, -0.15], [0.22, 1.38, -0.15], [0.22, 1.18, -0.12]].map(P2); gg.fillStyle = '#444644'; gg.fill(LC.rquad(hr, 14));
          const pseat = [[-0.62, 0.55, -0.02], [-0.62, 1.16, -0.10], [-0.14, 1.16, -0.10], [-0.14, 0.55, -0.02]].map(P2); gg.fillStyle = '#323432'; gg.fill(polyPath(pseat));
          const phr = [[-0.52, 1.18, -0.12], [-0.52, 1.38, -0.15], [-0.22, 1.38, -0.15], [-0.22, 1.18, -0.12]].map(P2); gg.fillStyle = '#3C3E3C'; gg.fill(LC.rquad(phr, 14));
          const dash = [[0.86, 1.0, 1.05], [-0.86, 1.0, 1.05], [-0.86, 0.84, 0.72], [0.86, 0.84, 0.72]].map(P2); gg.fillStyle = '#5A564C'; gg.fill(polyPath(dash));
          gg.fillStyle = LC.lin(gg, 0, Math.min(...dash.map(q => q[1])), 0, Math.max(...dash.map(q => q[1])), [[0, '#C2B696', 0.75], [0.6, '#8A8270', 0.4], [1, '#5A564C', 0]]); gg.fill(polyPath(dash));
          const face = [[0.86, 0.84, 0.72], [-0.86, 0.84, 0.72], [-0.86, 0.55, 0.70], [0.86, 0.55, 0.70]].map(P2); gg.fillStyle = '#1E2020'; gg.fill(polyPath(face));
          // behind the front seats: nothing but the dark
          const bin = [[0.62, 0.9, 0.80], [0.12, 0.9, 0.80], [0.16, 1.0, 0.70], [0.58, 1.0, 0.70]].map(P2); gg.fillStyle = '#2A2A26'; gg.fill(polyPath(bin));
          gg.restore();
        });
        g.drawImage(base, 0, 0);
        const info = hot_info[key]; this._info = info; if (!info) return;
        const ws = info.windows.find(w => w.name === 'windscreen'); this._ws = ws;
        // the wheel, in the sun: a dark rim, its top burning white where the light lies on it
        const wc = [0.37, 0.93, 0.62]; const R = 0.19, pts = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU; pts.push(info.p([wc[0] + Math.cos(a) * R, wc[1] + Math.sin(a) * R * 0.92, wc[2] + Math.sin(a) * R * 0.38])); }
        g.save(); g.clip(ws.path);
        g.strokeStyle = '#141616'; g.lineWidth = Math.max(4, info.ppm * 0.034); g.lineCap = 'round'; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        g.strokeStyle = '#3A3C3A'; g.lineWidth = Math.max(2, info.ppm * 0.014); g.beginPath(); pts.slice(24, 48).forEach((q, i) => i ? g.lineTo(q[0], q[1] - info.ppm * 0.008) : g.moveTo(q[0], q[1] - info.ppm * 0.008)); g.stroke();
        const hub = info.p(wc); g.fillStyle = '#16191A'; g.beginPath(); g.ellipse(hub[0], hub[1], info.ppm * 0.07, info.ppm * 0.06, 0, 0, TAU); g.fill();
        g.strokeStyle = '#121414'; g.lineWidth = Math.max(3, info.ppm * 0.022); [Math.PI * 0.08, Math.PI * 0.92, Math.PI * 1.5].forEach(a => { const q = info.p([wc[0] + Math.cos(a) * R, wc[1] + Math.sin(a) * R * 0.92, wc[2] + Math.sin(a) * R * 0.38]); g.beginPath(); g.moveTo(hub[0], hub[1]); g.lineTo(q[0], q[1]); g.stroke(); });
        g.strokeStyle = '#FFF4DC'; g.lineWidth = Math.max(2, info.ppm * 0.012); g.beginPath(); pts.slice(30, 43).forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        c.em.save(); c.em.strokeStyle = '#FFF4DC'; c.em.lineWidth = info.ppm * 0.03; c.em.globalAlpha = 0.6; c.em.beginPath(); pts.slice(30, 43).forEach((q, i) => i ? c.em.lineTo(q[0], q[1]) : c.em.moveTo(q[0], q[1])); c.em.stroke(); c.em.restore();
        g.restore();
        this._wheel = { centre: [hub[0], hub[1]], top: pts[36], r: info.ppm * R };
      },
      // the windscreen's face: the sky and the house behind us across its top, glare, dust; heat off the bonnet in front
      front(c, t, s) {
        s = s || {}; const g = c.g, ws = this._ws, info = this._info; if (!ws) return;
        g.drawImage(c.cache('car:hot:glass', gg => {
          gg.save(); gg.clip(ws.path); gg.globalCompositeOperation = 'screen';
          const b = ws.box;
          gg.fillStyle = LC.lin(gg, 0, b.y, 0, b.y + b.h, [[0, '#F6EEDC', 0.9], [0.2, '#EFE4CC', 0.62], [0.3, '#C9A284', 0.34], [0.4, '#3A4446', 0.1], [0.75, '#1A2224', 0.03], [1, '#E8DCC0', 0.18]]); gg.fillRect(b.x, b.y, b.w, b.h);
          // the house behind us: its brick front and its dark windows laid across the glass's top
          gg.fillStyle = 'rgba(190,140,100,0.42)'; gg.fillRect(b.x, b.y + b.h * 0.2, b.w, b.h * 0.12);
          gg.fillStyle = 'rgba(20,30,32,0.0)'; gg.restore();
          gg.save(); gg.clip(ws.path); gg.globalCompositeOperation = 'multiply'; gg.fillStyle = 'rgba(40,50,52,0.6)'; [[0.12, 0.21], [0.46, 0.21], [0.74, 0.21]].forEach(([u, v]) => gg.fillRect(b.x + b.w * u, b.y + b.h * v, b.w * 0.12, b.h * 0.1)); gg.restore();
          LC.glare(gg, ws.path, { x: b.x + b.w * 0.3, y: b.y + b.h * 0.2, angle: -0.8, color: '#FFFFFF', bands: [{ d: -60, w: 120, a: 0.08 }, { d: 40, w: 14, a: 0.1 }, { d: 260, w: 160, a: 0.04 }] });
          LC.specks(gg, ws.path, b, 'hotDust', { n: 600, color: '#FFF3DA', rMin: 0.5, rMax: 1.6, aMin: 0.08, aMax: 0.45, scratch: 0.12, near: { x: b.x + b.w * 0.3, y: b.y + b.h * 0.2, r: 600 } });
        }), 0, 0);
        // heat off the bonnet: the air above it ripples
        if (s.heat !== 0) { const b = ws.box; shimmer(g, { x: b.x - 40, y: b.y + b.h * 0.55, w: b.w + 80, h: b.h * 0.5 }, t, { amp: 2.4 * (s.heat == null ? 1 : s.heat), rise: 1.4 }); }
      },
      get anchors() { const w = this._wheel; return w ? { wheel: w.centre, rimTop: w.top, rimR: w.r, ppm: this._info.ppm, handFrom: [1900, 700] } : {}; },
      light: { x: 1500, y: -200, color: P.sunWhite },
    };
  }
  const hot_info = {};
  VIEWS_OUT.hotwheel = hotView();

  // =================================================================================================================
  // 14. EXTERIOR CLOSE · BUCKLE: the rear door on the driver's side, from beside the car (Q05, morning only). With the door
  //     open we see Daniel bent into the doorway and the child seat inside (RIG draws them between back and front); as
  //     the door swings shut (s.door 1 -> 0) its glass sweeps the reflected house across itself, and once it is shut the
  //     privacy glass shows nothing but the house. After Q05 this view is not used.
  // =================================================================================================================
  function buckleCam(close) { const k = close == null ? 0.6 : close; return LC.camera({ x: lerp(2.9, 2.3, k), y: lerp(1.5, 1.42, k), z: lerp(1.25, 0.75, k), yaw: -Math.PI / 2 - lerp(0.62, 0.7, k), pitch: lerp(-0.1, -0.08, k), f: lerp(1500, 1900, k), cx: 960, cy: lerp(520, 470, k) }); }
  function buckleView() {
    return {
      // s: { door 0..1 (1 = open), t }
      back(c, t, s) {
        s = s || {}; const g = c.g, cam = buckleCam(s.close), door = clamp(s.door == null ? 1 : s.door, 0, 1);
        g.drawImage(c.cache('car:buckle:bg', gg => {
          // beyond the car: the driveway, the neighbour's hedge and the next house in the morning sun
          gg.fillStyle = LC.lin(gg, 0, 0, 0, 600, [[0, '#C9D2CC'], [1, '#EFE6D2']]); gg.fillRect(0, 0, W, H);
          gg.fillStyle = '#B98660'; gg.fillRect(0, 170, W, 360); gg.fillStyle = '#4A4F50'; gg.beginPath(); gg.moveTo(-50, 175); gg.lineTo(300, 60); gg.lineTo(1700, 60); gg.lineTo(1980, 175); gg.closePath(); gg.fill();
          [[120, 260], [620, 260], [1180, 260], [1560, 260]].forEach(([x, y]) => { gg.fillStyle = '#E8E2D2'; gg.fillRect(x, y, 220, 160); gg.fillStyle = '#5A6E70'; gg.fillRect(x + 10, y + 10, 95, 140); gg.fillRect(x + 115, y + 10, 95, 140); });
          gg.fillStyle = '#3E5446'; gg.fillRect(0, 470, W, 160); gg.fillStyle = '#4E6656'; for (let x = 0; x < W; x += 40) { gg.beginPath(); gg.arc(x, 476, 26, 0, TAU); gg.fill(); }
          gg.fillStyle = LC.lin(gg, 0, 600, 0, H, [[0, '#B8B0A0'], [1, '#8E8678']]); gg.fillRect(0, 600, W, H - 600);
          const R = OTM.rng('gravel'); for (let i = 0; i < 1600; i++) { gg.fillStyle = rgba(R() < 0.5 ? '#6E665A' : '#D6CEBE', 0.5); gg.fillRect(R() * W, 600 + Math.pow(R(), 0.8) * 480, 2 + R() * 3, 1.5 + R() * 2); }
        }), 0, 0);
        const info = exterior(g, { cam, at: [0, 0, 0], heading: 0, tod: 'morning', doors: { rear: door }, skip: ['doorRR'], sun: [-0.3, 0.6, 0.74], reflect: 'house', interior: false });
        this._info = info;
        // inside the open doorway (Q05 only): the child seat's side wing behind the driver, in the cabin's dark
        const ap = info.apertures && info.apertures.RR; this._ap = ap;
        if (ap && door > 0.05) {
          g.save(); g.clip(polyPath(ap)); g.fillStyle = '#0C1012'; g.fill(polyPath(ap));
          const sh = [[0.62, 0.62, -0.55], [0.62, 1.32, -0.58], [0.22, 1.36, -0.62], [0.18, 0.62, -0.58]].map(q => info.p(q)); g.fillStyle = '#1B2123'; g.fill(LC.rquad(sh, 22));
          const cu = [[0.58, 0.70, -0.50], [0.58, 1.22, -0.53], [0.26, 1.24, -0.56], [0.24, 0.70, -0.53]].map(q => info.p(q)); g.fillStyle = '#2E4646'; g.fill(LC.rquad(cu, 18));
          g.fillStyle = 'rgba(255,240,210,0.08)'; g.fill(polyPath(ap));
          g.restore();
        }
      },
      // the door, in front of whoever is in the doorway: its outer skin, the privacy glass giving back the house as it swings
      front(c, t, s) {
        s = s || {}; const g = c.g, cam = buckleCam(s.close), door = clamp(s.door == null ? 1 : s.door, 0, 1);
        exterior(g, { cam, at: [0, 0, 0], heading: 0, tod: 'morning', doors: { rear: door }, only: ['doorRR'], sun: [-0.3, 0.6, 0.74], reflect: 'house', reflectStrength: 0.62, seeThrough: door > 0.05 ? { rear: 0.5 } : null, interior: false });
      },
      get anchors() { const i = this._info; if (!i) return {}; return { doorway: i.p([0.9, 0.95, -0.55]), seat: i.p([0.4, 0.95, -0.55]), handle: i.points.handleRR, roof: i.p([0.7, 1.42, -0.55]), ppm: i.ppm }; },
      light: { x: 300, y: -100, color: P.sunWhite },
    };
  }
  VIEWS_OUT.buckle = buckleView();



  // a stand-in for Emily, for the demos only (the film draws her with RIG through s.inMirror): C2's sleeping girl, re-posable
  function demoEmily(g, M, o) {
    const S = (pts, col) => { g.fillStyle = col; g.fill(LC.smooth(pts)); };
    const hx = o.x, hy = o.y, sx = hx - 712;
    g.save(); g.translate(sx * 0.55, 0);
    S([[548, 340], [562, 280], [604, 248], [676, 238], [758, 248], [800, 292], [806, 340]], '#7C6732');
    S([[562, 304], [598, 262], [628, 252], [606, 318], [592, 340], [554, 340]], '#957B3E');
    g.strokeStyle = '#151919'; g.lineWidth = 16; g.beginPath(); g.moveTo(626, 238); g.bezierCurveTo(636, 282, 650, 316, 660, 342); g.moveTo(754, 240); g.bezierCurveTo(744, 282, 734, 316, 726, 342); g.stroke();
    g.fillStyle = '#41494B'; g.fill(LC.rrect(664, 310, 52, 18, 3));
    S([[560, 342], [562, 292], [580, 264], [616, 256], [646, 270], [654, 304], [650, 342]], '#7A6B58');
    S([[566, 276], [566, 246], [580, 226], [606, 220], [632, 228], [644, 250], [640, 272], [618, 284], [586, 284]], '#8C7C68');
    S([[584, 230], [576, 206], [576, 178], [584, 160], [596, 158], [602, 182], [600, 228]], '#938570');
    S([[614, 230], [632, 216], [658, 212], [682, 220], [684, 230], [660, 234], [632, 240]], '#5F574A');
    g.fillStyle = '#120E0B'; g.beginPath(); g.arc(590, 246, 3.6, 0, TAU); g.arc(616, 244, 3.6, 0, TAU); g.fill();
    g.restore();
    g.save(); g.translate(hx, hy); g.rotate(o.rot == null ? 0.34 : o.rot);
    const face = LC.smooth([[-60, -4], [-56, -42], [-32, -64], [4, -70], [40, -60], [62, -28], [64, 8], [56, 38], [36, 60], [8, 70], [-22, 66], [-46, 48], [-58, 22]]);
    g.fillStyle = '#764D3D'; g.fill(face);
    g.save(); g.clip(face); g.fillStyle = LC.rad(g, -40, 10, 4, 80, [[0, '#94634E', 0.95], [0.55, '#8A5A47', 0.6], [1, '#764D3D', 0]]); g.fillRect(-90, -90, 180, 180); g.restore();
    const hair = LC.smooth([[-74, 6], [-78, -30], [-66, -72], [-38, -100], [4, -110], [46, -100], [74, -70], [82, -30], [76, 6], [64, -4], [54, -32], [26, -42], [-6, -46], [-36, -40], [-56, -22], [-66, -2]]);
    g.fillStyle = '#140F0C'; g.fill(hair); [[-74, -6, 11], [-78, -26, 12], [-74, -48, 12], [-64, -70, 13], [-46, -90, 14], [-22, -104, 14], [4, -110, 14], [30, -104, 13], [54, -92, 13], [72, -70, 12], [80, -46, 11], [82, -22, 10]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.strokeStyle = '#21130D'; g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); if (o.squint) { g.moveTo(-40, -2); g.quadraticCurveTo(-25, -6, -8, -1); g.moveTo(16, -4); g.quadraticCurveTo(30, -8, 44, -4); } else { g.moveTo(-41, -3); g.quadraticCurveTo(-25, 8, -8, 0); } g.stroke();
    g.fillStyle = '#5B342A'; g.beginPath(); g.moveTo(-18, 41); g.quadraticCurveTo(-8, 36, 4, 40); g.quadraticCurveTo(-6, 48, -18, 41); g.fill();
    g.restore();
  }

  // a stand-in for Daniel in profile, for the demos only (the film draws him with RIG)
  function demoDaniel(g, A, o) {
    o = o || {}; const h = A.head, k = A.ppm || 1000; if (!h) return;
    g.save(); g.translate(h[0], h[1]); g.scale(k / 1000, k / 1000);
    g.fillStyle = o.col || '#2A2420';
    g.fill(LC.smooth([[-150, 300], [-140, 160], [-90, 110], [-40, 96], [60, 100], [120, 150], [150, 300]]));
    g.fillStyle = '#9FB3BF'; g.fill(LC.smooth([[-150, 300], [-136, 170], [-80, 118], [-30, 104], [40, 108], [100, 150], [140, 300]]));
    g.fillStyle = '#9C6D55'; g.beginPath(); g.ellipse(0, 0, 70, 92, 0.1, 0, TAU); g.fill(); g.fillRect(-26, 60, 52, 60);
    g.fillStyle = '#15100D'; g.beginPath(); g.ellipse(-10, -40, 74, 62, 0.1, Math.PI, TAU); g.fill(); g.beginPath(); g.ellipse(-44, -10, 34, 50, 0, 0, TAU); g.fill();
    g.fillStyle = '#BE8C6C'; g.beginPath(); g.ellipse(60, 6, 14, 22, 0.2, 0, TAU); g.fill();
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
    { name: 'pov: the hard white strip across her face (Q05, a stand-in Emily)', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'morning', mirror: 'cabin', inMirror: (g, M) => demoEmily(g, M, { x: M.anchors.headStrip[0], y: M.anchors.headStrip[1], rot: 0.04, squint: true }) }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'pov: half gone behind the headrest (C2)', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'morning', mirror: 'cabin', inMirror: (g, M) => demoEmily(g, M, { x: 712, y: 188 }) }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'pov: gone (only the seat and the light)', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'morning', mirror: 'cabin', inMirror: (g, M) => demoEmily(g, M, { x: M.anchors.headGone[0], y: M.anchors.headGone[1], rot: 0.4 }) }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'pov: the mirror tilting to the traffic (tilt 0.45)', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'morning', tilt: 0.45, inMirror: (g, M) => demoEmily(g, M, { x: M.anchors.headGone[0], y: M.anchors.headGone[1], rot: 0.4 }) }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'pov: the road behind (the default), engine on', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'morning', dash: 1, vibrate: 0.5 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'pov: evening, the road behind', draw(c, t) { const v = VIEWS_OUT.pov, s = { tod: 'evening', dash: 0.6, travel: t * 9 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'dash: 8:32 in the windscreen (Q07)', draw(c, t) { const v = VIEWS_OUT.dash, s = { tod: 'morning', lit: 1, travel: 20 + t * 5 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'dash: the engine off, the clock dark (Q05)', draw(c, t) { const v = VIEWS_OUT.dash, s = { tod: 'morning', lit: 0, travel: 0 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'console: the vents cough hot air (Q10)', draw(c, t) { const v = VIEWS_OUT.console, s = { tod: 'evening', radio: 1, volume: 0.5, vents: 0.5 + 0.5 * Math.sin(t * 3) }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'console: the radio turned down, its display dimming (Q10)', draw(c, t) { const v = VIEWS_OUT.console, s = { tod: 'evening', radio: 0.4, volume: 0.25, vents: 0.15 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'wheel: the wheel close, the light sliding across (Q06)', draw(c, t) { const v = VIEWS_OUT.wheel, s = { tod: 'morning', travel: t * 9 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'driving: through the driver\'s window (Q06, stand-in Daniel)', draw(c, t) { const v = VIEWS_OUT.driving, s = { tod: 'morning', travel: t * 9 }; v.back(c, t, s); demoDaniel(c.g, v.anchors); v.front(c, t, s); } },
    { name: 'driving: close, his arm and the wheel (Q06 coffee)', draw(c, t) { const v = VIEWS_OUT.driving, s = { tod: 'morning', travel: t * 9, close: 1 }; v.back(c, t, s); demoDaniel(c.g, v.anchors); v.front(c, t, s); } },
    { name: 'driving: evening, the window lowered (Q10)', draw(c, t) { const v = VIEWS_OUT.driving, s = { tod: 'evening', travel: t * 7, window: 0.75 }; v.back(c, t, s); demoDaniel(c.g, v.anchors); v.front(c, t, s); } },
    { name: 'passenger: the street slipping past', draw(c, t) { const v = VIEWS_OUT.passenger, s = { tod: 'morning', travel: t * 9 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'hotwheel: the hot wheel through the windscreen (Q05)', draw(c, t) { const v = VIEWS_OUT.hotwheel, s = { tod: 'morning' }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'buckle: the rear door open, the seat inside (Q05)', draw(c, t) { const v = VIEWS_OUT.buckle, s = { door: 1 }; v.back(c, t, s); v.front(c, t, s); } },
    { name: 'buckle: the door swinging shut on the reflected house', draw(c, t) { const v = VIEWS_OUT.buckle, s = { door: 0.3 }; v.back(c, t, s); v.front(c, t, s); } },
  ];

  window.SETS = window.SETS || {};
  SETS.car = { _dev: { MODEL, DEC, PER, FEAT }, lib: { roadBehind, lozenge, povFrit, polyPath, hull, boxOf, area, POV, RB, streetStrip }, exterior, blink, shimmer, reflect: REFLECT, reflectCanvas, tod: TOD, model: { D, yTop, sidePt, endPt, ghPt }, views: VIEWS_OUT, demos: DEMOS };
})();
