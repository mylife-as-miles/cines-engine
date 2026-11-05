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
  // 1. LIGHT BY TIME OF DAY: paint values (three per surface plus the sky laid along the top), glass, rim
  // =================================================================================================================
  // sun: a world direction toward the sun (x right, y up, z away from the camera), the default when a host gives none
  const TOD = {
    dawn:      { sun: [-0.5, 0.12, 0.86], rim: '#C9D6D6', sky: ['#3A4A52', '#7E8C8E', '#A9B4AE'], hz: '#1C2628', gnd: '#141A1B',
                 paint: { dark: '#0F181A', mid: '#1C292C', light: '#33454A', top: '#4E5E62' }, refl: 'sky' },
    morning:   { sun: [-0.62, 0.42, 0.66], rim: '#FFE9C4', sky: ['#AEBFBD', '#DCDDD0', '#F2E8D2'], hz: '#55625D', gnd: '#3A3C36',
                 paint: { dark: '#162225', mid: '#2A3B3E', light: '#506A69', top: '#8C9E9A' }, refl: 'sky' },
    noon:      { sun: [0.18, 0.94, 0.28], rim: '#FFF6E6', sky: ['#E3E6DC', '#F3EEDF', '#FBF5E8'], hz: '#7A7F76', gnd: '#6E6A60',
                 paint: { dark: '#25302F', mid: '#3E4E4E', light: '#71847F', top: '#C4CEC7' }, refl: 'noon' },
    afternoon: { sun: [0.55, 0.62, -0.45], rim: '#F6E3BC', sky: ['#B9C6BF', '#E3DDC9', '#F1DFBC'], hz: '#5E625A', gnd: '#48443B',
                 paint: { dark: '#1A2527', mid: '#2E3E40', light: '#58706C', top: '#9AA79F' }, refl: 'sky' },
    evening:   { sun: [0.78, 0.2, -0.58], rim: '#F2A65E', sky: ['#7A5A50', '#C27A4C', '#F0A462'], hz: '#3A2A28', gnd: '#2A2020',
                 paint: { dark: '#161A1C', mid: '#2A3132', light: '#5A5450', top: '#9A6B50' }, refl: 'copper' },
    dusk:      { sun: [0.15, 0.06, 1], rim: '#F2A35E', sky: ['#232D38', '#6A5A5C', '#E39A5C'], hz: '#2C2428', gnd: '#1E1A1E',
                 paint: { dark: '#0B1013', mid: '#162026', light: '#2E3844', top: '#4E5060' }, refl: 'dusk' },
    night:     { sun: [0.0, 0.5, -1], rim: '#8FA3B0', sky: ['#0D141A', '#18222A', '#232F36'], hz: '#0A0E10', gnd: '#08090A',
                 paint: { dark: '#07090A', mid: '#0E1416', light: '#1C2628', top: '#26323A' }, refl: 'sky' },
  };
  const todOf = s => TOD[(s && s.tod) || s] || TOD.morning;

  // =================================================================================================================
  // 2. THE MODEL, in car space (metres): x = the car's right (the driver's side), y = up, z = forward. Ground at y = 0,
  //    the origin under the middle of the car. About 4.08 m long, 1.78 m wide, 1.47 m high, wheelbase 2.62 m.
  // =================================================================================================================
  const D = { zF: 1.30, zR: -1.32, wr: 0.315, rimR: 0.21, wo: 0.85, wi: 0.65, archR: 0.378, archY: 0.33, archHalf: 0.355,
    hingeF: 0.93, shutF: -0.05, hingeR: -0.05, shutR: -1.0, beltX: 0.84, railX: 0.695, railY: 1.415, sideX: 0.89 };
  // the top of the lower body along z: tail shoulder, beltline (rising a little toward the C-pillar), wing tops falling to the nose
  function yTop(z) {
    if (z <= -1.74) return lerp(1.0, 1.04, smooth01((z + 2.0) / 0.26));
    if (z <= -1.30) return lerp(1.04, 1.028, (z + 1.74) / 0.44);
    if (z <= 1.04) return lerp(1.028, 0.985, (z + 1.30) / 2.34);
    return 0.985 - 0.215 * Math.pow(clamp((z - 1.04) / 0.82, 0, 1), 1.55);
  }
  // cross-section rows of the lower body [height, inset along the outward plan normal] for the tail (k=-1), side (0), nose (1)
  const ROWS = {
    tail: [[0.25, 0.055], [0.40, 0.0], [0.64, 0.008], [1.0, 0.06]],
    side: [[0.20, 0.034], [0.34, 0.006], [0.80, 0.0], [null, 0.05]],
    nose: [[0.22, 0.075], [0.38, 0.0], [0.57, 0.012], [0.745, 0.15]],
  };
  const archAt = z => { for (const za of [D.zF, D.zR]) { const d = z - za; if (Math.abs(d) <= D.archHalf) return D.archY + Math.sqrt(D.archR * D.archR - d * d); } return null; };
  // the plan outline of the right half, from the middle of the tail round the right side to the middle of the nose
  const PER = (() => {
    const pts = [[0, -2.0, -1], [0.36, -1.996, -1], [0.62, -1.978, -1], [0.79, -1.925, -0.62], [0.868, -1.835, -0.24]];
    const zs = [-1.75, D.shutR, D.shutF, -0.5, 0.4, D.hingeF, 1.76, 1.845];
    [D.zR, D.zF].forEach(za => { zs.push(za - D.archHalf - 0.002, za + D.archHalf + 0.002); for (let i = 0; i <= 12; i++) zs.push(za - D.archHalf + 2 * D.archHalf * i / 12); });
    zs.sort((a, b) => a - b).filter((z, i, a) => i === 0 || z - a[i - 1] > 0.0015).forEach(z => pts.push([D.sideX - 0.012 * smooth01((z - 1.72) / 0.13) - 0.01 * smooth01((-1.66 - z) / 0.1), z, 0]));
    [[0.884, 1.90, 0.22], [0.842, 1.975, 0.55], [0.71, 2.036, 0.9], [0.40, 2.068, 1], [0, 2.075, 1]].forEach(a => pts.push(a));
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const k = p[2], z = p[1];
      const side = ROWS.side.map(r => [r[0] == null ? yTop(z) : r[0], r[1]]);
      let rows = side; if (k) { const e = k < 0 ? ROWS.tail : ROWS.nose, u = Math.abs(k); rows = side.map((r, j) => [lerp(r[0], e[j][0], u), lerp(r[1], e[j][1], u)]); }
      if (!k) { const ay = archAt(z); if (ay != null) { rows = rows.map(r => r.slice()); rows[0] = [ay, 0.012]; rows[1] = [Math.max(rows[1][0], ay + 0.035), 0.004]; } }
      return { x: p[0], z, k, nx: tz, nz: -tx, rows };
    });
  })();
  const perPt = (q, r) => [q.x - q.nx * q.rows[r][1], q.rows[r][0], q.z - q.nz * q.rows[r][1]];

  // ---- faces ----
  // outward normal from the winding (vertices counter-clockwise seen from outside); a hint fixes the winding if it is reversed
  function newell(pts) { let nx = 0, ny = 0, nz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); } const l = Math.hypot(nx, ny, nz) || 1; return [-nx / l, -ny / l, -nz / l]; }
  function face(pts, hint, props) { let n = newell(pts); if (hint && n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { pts = pts.slice().reverse(); n = n.map(v => -v); } return Object.assign({ pts, n }, props); }
  const mirP = p => [-p[0], p[1], p[2]];
  const mirDoor = d => d ? d.slice(0, 1) + 'L' : null;
  function mirFace(f) { return Object.assign({}, f, { pts: f.pts.map(mirP).reverse(), n: [-f.n[0], f.n[1], f.n[2]], side: 'L', door: mirDoor(f.door) }); }

  // the greenhouse side surface (between the beltline and the roof rail): S(z, v), v = 0 at the belt, 1 at the rail
  const ghPt = (z, v) => { const yb = yTop(z), xb = D.beltX - 0.012 * smooth01((-1.66 - z) / 0.1); return [lerp(xb, D.railX, v), lerp(yb, D.railY, v), z]; };
  const aLine = v => 1.04 - 0.70 * v;          // the A-pillar's foot is at z 1.04 on the belt, its head at z 0.34 on the rail
  const cLine = v => -1.76 + 0.20 * v;         // the C-pillar's rear edge, meeting the tailgate
  const ghPoly = zv => zv.map(q => ghPt(q[0], q[1]));
  // lower side surface at (z, y) on the right flank
  function sidePt(z, y) {
    let i = 5; while (i < PER.length - 2 && PER[i + 1].z < z) i++;
    const a = PER[i], b = PER[i + 1], u = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1);
    const ins = q => { const R = q.rows; if (y <= R[1][0]) return lerp(R[0][1], R[1][1], clamp((y - R[0][0]) / ((R[1][0] - R[0][0]) || 1), 0, 1)); if (y <= R[2][0]) return lerp(R[1][1], R[2][1], (y - R[1][0]) / (R[2][0] - R[1][0])); return lerp(R[2][1], R[3][1], clamp((y - R[2][0]) / ((R[3][0] - R[2][0]) || 1), 0, 1)); };
    const ia = ins(a), ib = ins(b); const x = lerp(a.x - a.nx * ia, b.x - b.nx * ib, u);
    return [x, y, z];
  }
  // nose (k > 0) and tail (k < 0) surface at (x, y); negative x mirrors onto the left half
  function endPt(which, x, y) {
    const sx = x < 0 ? -1 : 1, ax = Math.abs(x);
    const L = which === 'nose' ? PER.slice(PER.length - 8) : PER.slice(0, 6);
    const pts = which === 'nose' ? L.slice().reverse() : L;           // ordered by increasing x
    let i = 0; while (i < pts.length - 2 && pts[i + 1].x < ax) i++;
    const a = pts[i], b = pts[i + 1], u = clamp((ax - a.x) / ((b.x - a.x) || 1), 0, 1);
    const at = q => { const R = q.rows; let j = 0; while (j < 2 && y > R[j + 1][0]) j++; const t = clamp((y - R[j][0]) / ((R[j + 1][0] - R[j][0]) || 1), 0, 1); const ins = lerp(R[j][1], R[j + 1][1], t); return [q.x - q.nx * ins, q.z - q.nz * ins]; };
    const pa = at(a), pb = at(b); return [sx * lerp(pa[0], pb[0], u), y, lerp(pa[1], pb[1], u)];
  }

  const MODEL = (() => {
    const F = [];                 // right-half faces (mirrored afterwards)
    const C = [];                 // centred faces (both halves in one)
    // ---- lower body skirt: three bands (sill, door, shoulder) round the perimeter ----
    const doorOf = (za, zb) => { const lo = Math.min(za, zb), hi = Math.max(za, zb); if (lo >= D.shutR - 1e-4 && hi <= D.hingeR + 1e-4) return 'RR'; if (lo >= D.shutF - 1e-4 && hi <= D.hingeF + 1e-4) return 'FR'; return null; };
    for (let i = 0; i < PER.length - 1; i++) {
      const a = PER[i], b = PER[i + 1]; const hint = [(a.nx + b.nx) / 2, 0, (a.nz + b.nz) / 2];
      const region = (a.k + b.k) / 2 > 0.5 ? 'nose' : (a.k + b.k) / 2 < -0.5 ? 'tail' : (a.k || b.k) ? 'corner' : 'side';
      for (let r = 0; r < 3; r++) {
        const pts = [perPt(a, r), perPt(b, r), perPt(b, r + 1), perPt(a, r + 1)];
        const door = region === 'side' && r > 0 ? doorOf(a.z, b.z) : null;
        F.push(face(pts, hint, { kind: 'paint', band: ['sill', 'door', 'shoulder'][r], region, door, side: 'R' }));
      }
    }
    // ---- bonnet: two facets a side, crowned along the middle ----
    const top = PER.map(q => perPt(q, 3));
    const front = top.filter((q, i) => PER[i].z >= 1.06);
    const inner = [0.42, 0.993, 1.08];
    const noseIn = endPt('nose', 0.42, 0.745);
    F.push(face([inner].concat([[0.835, 0.985, 1.065]], front, [noseIn]), [0, 1, 0.2], { kind: 'paint', band: 'top', region: 'bonnet', side: 'R' }));
    C.push(face([[-0.42, 0.993, 1.08], inner, noseIn, endPt('nose', 0, 0.745), endPt('nose', -0.42, 0.745)].concat([]), [0, 1, 0.25], { kind: 'paint', band: 'top', region: 'bonnet' }));
    // ---- windscreen, roof, tailgate glass ----
    C.push(face([[-0.80, 0.99, 1.07], [0.80, 0.99, 1.07], [0.665, 1.425, 0.36], [-0.665, 1.425, 0.36]], [0, 0.6, 0.8], { kind: 'glass', glass: 'windscreen' }));
    C.push(face([[-0.40, 1.47, 0.35], [0.40, 1.47, 0.35], [0.40, 1.462, -1.59], [-0.40, 1.462, -1.59]], [0, 1, 0], { kind: 'paint', band: 'top', region: 'roof' }));
    F.push(face([[0.40, 1.47, 0.35], [0.695, 1.415, 0.34], [0.695, 1.415, -1.56], [0.40, 1.462, -1.59]], [0.3, 1, 0], { kind: 'paint', band: 'top', region: 'roof', side: 'R' }));
    C.push(face([[-0.60, 1.432, -1.60], [0.60, 1.432, -1.60], [0.73, 1.045, -1.86], [-0.73, 1.045, -1.86]], [0, 0.5, -1], { kind: 'glass', glass: 'tailgate' }));
    // the strips between the roof and the glass at front and back
    F.push(face([[0.40, 1.47, 0.35], [0.665, 1.425, 0.36], [0.695, 1.415, 0.34]], [0, 1, 0.3], { kind: 'paint', band: 'top', region: 'roof', side: 'R' }));
    F.push(face([[0.40, 1.462, -1.59], [0.695, 1.415, -1.56], [0.60, 1.432, -1.60]], [0, 1, -0.3], { kind: 'paint', band: 'top', region: 'roof', side: 'R' }));
    C.push(face([[-0.40, 1.462, -1.59], [0.40, 1.462, -1.59], [0.60, 1.432, -1.60], [-0.60, 1.432, -1.60]], [0, 1, -0.3], { kind: 'paint', band: 'top', region: 'roof' }));
    // ---- A- and C-pillar wraps ----
    F.push(face([[0.80, 0.99, 1.07], [0.665, 1.425, 0.36], [0.695, 1.415, 0.34], ghPt(aLine(0), 0)], [1, 0.3, 0.6], { kind: 'trim', region: 'apillar', side: 'R' }));
    F.push(face([[0.60, 1.432, -1.60], [0.73, 1.045, -1.86], ghPt(cLine(0), 0), ghPt(cLine(1), 1)], [1, 0.2, -1], { kind: 'paint', band: 'shoulder', region: 'cpillar', side: 'R' }));
    // ---- tail ledge under the tailgate glass ----
    const tailTop = top.filter((q, i) => PER[i].z <= -1.74 && PER[i].k <= 0);
    F.push(face([[0, 1.045, -1.86], [0.73, 1.045, -1.86], ghPt(cLine(0), 0)].concat(tailTop.slice().reverse()), [0, 1, -0.6], { kind: 'paint', band: 'shoulder', region: 'tail', side: 'R' }));
    // ---- greenhouse: front-door frame, rear-door frame, quarter (C-pillar) ----
    const GH = (zv, door, region) => F.push(face(ghPoly(zv), [1, 0.4, 0], { kind: 'paint', band: 'pillar', region, door, side: 'R', zv }));
    GH([[aLine(0), 0], [D.shutF, 0], [D.shutF, 1], [aLine(1), 1]], 'FR', 'ghF');
    GH([[D.hingeR, 0], [D.shutR, 0], [D.shutR + 0.03, 1], [D.hingeR, 1]], 'RR', 'ghR');
    GH([[D.shutR, 0], [cLine(0), 0], [cLine(1), 1], [D.shutR + 0.03, 1]], null, 'ghQ');

    const faces = F.concat(F.map(mirFace), C.map(f => Object.assign({ side: 'C' }, f)));
    return { faces };
  })();

  // ---- decals (on the skin; drawn after the body when their own winding faces the camera) ----
  const DEC = (() => {
    const R = [];               // right side (mirrored)
    const Cn = [];              // centred
    const gh = (zv, props) => R.push(face(ghPoly(zv), [1, 0.4, 0], props));
    // window frames (black trim), then the glass
    gh([[aLine(0.0) - 0.02, 0.0], [D.shutF, 0.0], [D.shutF, 1.0], [aLine(1.0) - 0.0, 1.0]], { kind: 'trim', door: 'FR', name: 'frameF' });
    gh([[D.hingeR, 0.0], [D.shutR, 0.0], [D.shutR + 0.03, 1.0], [D.hingeR, 1.0]], { kind: 'trim', door: 'RR', name: 'frameR' });
    gh([[D.shutR - 0.04, 0.02], [-1.43, 0.02], [-1.285, 0.95], [D.shutR - 0.02, 0.95]], { kind: 'trim', name: 'frameQ' });
    gh([[0.86, 0.035], [-0.02, 0.035], [-0.02, 0.925], [aLine(0.925) - 0.07, 0.925], [aLine(0.3) - 0.07, 0.3], [0.86, 0.3]], { kind: 'glass', glass: 'front', door: 'FR', name: 'winF' });
    gh([[-0.125, 0.035], [-0.955, 0.035], [-0.93, 0.925], [-0.125, 0.925]], { kind: 'glass', glass: 'rear', door: 'RR', name: 'winR' });
    gh([[-1.055, 0.045], [-1.395, 0.045], [-1.265, 0.915], [-1.055, 0.915]], { kind: 'glass', glass: 'rear', name: 'winQ' });
    // door handles (on the shoulder band) and shut lines are drawn as features (see feature lists below)
    // headlights: the main lens on the nose and its wrap round the corner
    const ep = (w, pts) => pts.map(q => endPt(w, q[0], q[1]));
    R.push(face(ep('nose', [[0.43, 0.615], [0.74, 0.62], [0.76, 0.70], [0.46, 0.712]]), [0, 0, 1], { kind: 'lamp', lamp: 'head', name: 'headF' }));
    R.push(face(ep('nose', [[0.74, 0.62], [0.865, 0.635], [0.875, 0.70], [0.76, 0.70]]), [0.6, 0, 0.8], { kind: 'lamp', lamp: 'head', name: 'headW' }));
    R.push(face(ep('nose', [[0.80, 0.635], [0.865, 0.638], [0.872, 0.664], [0.81, 0.662]]), [0.6, 0, 0.8], { kind: 'lamp', lamp: 'indF', name: 'indF' }));
    R.push(face(ep('nose', [[0.56, 0.30], [0.70, 0.30], [0.70, 0.35], [0.56, 0.35]]), [0, 0, 1], { kind: 'trim', name: 'fog' }));
    // tail lights: on the tailgate panel and round the corner onto the flank
    R.push(face(ep('tail', [[0.50, 0.82], [0.79, 0.80], [0.80, 0.98], [0.56, 0.985]]), [0, 0, -1], { kind: 'lamp', lamp: 'tail', name: 'tailB' }));
    R.push(face(ep('tail', [[0.79, 0.80], [0.868, 0.80], [0.868, 0.99], [0.80, 0.98]]), [0.6, 0, -0.8], { kind: 'lamp', lamp: 'tail', name: 'tailW' }));
    R.push(face(ep('tail', [[0.60, 0.835], [0.78, 0.83], [0.785, 0.875], [0.61, 0.878]]), [0, 0, -1], { kind: 'lamp', lamp: 'indR', name: 'indR' }));
    R.push(face(ep('tail', [[0.62, 0.43], [0.76, 0.43], [0.76, 0.46], [0.62, 0.46]]), [0, 0, -1], { kind: 'lamp', lamp: 'refl', name: 'reflR' }));
    // centred: grilles, plates, badges, the cowl
    const epc = (w, pts, hint, props) => Cn.push(face(ep(w, pts), hint, props));
    epc('nose', [[-0.40, 0.625], [0.40, 0.625], [0.42, 0.695], [-0.42, 0.695]], [0, 0, 1], { kind: 'trim', name: 'grilleU' });
    epc('nose', [[-0.52, 0.245], [0.52, 0.245], [0.56, 0.41], [-0.56, 0.41]], [0, 0, 1], { kind: 'trim', name: 'grilleL' });
    epc('nose', [[-0.26, 0.425], [0.26, 0.425], [0.26, 0.536], [-0.26, 0.536]], [0, 0, 1], { kind: 'plate', plate: 'front', name: 'plateF' });
    epc('tail', [[-0.27, 0.655], [0.27, 0.655], [0.27, 0.78], [-0.27, 0.78]], [0, 0, -1], { kind: 'trim', name: 'recess' });
    epc('tail', [[-0.26, 0.662], [0.26, 0.662], [0.26, 0.773], [-0.26, 0.773]], [0, 0, -1], { kind: 'plate', plate: 'rear', name: 'plateR' });
    epc('tail', [[-0.9, 0.255], [0.9, 0.255], [0.9, 0.30], [-0.9, 0.30]], [0, 0, -1], { kind: 'trim', name: 'diffuser' });
    epc('tail', [[0.28, 0.43], [0.40, 0.43], [0.40, 0.46], [0.28, 0.46]], [0, 0, -1], { kind: 'lamp', lamp: 'fogR', name: 'fogR' });
    Cn.push(face([[-0.80, 0.995, 1.075], [0.80, 0.995, 1.075], [0.79, 1.03, 1.02], [-0.79, 1.03, 1.02]], [0, 0.6, 0.8], { kind: 'trim', name: 'cowl' }));
    Cn.push(face([[-0.14, 1.426, -1.605], [0.14, 1.426, -1.605], [0.14, 1.405, -1.618], [-0.14, 1.405, -1.618]], [0, 0.5, -1], { kind: 'lamp', lamp: 'brake', name: 'chmsl' }));
    const decals = R.concat(R.map(f => Object.assign(mirFace(f), { name: f.name ? f.name.replace(/F$|R$|W$|Q$|B$/, m => m) + 'L' : f.name }), Cn.map(f => Object.assign({ side: 'C' }, f))));
    R.forEach(f => { f.side = 'R'; });
    return decals;
  })();

  // ---- features: lines on the skin (shut lines, the swage), the door handles, the mirrors, the wheels ----
  const FEAT = {
    // door shut lines (right side; z, y polylines on the lower skin and up the greenhouse)
    shut: [
      { door: 'FR', pts: [[D.hingeF, 0.34], [D.hingeF, 0.80], [D.hingeF + 0.06, 0.94], [aLine(0) - 0.02, yTop(aLine(0))]] },
      { door: 'FR', pts: [[D.shutF, 0.34], [D.shutF, yTop(D.shutF)]] },
      { door: null, pts: [[D.shutR, archAt(D.shutR) || 0.5], [D.shutR, yTop(D.shutR)]] },
      { door: 'FR', pts: [[D.hingeF, 0.34], [D.shutF, 0.34]] },
      { door: 'RR', pts: [[D.hingeR, 0.34], [-0.94, 0.34]] },
    ],
    handles: [{ door: 'FR', z0: 0.08, z1: 0.30, y: 0.875, name: 'handleF' }, { door: 'RR', z0: -0.86, z1: -0.65, y: 0.885, name: 'handleR' }],
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
  // 3. REFLECTIONS: what the glass gives back. Each is fn(g, win) drawn inside the window's clip (screen space).
  //    win = { name, glass ('windscreen'|'front'|'rear'|'tailgate'|'door'), path, box {x,y,w,h}, quad [tl,tr,br,bl],
  //            yaw (the glass's facing, radians: 0 = toward the camera), ppm (px per metre at the glass), tod, t, L }
  // =================================================================================================================
  function skyBand(g, b, cols, hzFrac) {
    const y0 = b.y, y1 = b.y + b.h, yh = y0 + b.h * hzFrac;
    g.fillStyle = LC.lin(g, 0, y0, 0, yh, [[0, cols[0]], [0.7, cols[1]], [1, cols[2]]]); g.fillRect(b.x - 4, y0 - 4, b.w + 8, yh - y0 + 5);
    return yh;
  }
  function skyline(g, b, yh, col, seed, shift, rough) {
    const R = OTM.rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(b.x - 10, b.y + b.h + 10); g.lineTo(b.x - 10, yh);
    const step = Math.max(6, b.w / 18), off = ((shift % 1) + 1) % 1 * step * 7;
    for (let x = b.x - 10 - off; x < b.x + b.w + step * 8; x += step) { const hh = b.h * (0.04 + (rough || 0.1) * OTM.vnoise(x * 0.013 + seed.length, 1.3, 5)) ; g.lineTo(x, yh - hh); g.lineTo(x + step * 0.9, yh - hh); }
    g.lineTo(b.x + b.w + 10, b.y + b.h + 10); g.closePath(); g.fill();
  }
  const REFLECT = {
    sky(g, w) { const T = w.T, b = w.box; const yh = skyBand(g, b, T.sky, w.hz); skyline(g, b, yh + 1, T.hz, 'skyline', w.yaw * 0.6, 0.12); g.fillStyle = T.gnd; g.fillRect(b.x - 4, yh + b.h * 0.08, b.w + 8, b.h); },
    noon(g, w) { const b = w.box, yh = skyBand(g, b, ['#E8E8DE', '#F6F1E4', '#FFF8EA'], w.hz); skyline(g, b, yh + 1, '#8A8C82', 'noonline', w.yaw * 0.6, 0.08); g.fillStyle = '#77736A'; g.fillRect(b.x - 4, yh + b.h * 0.06, b.w + 8, b.h); },
    copper(g, w) { const b = w.box, yh = skyBand(g, b, ['#8A5E4C', '#D98A50', '#F6B070'], w.hz);
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, b.x + b.w * (0.5 - w.yaw * 0.5), yh, 0, b.w * 0.7, [[0, '#FFD39A', 0.75], [0.4, '#F2A65E', 0.3], [1, '#F2A65E', 0]]); g.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); g.restore();
      skyline(g, b, yh + 1, '#3E2A26', 'copline', w.yaw * 0.6, 0.1); g.fillStyle = '#2A1E1E'; g.fillRect(b.x - 4, yh + b.h * 0.07, b.w + 8, b.h); },
    dusk(g, w) { const b = w.box, yh = skyBand(g, b, ['#2A3340', '#6A5A5C', '#D9925A'], w.hz); skyline(g, b, yh + 1, '#2C2428', 'duskline', w.yaw * 0.6, 0.1); g.fillStyle = '#1C1719'; g.fillRect(b.x - 4, yh + b.h * 0.06, b.w + 8, b.h); },
    building(g, w) { const T = w.T, b = w.box, yh = skyBand(g, b, T.sky, 0.3);
      const bx = b.x - b.w * 0.2 - w.yaw * b.w * 0.8, bw = b.w * 1.6, top = b.y + b.h * 0.22, bot = b.y + b.h * 0.78;
      g.fillStyle = mix(T.hz, '#6F8086', 0.45); g.fillRect(bx, top, bw, bot - top);
      const cw = Math.max(5, b.w / 9), rh = Math.max(4, b.h / 10); g.fillStyle = mix(T.sky[1], '#B8CACE', 0.5);
      for (let y = top + rh * 0.4; y < bot - rh * 0.5; y += rh) for (let x = bx + cw * 0.2; x < bx + bw; x += cw) g.fillRect(x, y, cw * 0.8, rh * 0.62);
      g.fillStyle = T.gnd; g.fillRect(b.x - 4, bot, b.w + 8, b.h); },
    house(g, w) { const T = w.T, b = w.box; skyBand(g, b, T.sky, 0.32);
      const hx = b.x - b.w * 0.1 - w.yaw * b.w * 0.9, hw = b.w * 1.3, top = b.y + b.h * 0.18, eave = b.y + b.h * 0.34, bot = b.y + b.h * 0.8;
      g.fillStyle = '#4A4F50'; g.beginPath(); g.moveTo(hx, eave); g.lineTo(hx + hw * 0.2, top); g.lineTo(hx + hw * 0.8, top); g.lineTo(hx + hw, eave); g.closePath(); g.fill();
      g.fillStyle = '#B98660'; g.fillRect(hx, eave, hw, bot - eave);
      g.fillStyle = '#E8E2D2'; [[0.12, 0.42], [0.62, 0.42]].forEach(([u, v]) => { g.fillRect(hx + hw * u, b.y + b.h * v, hw * 0.22, b.h * 0.17); });
      g.fillStyle = '#5A6E70'; [[0.12, 0.42], [0.62, 0.42]].forEach(([u, v]) => { g.fillRect(hx + hw * u + 2, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); g.fillRect(hx + hw * (u + 0.11) + 1, b.y + b.h * v + 2, hw * 0.1 - 2, b.h * 0.17 - 4); });
      g.fillStyle = '#1F3A3B'; g.fillRect(hx + hw * 0.42, b.y + b.h * 0.48, hw * 0.12, bot - b.y - b.h * 0.48);
      g.fillStyle = '#34463A'; g.fillRect(b.x - 4, bot - b.h * 0.06, b.w + 8, b.h * 0.1); g.fillStyle = T.gnd; g.fillRect(b.x - 4, bot + b.h * 0.04, b.w + 8, b.h); },
    trees(g, w) { const T = w.T, b = w.box, yh = skyBand(g, b, T.sky, w.hz + 0.05); skyline(g, b, yh, mix(T.hz, '#3E5048', 0.5), 'treeline', w.yaw * 0.6, 0.35); g.fillStyle = T.gnd; g.fillRect(b.x - 4, yh + b.h * 0.1, b.w + 8, b.h); },
    black(g, w) { },
  };
  // a canvas as a reflection: mirrored left-right, slid by the glass's facing
  function reflectCanvas(img) { return (g, w) => { const b = w.box, s = Math.max(b.w / img.width, b.h / img.height) * 1.25; const dw = img.width * s, dh = img.height * s; g.save(); g.translate(b.x + b.w / 2 - w.yaw * b.w * 0.6, b.y + b.h / 2); g.scale(-1, 1); g.drawImage(img, -dw / 2, -dh / 2, dw, dh); g.restore(); }; }

  // =================================================================================================================
  // 4. EXTERIOR
  // =================================================================================================================
  const VIEWS = { side: Math.PI / 2, front3q: Math.PI / 2 + 0.72, rear3q: Math.PI / 2 - 0.72, rear: 0, front: Math.PI, front3qWide: Math.PI / 2 + 1.0, rear3qWide: Math.PI / 2 - 1.0 };
  function headingOf(o) {
    if (o.heading != null) return o.heading;
    const base = VIEWS[o.view || 'side'] == null ? VIEWS.side : VIEWS[o.view || 'side'];
    const flip = (o.side || 'right') === 'left';
    return (o.view === 'rear' || o.view === 'front') ? base : (flip ? -base : base);
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

  // which parts to draw: opts.only / opts.skip, lists of 'body', 'wheels', 'glass', 'shadow', 'doorFR', 'doorRR', 'doorFL', 'doorRL', 'mirrors', 'rim'
  function want(o, part) { if (o.only) return o.only.indexOf(part) >= 0; if (o.skip) return o.skip.indexOf(part) < 0; return true; }

  function exterior(g, opts) {
    const o = Object.assign({}, opts || {});
    const T = todOf(o), pal = Object.assign({}, T.paint, o.paint || {});
    const cam = o.cam || simpleCam(o);
    const hd = headingOf(o), ch = Math.cos(hd), sh = Math.sin(hd), at = o.at || [0, 0, 0];
    const toW = p => [at[0] + p[0] * ch + p[2] * sh, at[1] + p[1], at[2] - p[0] * sh + p[2] * ch];
    const nW = n => [n[0] * ch + n[2] * sh, n[1], -n[0] * sh + n[2] * ch];
    const L = norm(o.sun || T.sun);
    const doors = Object.assign({ FR: 0, RR: 0, FL: 0, RL: 0 }, o.doors ? { FR: o.doors.driver || o.doors.FR || 0, RR: o.doors.rear || o.doors.RR || 0, FL: o.doors.passenger || o.doors.FL || 0, RL: o.doors.rearLeft || o.doors.RL || 0 } : {});
    const xf = {}; Object.keys(doors).forEach(k => { if (doors[k] > 0.001) xf[k] = doorXf(k, clamp(doors[k], 0, 1)); });
    const P3 = (p, door) => cam.p(toW(door && xf[door] ? xf[door](p) : p));
    const NW = (n, door) => nW(door && xf[door] ? rotN(door, clamp(doors[door], 0, 1), n) : n);
    const ppm = (() => { const a = cam.p(toW([0, 0.7, 0])), b = cam.p(toW([0, 1.7, 0])); return Math.abs(a[1] - b[1]); })();
    const lod = ppm < 60 ? 0 : ppm < 140 ? 1 : 2;
    const info = { ppm, cam, heading: hd, toWorld: toW, p: (pt, door) => P3(pt, door), points: {}, box: null, path: new Path2D() };
    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;

    // ---- shadow on the ground: the footprint, and the cast shadow stretched away from the sun ----
    if (want(o, 'shadow') && o.shadow !== false) {
      const foot = [], R = PER; for (let i = 0; i < R.length; i++) foot.push([R[i].x + R[i].nx * 0.05, 0, R[i].z + R[i].nz * 0.05]); for (let i = R.length - 1; i >= 0; i--) foot.push([-(R[i].x + R[i].nx * 0.05), 0, R[i].z + R[i].nz * 0.05]);
      const Lc = [L[0] * ch - L[2] * sh, L[1], L[0] * sh + L[2] * ch];       // the sun in car space
      const k = Math.min(3.2, 0.62 / Math.max(0.12, Lc[1])), ox = -Lc[0] * k, oz = -Lc[2] * k;
      const sc = o.shadowColor || '#081011', sa = o.shadowAlpha == null ? 0.62 : o.shadowAlpha;
      [[1.0, 0.35 * sa], [0.62, 0.35 * sa], [0.3, 0.45 * sa]].forEach(([f, a]) => { const pts = foot.map(q => P3([q[0] * (1 + 0.04 * f) + ox * f, 0, q[2] * (1 + 0.02 * f) + oz * f])); g.fillStyle = rgba(sc, a); g.fill(polyPath(pts)); });
      g.fillStyle = rgba(sc, Math.min(1, sa * 1.3)); g.fill(polyPath(foot.map(q => P3([q[0] * 0.96, 0, q[2] * 0.97]))));
    }

    // ---- which flank faces the camera ----
    const sideVis = s => { const a = P3([s * 0.89, 0.3, -1.0]), b = P3([s * 0.89, 0.3, 1.0]), c = P3([s * 0.89, 0.9, 0]); return area([a, b, c]) * s < 0; };
    const visR = sideVis(1), visL = sideVis(-1);
    const nearSide = visR ? 1 : visL ? -1 : 0;

    // ---- wheels ----
    const wheels = [[1, D.zF, 'FR'], [1, D.zR, 'RR'], [-1, D.zF, 'FL'], [-1, D.zR, 'RL']];
    const steer = o.steer || 0, spin = o.wheelRot || 0;
    function wheel(s, zc, nm) {
      const st = zc > 0 ? steer : 0, cs = Math.cos(st), sn = Math.sin(st);
      const W3 = (x, y, z) => { const dx = x, dz = z - zc; return P3([dx * cs + dz * sn, y, zc - dx * sn + dz * cs]); };
      const circ = (x, r, n) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push(W3(x, D.wr + Math.sin(a) * r, zc + Math.cos(a) * r)); } return out; };
      const N = lod ? 28 : 16, outer = circ(s * D.wo, D.wr, N), inner = circ(s * D.wi, D.wr, N);
      g.fillStyle = '#0E1213'; g.fill(polyPath(hull(outer.concat(inner))));
      const faceOut = area(outer) * s < 0;        // outer face toward the camera?
      if (!faceOut) { g.fillStyle = '#121617'; g.fill(polyPath(inner)); return; }
      g.fillStyle = '#1A2022'; g.fill(polyPath(outer));
      const lit = clamp(dot(NW([s, 0, 0]), L), -1, 1);
      const rimC = lit > 0.2 ? '#97A19E' : lit > -0.2 ? '#727C7A' : '#555E5D', rimD = lit > 0.2 ? '#5E6866' : '#3E4746';
      g.fillStyle = '#0B0E0F'; g.fill(polyPath(circ(s * (D.wo - 0.012), D.rimR, N)));
      if (lod) {
        g.fillStyle = rimC; g.fill(polyPath(circ(s * (D.wo - 0.012), D.rimR, N))); g.fillStyle = '#15191A'; g.fill(polyPath(circ(s * (D.wo - 0.014), D.rimR * 0.9, N)));
        g.fillStyle = rimC; for (let k = 0; k < 5; k++) { const a = spin + k / 5 * TAU, w = 0.13; const pts = [[0.045, a - 0.5], [D.rimR * 0.9, a - w], [D.rimR * 0.9, a + w], [0.045, a + 0.5]].map(([r, aa]) => W3(s * (D.wo - 0.015), D.wr + Math.sin(aa) * r, zc + Math.cos(aa) * r)); g.fill(polyPath(pts)); }
        g.fillStyle = rimD; g.fill(polyPath(circ(s * (D.wo - 0.01), 0.05, 12)));
      } else { g.fillStyle = rimD; g.fill(polyPath(circ(s * (D.wo - 0.012), D.rimR * 0.85, N))); }
    }
    const archClip = (s, zc) => { const pts = []; pts.push(P3([s * 0.9, -0.6, zc - D.archHalf])); for (let i = 0; i <= 16; i++) { const z = zc - D.archHalf + 2 * D.archHalf * i / 16; pts.push(P3([s * 0.9, archAt(z) - 0.01, z])); } pts.push(P3([s * 0.9, -0.6, zc + D.archHalf])); return polyPath(pts); };

    // far wheels first (only their bottoms show under the body)
    if (want(o, 'wheels')) wheels.forEach(([s, zc, nm]) => { if (s !== nearSide) wheel(s, zc, nm); });

    // ---- body faces, sorted far to near, back faces culled ----
    const list = [];
    const prep = (f, isDecal) => {
      if (f.door && !want(o, 'door' + f.door)) return; if (!f.door && !want(o, isDecal ? (f.kind === 'glass' ? 'glass' : 'body') : 'body')) return;
      const sp = f.pts.map(q => P3(q, f.door)); if (sp.some(q => q[2] < 0.05)) return;
      const a = area(sp); if (a >= -0.5) return;
      let d = 0; sp.forEach(q => { d += q[2]; }); list.push({ f, sp, d: d / sp.length, dec: isDecal });
    };
    MODEL.faces.forEach(f => prep(f, false));
    const doorFaces = list.filter(e => e.f.door && doors[e.f.door] > 0.001);
    const bodyList = list.filter(e => !(e.f.door && doors[e.f.door] > 0.001)).sort((a, b) => b.d - a.d);
    const shade = (f, door) => {
      const n = NW(f.n, door), up = n[1], lit = dot(n, L);
      if (f.kind === 'trim') return lit > 0.3 ? '#1E2426' : '#121618';
      if (f.band === 'top' || up > 0.66) return lit > 0.45 ? mix(pal.top, T.rim, 0.12) : pal.top;
      let v = lit > 0.38 ? 2 : lit > -0.02 ? 1 : 0;
      if (f.band === 'shoulder' && up > 0.08) v = Math.min(2, v + 1);
      if (f.band === 'sill') v = Math.max(0, v - 1);
      if (f.band === 'pillar') v = Math.min(v, 1);
      return [pal.dark, pal.mid, pal.light][v];
    };
    const drawFace = e => { const f = e.f; g.fillStyle = shade(f, f.door); const p = polyPath(e.sp); g.fill(p); g.strokeStyle = g.fillStyle; g.lineWidth = 0.8; g.stroke(p); info.path.addPath(p); };
    // the open doors' apertures: a dark void (the cabin is never lit enough to show)
    const aperture = (door) => {
      const s = DOOR[door].s, isF = door[0] === 'F';
      const z0 = isF ? D.hingeF : D.hingeR, z1 = isF ? D.shutF : D.shutR;
      const pts = [];
      pts.push([s * 0.885, 0.34, z0]);
      if (isF) { pts.push([s * 0.885, 0.34, z1]); pts.push(ghPt(z1, 1).map((v, i) => i ? v : s * v)); pts.push(ghPt(aLine(1), 1).map((v, i) => i ? v : s * v)); pts.push(ghPt(aLine(0), 0).map((v, i) => i ? v : s * v)); }
      else { pts.push([s * 0.885, 0.34, -0.94]); pts.push([s * 0.885, archAt(z1) || 0.54, z1]); pts.push(ghPt(z1 + 0.03, 1).map((v, i) => i ? v : s * v)); pts.push(ghPt(z0, 1).map((v, i) => i ? v : s * v)); }
      const sp = pts.map(q => P3(q)); g.fillStyle = '#060909'; g.fill(polyPath(sp));
      // the sill and the B-pillar's edge catch a little light; inside, nothing
      g.strokeStyle = rgba(pal.light, 0.5); g.lineWidth = Math.max(1, ppm * 0.012); g.beginPath(); const a = P3([s * 0.86, 0.36, z0]), b = P3([s * 0.86, 0.36, isF ? z1 : -0.94]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      if (isF && o.interior !== false) { const seat = [[0.55, 0.5, -0.05], [0.55, 1.25, -0.2], [0.55, 1.28, -0.32], [0.55, 0.5, -0.32]].map(q => P3([s * q[0], q[1], q[2]])); g.fillStyle = '#0E1314'; g.fill(polyPath(seat)); }
    };
    // ---- decals & features on the body ----
    const decList = []; DEC.forEach(f => { const before = list.length; prep(f, true); if (list.length > before) decList.push(list.pop()); });
    const glassWins = [];
    const reflectFn = gl => { const r = (o.glass && o.glass[gl]) || o.reflect || T.refl; return typeof r === 'function' ? r : (r && r.getContext) ? reflectCanvas(r) : (REFLECT[r] || REFLECT.sky); };
    const drawDecal = e => {
      const f = e.f, p = polyPath(e.sp);
      if (f.kind === 'trim') { g.fillStyle = '#0F1314'; g.fill(p); g.strokeStyle = '#0F1314'; g.lineWidth = 0.8; g.stroke(p); return; }
      if (f.kind === 'plate') { drawPlate(g, e.sp, f.plate, lod, T); return; }
      if (f.kind === 'lamp') { drawLamp(g, e.sp, f.lamp, o, T, lod); return; }
      if (f.kind === 'glass') { glassWins.push(e); drawGlass(e); }
    };
    function drawGlass(e) {
      const f = e.f, p = polyPath(e.sp), priv = f.glass === 'rear' || f.glass === 'tailgate';
      const xs = e.sp.map(q => q[0]), ys = e.sp.map(q => q[1]); const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      const n = NW(f.n, f.door); const yaw = Math.atan2(n[0], -n[2]);
      g.save(); g.clip(p);
      g.fillStyle = priv ? '#070B0C' : '#0F171A'; g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
      // the front glass lets a little of the cabin through: the front headrests, the wheel's rim; never anything behind them
      if (!priv && o.interior !== false && T !== TOD.night) {
        g.fillStyle = 'rgba(2,4,5,0.85)';
        [1, -1].forEach(s => { const hr = [[0.36, 1.12, -0.36], [0.36, 1.34, -0.40], [0.12, 1.34, -0.40], [0.12, 1.12, -0.36]].map(q => P3([s * (q[0] + 0.0) * 1 + s * 0.0 + (s > 0 ? 0.04 : -0.04), q[1], q[2]])); g.fill(polyPath(hull(hr))); });
        if (f.glass === 'windscreen') { const wc = [0.38, 1.0, 0.55]; const pts = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * i / 18; pts.push(P3([wc[0] + Math.cos(a) * 0.19, wc[1] + Math.sin(a) * 0.15, wc[2] - Math.sin(a) * 0.05])); } g.strokeStyle = 'rgba(2,4,5,0.9)'; g.lineWidth = Math.max(1, ppm * 0.03); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }
      }
      const win = { name: f.name || f.glass, glass: f.glass, path: p, box, quad: e.sp.slice(0, 4), yaw, ppm, T, tod: o.tod || 'morning', t: o.t || 0, L, hz: f.glass === 'tailgate' || f.glass === 'windscreen' ? 0.72 : 0.56, side: f.side, door: f.door, privacy: priv };
      g.globalCompositeOperation = 'screen'; g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (priv ? (o.reflectStrength == null ? 0.82 : o.reflectStrength) : (o.reflectStrength == null ? 0.66 : o.reflectStrength * 0.85));
      reflectFn(f.glass)(g, win);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.alpha == null ? 1 : o.alpha;
      // glare: one long soft band and a thin one, parallel, across all glass alike
      LC.glare(g, null, { x: box.x + box.w * 0.4, y: box.y + box.h * 0.5, angle: -1.0, color: T.rim, bands: [{ d: -box.h * 0.2 - box.w * 0.05, w: Math.max(8, box.w * 0.18), a: 0.05 }, { d: box.h * 0.1, w: Math.max(2, box.w * 0.025), a: 0.07 }] });
      g.restore();
      // the top edge of the glass catches the sky
      g.strokeStyle = rgba(T.rim, 0.22); g.lineWidth = Math.max(1, ppm * 0.006); g.beginPath(); const tl = e.sp[e.sp.length - 1], tr = e.sp[e.sp.length - 2]; g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.stroke();
      info.points[win.name] = [box.x + box.w / 2, box.y + box.h / 2]; info.points[win.name + 'Box'] = box;
    }
    // body
    bodyList.forEach(e => drawFace(e));
    // near arches: the liners' darkness, then the near wheels inside them
    if (nearSide && want(o, 'body')) [D.zF, D.zR].forEach(zc => { const pts = []; for (let i = 0; i <= 16; i++) { const z = zc - D.archHalf + 2 * D.archHalf * i / 16; pts.push(P3([nearSide * 0.885, archAt(z) - 0.004, z])); } pts.push(P3([nearSide * 0.885, 0.2, zc + D.archHalf])); pts.push(P3([nearSide * 0.885, 0.2, zc - D.archHalf])); g.fillStyle = '#070A0B'; g.fill(polyPath(pts)); });
    if (want(o, 'wheels') && nearSide) wheels.forEach(([s, zc, nm]) => { if (s === nearSide) { g.save(); g.clip(archClip(s, zc)); wheel(s, zc, nm); g.restore(); } });
    // apertures of open doors on the near side (drawn over the body, under the doors)
    Object.keys(xf).forEach(k => { if (DOOR[k].s === nearSide && want(o, 'body')) aperture(k); });
    // decals on the fixed body
    decList.filter(e => !(e.f.door && doors[e.f.door] > 0.001)).sort((a, b) => b.d - a.d).forEach(drawDecal);
    if (want(o, 'body')) drawFeatures(null);
    // mirrors: the far one is behind the body (skipped), the near one stands out from it
    if (want(o, 'mirrors') && nearSide) drawMirror(nearSide);
    // open doors last, each with its own decals and features
    Object.keys(xf).forEach(k => {
      if (!want(o, 'door' + k)) return;
      const fs = doorFaces.filter(e => e.f.door === k).sort((a, b) => b.d - a.d);
      // the door's inside: its trim panel, visible when the door is open toward us
      drawDoorInner(k);
      fs.forEach(drawFace);
      decList.filter(e => e.f.door === k).sort((a, b) => b.d - a.d).forEach(drawDecal);
      drawFeatures(k);
      if (k[0] === 'F' && DOOR[k].s === nearSide && want(o, 'mirrors')) { /* the mirror rides on the front door */ }
    });

    function drawFeatures(door) {
      const s0 = [1, -1];
      s0.forEach(s => {
        if (s !== nearSide) return;
        const dn = d => d ? (s > 0 ? d : mirDoor(d)) : null;
        const S = (z, y, d) => { const q = sidePt(z, y); return P3([s * q[0], q[1], q[2]], d); };
        // shut lines
        if (lod) FEAT.shut.forEach(sl => { const d = dn(sl.door); if ((d || null) !== door && !(door === null && d && !(doors[d] > 0.001))) return; const pts = sl.pts.map(q => S(q[0], q[1], d)); g.strokeStyle = 'rgba(4,7,8,0.75)'; g.lineWidth = Math.max(1, ppm * 0.007); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); });
        // handles: a dark recess and the handle's lit top
        FEAT.handles.forEach(h => {
          const d = dn(h.door); if (door !== null ? d !== door : (d && doors[d] > 0.001)) return;
          const a = S(h.z0, h.y + 0.02, d), b = S(h.z1, h.y + 0.02, d), c = S(h.z1, h.y - 0.025, d), e = S(h.z0, h.y - 0.025, d);
          g.fillStyle = 'rgba(3,5,6,0.8)'; g.fill(polyPath([a, b, c, e]));
          const a2 = S(h.z0 + 0.01, h.y + 0.012, d), b2 = S(h.z1 - 0.01, h.y + 0.012, d), c2 = S(h.z1 - 0.01, h.y - 0.012, d), e2 = S(h.z0 + 0.01, h.y - 0.012, d);
          g.fillStyle = pal.mid; g.fill(polyPath([a2, b2, c2, e2])); g.strokeStyle = rgba(T.rim, 0.45); g.lineWidth = Math.max(0.8, ppm * 0.004); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke();
          info.points[h.name + (s > 0 ? 'R' : 'L')] = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        });
        // the swage: a fine light line where the shoulder turns to the sky
        if (door === null && lod) { g.strokeStyle = rgba(T.rim, 0.16); g.lineWidth = Math.max(1, ppm * 0.005); g.beginPath(); for (let z = -1.7; z <= 1.75; z += 0.05) { if (doors[s > 0 ? 'FR' : 'FL'] > 0.001 && z > D.shutF && z < D.hingeF) { g.stroke(); g.beginPath(); continue; } if (doors[s > 0 ? 'RR' : 'RL'] > 0.001 && z > D.shutR && z < D.hingeR) { g.stroke(); g.beginPath(); continue; } const q = S(z, 0.80); if (z <= -1.7) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); } g.stroke(); }
      });
    }
    function drawMirror(s) {
      const d = s > 0 ? 'FR' : 'FL';
      const box3 = (x0, x1, y0, y1, z0, z1) => [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const B = box3(0.86, 1.06, 0.98, 1.11, 0.87, 0.975).map(q => [s * q[0], q[1], q[2]]);
      const Fq = [[0, 1, 2, 3, [0, 0, -1], 'glass'], [5, 4, 7, 6, [0, 0, 1], 'shell'], [4, 0, 3, 7, [-1, 0, 0], 'shell'], [1, 5, 6, 2, [1, 0, 0], 'shell'], [3, 2, 6, 7, [0, 1, 0], 'top'], [4, 5, 1, 0, [0, -1, 0], 'under']];
      const fs = Fq.map(q => { const pts = [B[q[0]], B[q[1]], B[q[2]], B[q[3]]]; return face(pts, [s * q[4][0], q[4][1], q[4][2]], { kind: q[5] }); });
      const arm = face([[s * 0.84, 0.99, 0.94], [s * 0.88, 0.99, 0.94], [s * 0.88, 1.04, 0.92], [s * 0.84, 1.04, 0.92]], [s, 0, 0], { kind: 'arm' });
      [arm].concat(fs).map(f => ({ f, sp: f.pts.map(q => P3(q, d)) })).filter(e => area(e.sp) < 0).sort((a, b) => b.sp.reduce((t, q) => t + q[2], 0) - a.sp.reduce((t, q) => t + q[2], 0)).forEach(e => {
        const k = e.f.kind;
        g.fillStyle = k === 'glass' ? '#0C1214' : k === 'arm' || k === 'under' ? '#0E1213' : shade({ n: e.f.n, band: k === 'top' ? 'top' : 'door', kind: 'paint' }, d); g.fill(polyPath(e.sp));
        if (k === 'glass') { g.save(); g.clip(polyPath(e.sp)); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.6; const xs = e.sp.map(q => q[0]), ys = e.sp.map(q => q[1]); reflectFn('front')(g, { box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, yaw: 0, T, hz: 0.5, ppm }); g.restore(); }
        if (k === 'shell' && e.f.n[0] * s > 0.5) { const q = e.sp; const ind = [q[0], q[1], [lerp(q[1][0], q[2][0], 0.25), lerp(q[1][1], q[2][1], 0.25)], [lerp(q[0][0], q[3][0], 0.25), lerp(q[0][1], q[3][1], 0.25)]]; drawLamp(g, ind, 'indM', o, T, lod); }
      });
      const c = P3([s * 0.98, 1.05, 0.92], d); info.points['mirror' + (s > 0 ? 'R' : 'L')] = [c[0], c[1]];
    }
    function drawDoorInner(k) {
      const s = DOOR[k].s, isF = k[0] === 'F';
      const z0 = isF ? D.hingeF : D.hingeR, z1 = isF ? D.shutF : D.shutR;
      const x = 0.77;
      const pts = [[x, 0.36, z0], [x, 0.36, isF ? z1 : -0.94], [x, isF ? 0.36 : 0.54, z1], [x, yTop(z1) - 0.02, z1], [x, yTop(z0) - 0.02, z0]].map(q => [s * q[0], q[1], q[2]]);
      const f = face(pts, [-s, 0, 0], {}); const sp = f.pts.map(q => P3(q, k));
      if (area(sp) < 0) { g.fillStyle = '#121718'; g.fill(polyPath(sp)); g.fillStyle = '#0A0D0E'; const arm = [[x - 0.01, 0.62, z0 - 0.15], [x - 0.01, 0.62, z1 + 0.12], [x - 0.01, 0.70, z1 + 0.12], [x - 0.01, 0.70, z0 - 0.15]].map(q => P3([s * q[0], q[1], q[2]], k)); g.fill(polyPath(arm)); }
      // the door's free edge (its thickness), turned to the light
      const ed = [[0.89, 0.36, z1], [0.77, 0.36, z1], [0.77, yTop(z1) - 0.02, z1], [0.89, yTop(z1), z1]].map(q => [s * q[0], q[1], q[2]]);
      const fe = face(ed, [0, 0, -1], {}); const se = fe.pts.map(q => P3(q, k));
      if (area(se) < 0) { const n = NW(fe.n, k), lit = dot(n, L); g.fillStyle = lit > 0.2 ? mix(pal.light, T.rim, 0.45) : pal.dark; g.fill(polyPath(se)); }
    }

    // ---- rim: the shot's one light along the edges that face it ----
    if (want(o, 'rim') && o.rim !== 0) {
      const sunP = cam.p([at[0] + L[0] * 400, at[1] + L[1] * 400, at[2] + L[2] * 400]);
      if (sunP[2] > 0.5 || o.light) {
        const lp = o.light || { x: sunP[0], y: sunP[1] };
        OTM.silhouette(g, info.path, { fill: false, light: lp, rimColor: (o.light && o.light.color) || T.rim, rimW: Math.max(1.2, ppm * 0.012) * (o.rim == null ? 1 : o.rim), rimSoft: true, spread: 1.1 });
      }
    }
    // ---- indicator glow into the emissive buffer ----
    if (o.em) emissiveLamps(o.em, o, list, decList, P3);
    // ---- heat above the roof ----
    if (o.heat && o.t != null) {
      const r = [[0.6, 1.47, 0.3], [-0.6, 1.47, 0.3], [0.6, 1.47, -1.5], [-0.6, 1.47, -1.5]].map(q => P3(q)); const xs = r.map(q => q[0]), ys = r.map(q => q[1]);
      const bx = { x: Math.min(...xs) - ppm * 0.3, y: Math.min(...ys) - ppm * 0.9, w: Math.max(...xs) - Math.min(...xs) + ppm * 0.6, h: ppm * 0.95 };
      shimmer(g, bx, o.t, { amp: o.heat * Math.max(1.2, ppm * 0.012), rise: 1 });
    }
    g.restore();
    // anchors for the choreography
    const pt = (q, d) => { const s = P3(q, d); return [s[0], s[1]]; };
    Object.assign(info.points, {
      roof: pt([0, 1.47, -0.6]), centre: pt([0, 0.7, 0]), ground: pt([0, 0, 0]),
      doorFR: pt([0.95, 0.75, 0.45], 'FR'), doorRR: pt([0.95, 0.75, -0.5], 'RR'), doorFL: pt([-0.95, 0.75, 0.45], 'FL'), doorRL: pt([-0.95, 0.75, -0.5], 'RL'),
      seatDriver: pt([0.38, 0.95, -0.15]), tailgate: pt([0, 1.2, -1.75]), plateR: pt([0, 0.72, -1.98]), plateF: pt([0, 0.48, 2.06]),
      wheelFR: pt([0.86, D.wr, D.zF]), wheelRR: pt([0.86, D.wr, D.zR]), wheelFL: pt([-0.86, D.wr, D.zF]), wheelRL: pt([-0.86, D.wr, D.zR]),
      indFR: pt([0.84, 0.65, 1.95]), indRR: pt([0.82, 0.86, -1.95]), indFL: pt([-0.84, 0.65, 1.95]), indRL: pt([-0.82, 0.86, -1.95]),
    });
    { const xs = [], ys = []; list.concat(decList).forEach(e => e.sp.forEach(q => { xs.push(q[0]); ys.push(q[1]); })); if (xs.length) info.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
    info.near = nearSide > 0 ? 'right' : nearSide < 0 ? 'left' : 'none';
    return info;
  }

  // ---- lamps ----
  function indLevel(o, side) { const v = o.indicators; if (v == null) return 0; if (typeof v === 'number') return v; return side > 0 ? (v.right || 0) : (v.left || 0); }
  function drawLamp(g, sp, kind, o, T, lod) {
    const p = polyPath(sp); const cx = sp.reduce((t, q) => t + q[0], 0) / sp.length, side = cx;
    if (kind === 'head') { g.fillStyle = '#141B1D'; g.fill(p); if (lod) { g.save(); g.clip(p); g.fillStyle = rgba('#8A9896', 0.55); g.beginPath(); const c = [sp[0][0] * 0.5 + sp[2][0] * 0.5, sp[0][1] * 0.5 + sp[2][1] * 0.5]; const r = Math.hypot(sp[2][0] - sp[0][0], sp[2][1] - sp[0][1]) * 0.18; g.arc(c[0], c[1], r, 0, TAU); g.fill(); g.strokeStyle = rgba(T.rim, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(sp[3][0], sp[3][1]); g.lineTo(sp[2][0], sp[2][1]); g.stroke(); g.restore(); }
      if (o.headlights) { g.save(); g.globalAlpha = o.headlights; g.fillStyle = '#FFF4DE'; g.fill(p); g.restore(); } return; }
    if (kind === 'tail') { const on = o.brake || 0; g.fillStyle = mix('#4A1012', '#D8402E', on); g.fill(p); if (lod) { g.save(); g.clip(p); g.fillStyle = 'rgba(255,190,170,0.18)'; g.fillRect(Math.min(...sp.map(q => q[0])), Math.min(...sp.map(q => q[1])), 9999, 2); g.restore(); } return; }
    if (kind === 'brake') { g.fillStyle = mix('#3A0E10', '#E04A34', o.brake || 0); g.fill(p); return; }
    if (kind === 'refl' || kind === 'fogR') { g.fillStyle = '#5A1414'; g.fill(p); return; }
    if (kind === 'indF' || kind === 'indR' || kind === 'indM') {
      // which side? the lamp's centre against the car's own centre is unknown here: indicators blink together for locks
      const lv = clamp(typeof o.indicators === 'number' ? o.indicators : Math.max(indLevel(o, 1), indLevel(o, -1)), 0, 1);
      g.fillStyle = mix('#5C3E18', '#FFC062', lv); g.fill(p); if (lv > 0.05) { g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = lv * 0.9; g.fillStyle = '#FFE2A8'; g.fill(p); g.restore(); }
    }
  }
  function emissiveLamps(E, o, list, decList, P3) {
    const lv = clamp(typeof o.indicators === 'number' ? o.indicators : Math.max(indLevel(o, 1), indLevel(o, -1)), 0, 1);
    decList.forEach(e => {
      const k = e.f.lamp; if (!k) return; const cx = e.sp.reduce((t, q) => t + q[0], 0) / e.sp.length, cy = e.sp.reduce((t, q) => t + q[1], 0) / e.sp.length;
      const r = Math.max(6, Math.hypot(e.sp[2][0] - e.sp[0][0], e.sp[2][1] - e.sp[0][1]) * 0.9);
      if ((k === 'indF' || k === 'indR') && lv > 0.02) { E.save(); E.globalAlpha = lv; E.fillStyle = '#FFB04A'; E.beginPath(); E.arc(cx, cy, r * 1.4, 0, TAU); E.fill(); E.globalAlpha = lv * 0.5; E.beginPath(); E.arc(cx, cy, r * 3, 0, TAU); E.fill(); E.restore(); }
      if ((k === 'tail' || k === 'brake') && o.brake > 0.02) { E.save(); E.globalAlpha = o.brake * 0.8; E.fillStyle = '#E0402C'; E.beginPath(); E.arc(cx, cy, r, 0, TAU); E.fill(); E.restore(); }
      if (k === 'head' && o.headlights > 0.02) { E.save(); E.globalAlpha = o.headlights; E.fillStyle = '#FFF2D8'; E.beginPath(); E.arc(cx, cy, r * 1.2, 0, TAU); E.fill(); E.restore(); }
    });
  }
  // ---- UK number plates: white at the front, yellow at the back, in a condensed black face ----
  function drawPlate(g, sp, which, lod, T) {
    const p = polyPath(sp); g.fillStyle = which === 'rear' ? '#E2BE3A' : '#E6E3D8'; g.fill(p);
    if (lod < 1) return;
    // sp: bl, br, tr, tl (as built: x- to x+ along the bottom, then top) after winding fixes: find corners by screen position
    const byX = sp.slice().sort((a, b) => a[0] - b[0]); const L2 = byX.slice(0, 2).sort((a, b) => a[1] - b[1]), R2 = byX.slice(2).sort((a, b) => a[1] - b[1]);
    const tl = L2[0], bl = L2[1], tr = R2[0];
    const w = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]); if (w < 26) return;
    g.save(); g.clip(p); g.setTransform(g.getTransform().multiply(new DOMMatrix([(tr[0] - tl[0]) / 520, (tr[1] - tl[1]) / 520, (bl[0] - tl[0]) / 111, (bl[1] - tl[1]) / 111, tl[0], tl[1]])));
    g.fillStyle = '#16181A'; g.font = '500 82px "Oswald"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(CAR_REG, 260, 60);
    g.fillStyle = 'rgba(30,40,90,0.85)'; g.fillRect(0, 0, 44, 111);
    g.restore();
  }
  const CAR_REG = 'HN17 WKS';

  // =================================================================================================================
  // 5. SMALL HELPERS FOR EVERYONE: the lock blink, heat shimmer
  // =================================================================================================================
  // blink(t, t0, n): the indicators' light level for a lock/unlock confirmation that starts at t0 (n flashes)
  function blink(t, t0, n, on, off) {
    n = n == null ? 2 : n; on = on || 0.34; off = off || 0.26; const u = t - t0; if (u < 0 || u > n * (on + off)) return 0;
    const ph = u % (on + off); if (ph > on) return Math.max(0, 1 - (ph - on) / 0.07) * 0.35 * Math.exp(-(ph - on) * 18);
    return Math.min(1, ph / 0.04) * (1 - 0.15 * ph / on);
  }
  // shimmer(g, box, t, {amp, rise, freq}): heat refraction, by sliding thin rows of what is already drawn (screen-space box)
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
  // 6. DEMOS (filled in below as the views are built)
  // =================================================================================================================
  const studio = (c, key, tod, o) => {
    const T = todOf(tod); o = o || {};
    c.g.drawImage(c.cache('car:studio:' + key, g => {
      const hz = o.hz || 640;
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, [[0, T.sky[0]], [0.7, T.sky[1]], [1, T.sky[2]]]); g.fillRect(0, 0, W, hz);
      skyline(g, { x: 0, y: hz - 260, w: W, h: 260 }, hz, T.hz, 'studioline', 0, 0.3);
      g.fillStyle = LC.lin(g, 0, hz, 0, H, [[0, mix(T.gnd, T.sky[2], 0.25)], [1, T.gnd]]); g.fillRect(0, hz, W, H - hz);
      // a car park's faded bay lines toward us
      g.strokeStyle = rgba(T.sky[1], 0.18); g.lineWidth = 3; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(W / 2 + i * 60, hz + 2); g.lineTo(W / 2 + i * 520, H + 40); g.stroke(); }
    }), 0, 0);
  };
  const DEMOS = [
    { name: 'exterior: side, driver\'s flank, morning', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'side', side: 'right', x: 960, y: 860, scale: 300, tod: 'morning', em: c.em, t }); } },
    { name: 'exterior: side, passenger flank, noon', draw(c, t) { studio(c, 'n', 'noon'); exterior(c.g, { view: 'side', side: 'left', x: 960, y: 860, scale: 300, tod: 'noon', em: c.em, t }); } },
    { name: 'exterior: three-quarter front, morning, heat', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'front3q', side: 'right', x: 930, y: 900, scale: 330, tod: 'morning', em: c.em, t, heat: 1 }); } },
    { name: 'exterior: three-quarter rear, office glass, locks blinking', draw(c, t) { studio(c, 'm', 'morning'); exterior(c.g, { view: 'rear3q', side: 'right', x: 980, y: 900, scale: 330, tod: 'morning', reflect: 'building', indicators: blink(t, 0.6, 2), em: c.em, t }); } },
    { name: 'exterior: rear, evening copper', draw(c, t) { studio(c, 'e', 'evening'); exterior(c.g, { view: 'rear', x: 960, y: 900, scale: 360, tod: 'evening', em: c.em, t }); } },
    { name: 'exterior: driver\'s door open, evening', draw(c, t) { studio(c, 'e', 'evening'); exterior(c.g, { view: 'front3q', side: 'right', x: 900, y: 900, scale: 320, tod: 'evening', doors: { driver: 1 }, em: c.em, t }); } },
    { name: 'exterior: rear door open, dusk', draw(c, t) { studio(c, 'd', 'dusk'); exterior(c.g, { view: 'rear3q', side: 'right', x: 980, y: 900, scale: 320, tod: 'dusk', doors: { rear: 1 }, indicators: blink(t, 0.6, 2), em: c.em, t }); } },
    { name: 'exterior: side close, dusk, the rear window a mirror', draw(c, t) { studio(c, 'd', 'dusk'); exterior(c.g, { view: 'side', side: 'right', x: 1500, y: 1000, scale: 620, dist: 5, tod: 'dusk', em: c.em, t }); } },
  ];

  window.SETS = window.SETS || {};
  SETS.car = { _dev: { MODEL, DEC, PER, FEAT }, exterior, blink, shimmer, reflect: REFLECT, reflectCanvas, tod: TOD, model: { D, yTop }, views: {}, demos: DEMOS };
})();
