window.SETS = window.SETS || {};
/* LONG DISTANCE · SET: the bathroom (SETS.bathroom) · film/api/bathroom.md
   The morning routine. One small tiled room laid out in metres and seen through pinhole cameras, so the two views agree: the basin
   wall in cold white tile paper; a mirror cabinet over the basin whose two mirrored doors meet on the centre line; under it a shelf,
   and on the shelf, on the centre line, a glass with two toothbrushes: his blue one on the left, the other on the right, stiff and
   grey, furred with dust. The phone stands propped against the right-hand mirror, in the empty half. A small frosted window right
   of the cabinet gives the grey light. The mirror shows the room behind us (the open door, the hall dark beyond it) by reflecting
   the room's own geometry, so his reflection and the phone sit in front of the same reflected room in every view.
   Views: glass (the insert: the glass on the centre line, a state lifts his brush out), mirror (him at the basin, seen in the
   mirror; his figure is the rig's, between back() and front(); the phone is the phone's).
   Foam and every white thing are cut paper, never pure white. Deterministic: no Math.random, no Date. */
(function () {
  'use strict';
  const O = window.OTM, GG = window.GG, W = O.W, H = O.H, clamp = O.clamp, lerp = O.lerp;
  const SET = 'bathroom', MG = 48;

  /*KIT*/

  // ================================================================ the room, in metres
  // x across the basin wall (his half < 0 < the empty half), y up, z away from the camera; the basin wall is z = 0.
  const B = {
    leftX: -1.05, rightX: 1.05, backZ: -2.6, ceil: 2.4, tile: 0.15,
    cab: { x0: -0.45, x1: 0.45, y0: 1.10, y1: 1.86, z: -0.13 },          // the mirror cabinet: its front is the mirror plane
    shelf: { x0: -0.42, x1: 0.42, y: 1.0, t: 0.016, z0: -0.27 },
    basin: { x0: -0.30, x1: 0.30, z0: -0.46, y: 0.85 },
    window: { x0: 0.64, x1: 1.0, y0: 1.12, y1: 1.86 },                  // frosted, in the basin wall, right of the cabinet
    door: { x0: 0.12, x1: 0.92, y1: 2.04 },                              // the open door behind us, seen only in the mirror
    towel: [-0.76, 1.12],
    glass: [0, 1.0, -0.182], glassR: 0.034, glassH: 0.105,
    hisBrush: { base: [-0.007, 1.009, -0.182], tip: [-0.06, 1.193, -0.192], face: -1 },
    herBrush: { base: [0.008, 1.009, -0.18], tip: [0.064, 1.189, -0.186], face: 1 },
    phone: [0.255, 1.072, -0.172],                // the phone's centre: portrait, on the shelf, its top leaning back against the mirror
    phoneLean: 0.47,                              // radians back from upright
    face: [-0.40, 1.66, -0.55],                   // his face at the basin (the real one); the reflection is mirrored in z
    basinAt: [0, 0.86, -0.24],
  };
  const MZ = B.cab.z, mirrorPt = p => [p[0], p[1], 2 * MZ - p[2]];
  const P = {
    tileHi: '#CBD1D3', tile: '#B6BEC2', tileSh: '#9CA5AB', tileDeep: '#848E95',
    win: '#C6CDCF', winHi: '#D3D8D9', winFrame: '#A7AFB4', winBar: '#9AA3A8',
    mirror: '#7C878E', mirrorHi: '#919CA2', mirrorDeep: '#5E686F', frame: '#B7BEC1', frameSh: '#8D969C',
    shelf: '#BDC4C7', shelfEdge: '#CED4D6', basin: '#C5CBCD', basinSh: '#9AA3A8', basinIn: '#A6AFB4', basinDeep: '#7F8990',
    chrome: '#879197', chromeHi: '#C5CCCF', chromeSh: '#5F696F',
    blue: '#3F6EA8', blueHi: '#6A95C8', blueSh: '#2C507E', bristle: '#C9CFD0', bristleSh: '#A3ABAE',
    grey: '#8A8D8B', greyHi: '#A2A49F', greySh: '#6B6F6E', felt: '#9B9C96', dust: '#BAB9B1',
    towel: '#6D7D8C', towelSh: '#53626F', towelHi: '#8695A2', hall: '#3E454B', hallDeep: '#2C3237', doorLeaf: '#A3AAAD',
    foam: '#D2D7D7', foamSh: '#AFB7BA', soap: '#BFB9AF', glow: '#FFC5A0', glowHot: '#FFD9BE',
  };

  // ---------------------------------------------------------------- tile paper: a wall of square tiles, its light cut into bands
  // wall: { pt(u, v) -> world point, u0, u1, v0, v1 }; band(u, v) -> 0 (shade) .. 3 (lit); cols: 4 tones dark..light
  function tileWall(g, cam, wall, band, cols, seed, o) {
    o = o || {}; const ts = o.tile || B.tile, k = cam.k(...wall.pt((wall.u0 + wall.u1) / 2, (wall.v0 + wall.v1) / 2));
    const outline = cam.xy([wall.pt(wall.u0, wall.v0), wall.pt(wall.u1, wall.v0), wall.pt(wall.u1, wall.v1), wall.pt(wall.u0, wall.v1)]), path = poly(outline).path(0, 1);
    g.save(); g.clip(path);
    // the bands, as cut regions: a fine grid of cells, each filled with its band's tone (posterised), then the paper over it
    const n = o.cells || 48, du = (wall.u1 - wall.u0) / n, nv = Math.max(4, Math.round(n * (wall.v1 - wall.v0) / (wall.u1 - wall.u0))), dv = (wall.v1 - wall.v0) / nv;
    for (let i = 0; i < n; i++) for (let j = 0; j < nv; j++) {
      const u = wall.u0 + (i + 0.5) * du, v = wall.v0 + (j + 0.5) * dv, b = clamp(Math.round(band(u, v) + (O.vnoise(u * 9, v * 9, seed) - 0.5) * 0.5), 0, cols.length - 1);
      const q = cam.xy([wall.pt(u - du * 0.5, v - dv * 0.5), wall.pt(u + du * 0.5, v - dv * 0.5), wall.pt(u + du * 0.5, v + dv * 0.5), wall.pt(u - du * 0.5, v + dv * 0.5)]);
      g.fillStyle = cols[b]; g.strokeStyle = cols[b]; g.lineWidth = 1.2; g.beginPath(); q.forEach((p, m) => m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke();
    }
    // each tile its own sheet: a faint shift of tone
    const r = O.rng('tiles' + seed);
    for (let u = Math.floor(wall.u0 / ts) * ts; u < wall.u1; u += ts) for (let v = Math.floor(wall.v0 / ts) * ts; v < wall.v1; v += ts) {
      const q = cam.xy([wall.pt(u, v), wall.pt(u + ts, v), wall.pt(u + ts, v + ts), wall.pt(u, v + ts)]), a = r();
      g.fillStyle = a < 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.04})` : `rgba(40,50,58,${0.03 + r() * 0.05})`; g.beginPath(); q.forEach((p, m) => m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
    }
    GG.texture(g, path, o.tex == null ? 0.5 : o.tex, seed, 'card');
    // the grout: a dark cut, each tile's lit lip above and left of it
    const gw = Math.max(1.2, 0.0032 * k), lw = Math.max(0.8, 0.0016 * k);
    const lineAt = (a, b, col, w, off) => { const q = cam.xy([a, b]); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(q[0][0] + off[0], q[0][1] + off[1]); g.lineTo(q[1][0] + off[0], q[1][1] + off[1]); g.stroke(); };
    for (let u = Math.ceil(wall.u0 / ts) * ts; u < wall.u1; u += ts) { lineAt(wall.pt(u, wall.v0), wall.pt(u, wall.v1), 'rgba(60,70,78,0.42)', gw, [0, 0]); lineAt(wall.pt(u, wall.v0), wall.pt(u, wall.v1), 'rgba(236,238,236,0.3)', lw, [gw * 0.9, 0]); }
    for (let v = Math.ceil(wall.v0 / ts) * ts; v < wall.v1; v += ts) { lineAt(wall.pt(wall.u0, v), wall.pt(wall.u1, v), 'rgba(60,70,78,0.42)', gw, [0, 0]); lineAt(wall.pt(wall.u0, v), wall.pt(wall.u1, v), 'rgba(236,238,236,0.3)', lw, [0, gw * 0.9]); }
    g.restore();
    return path;
  }
  const backWall = { pt: (u, v) => [u, v, 0], u0: B.leftX, u1: B.rightX, v0: 0, v1: B.ceil };
  // the light: the window is right of the cabinet; the wall is brightest about it, falling away left and low (his half in shade)
  const wallBand = (u, v) => { const dx = u - 0.82, dy = (v - 1.5) * 0.8; const d = Math.hypot(dx, dy); return 3.2 - d * 2.3 - (v < 0.8 ? 0.8 : 0); };
  const cols4 = [P.tileDeep, P.tileSh, P.tile, P.tileHi];

  // ---------------------------------------------------------------- the toothbrushes (3D: a handle, a neck, a head and its tuft)
  // b: {base, tip, face (-1 left, 1 right: the side the bristles face)}; o: {dusty, alpha}
  function brush(g, cam, b, o) {
    o = o || {}; const A = b.base, T = b.tip, L = Math.hypot(T[0] - A[0], T[1] - A[1], T[2] - A[2]), d = [(T[0] - A[0]) / L, (T[1] - A[1]) / L, (T[2] - A[2]) / L];
    const at = s => [A[0] + d[0] * s, A[1] + d[1] * s, A[2] + d[2] * s], k = cam.k(...at(L * 0.6));
    const side = [d[1] * b.face, -d[0] * b.face, 0], sl = Math.hypot(side[0], side[1]) || 1; side[0] /= sl; side[1] /= sl;       // in the picture plane, perpendicular to the handle
    const off = (p, s) => [p[0] + side[0] * s, p[1] + side[1] * s, p[2]];
    const dusty = !!o.dusty, cH = dusty ? P.grey : P.blue, cHi = dusty ? P.greyHi : P.blueHi, cSh = dusty ? P.greySh : P.blueSh;
    const q = s => { const r = cam.p(at(s)); return [r[0], r[1]]; };
    // the handle: wide grip, a slim neck, the head
    const segs = [[0, 0.0062], [L * 0.5, 0.0068], [L * 0.62, 0.005], [L * 0.76, 0.0032], [L * 0.8, 0.0036], [L, 0.0042]];
    const left = [], right = [];
    segs.forEach(([s, r]) => { const p = q(s), dir2 = [q(Math.min(L, s + 0.002))[0] - q(Math.max(0, s - 0.002))[0], q(Math.min(L, s + 0.002))[1] - q(Math.max(0, s - 0.002))[1]], dl = Math.hypot(dir2[0], dir2[1]) || 1, nx = -dir2[1] / dl, ny = dir2[0] / dl, rr = r * k; left.push([p[0] + nx * rr, p[1] + ny * rr]); right.unshift([p[0] - nx * rr, p[1] - ny * rr]); });
    const hp = GG.blob(left.concat(right).map((p, i, a) => [p[0], p[1], i === 0 || i === a.length - 1 || i === left.length - 1 || i === left.length ? 1 : 0])).path(dusty ? 0.9 : 0.5, dusty ? 811 : 801);
    if (o.shadow !== false) shadow(g, hp, -0.01 * k, 0.006 * k, Math.max(2, 0.004 * k), dusty ? 0.3 : 0.35, '#3A444C');
    GG.piece(g, hp, { fill: cH, tex: dusty ? 0.55 : 0.35, kind: 'card', seed: dusty ? 812 : 802 });
    cres(g, hp, side[0] < 0 ? 0.0025 * k : -0.0025 * k, -0.0015 * k, cHi, 0.85);
    // a grip stripe on his; a film of dust along the top of hers
    if (!dusty) { const s1 = cam.xy([off(at(L * 0.12), 0), off(at(L * 0.42), 0)]); g.strokeStyle = 'rgba(214,226,236,0.55)'; g.lineWidth = Math.max(1.5, 0.0022 * k); g.lineCap = 'round'; g.beginPath(); g.moveTo(s1[0][0], s1[0][1]); g.lineTo(s1[1][0], s1[1][1]); g.stroke(); }
    else onPieces(g, [hp], t => { const s1 = cam.xy([off(at(0), -0.004), off(at(L), -0.003)]); t.strokeStyle = 'rgba(196,194,186,0.7)'; t.lineWidth = Math.max(2, 0.004 * k); t.beginPath(); t.moveTo(s1[0][0], s1[0][1]); t.lineTo(s1[1][0], s1[1][1]); t.stroke(); });
    // the tuft: a block of bristles standing off the head toward its face
    const h0 = L * 0.8, h1 = L * 0.995, tuft = cam.xy([off(at(h0), 0.003), off(at(h1), 0.003), off(at(h1), 0.016 + (dusty ? 0.002 : 0.003)), off(at(h0 + 0.002), dusty ? 0.017 : 0.019)]);
    const tp = poly(tuft).path(dusty ? 2.4 : 0.8, dusty ? 813 : 803);
    GG.piece(g, tp, { fill: dusty ? P.felt : P.bristle, tex: dusty ? 0.8 : 0.4, kind: dusty ? 'wool' : 'card', seed: dusty ? 814 : 804 });
    if (!dusty) {
      onPieces(g, [tp], t => { for (let i = 0; i < 5; i++) { const s0 = lerp(h0, h1, (i + 0.5) / 5), a2 = cam.xy([off(at(s0), 0.004), off(at(s0), 0.018)]); t.strokeStyle = i % 2 ? 'rgba(98,144,196,0.75)' : 'rgba(150,160,166,0.5)'; t.lineWidth = Math.max(1.5, 0.0022 * k); t.beginPath(); t.moveTo(a2[0][0], a2[0][1]); t.lineTo(a2[1][0], a2[1][1]); t.stroke(); } });
      cres(g, tp, 0, -0.002 * k, '#D6DBDC', 0.8);
    } else {
      // the dust: a pale fur on the bristles, flecks, a few loose fibres standing off it
      cres(g, tp, side[0] * 0.003 * k, -0.002 * k, P.dust, 0.9);
      const r = O.rng('dusty'); g.save(); g.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const s0 = lerp(h0 - 0.004, h1 + 0.002, r()), w0 = lerp(0.002, 0.022, r()), p = cam.p(off(at(s0), w0)); g.fillStyle = r() < 0.7 ? 'rgba(200,198,190,0.75)' : 'rgba(110,112,108,0.5)'; g.beginPath(); g.arc(p[0], p[1], Math.max(0.6, (0.0004 + r() * 0.0008) * k), 0, 7); g.fill(); }
      for (let i = 0; i < 14; i++) { const s0 = lerp(h0, h1, r()), p = cam.p(off(at(s0), 0.017 + r() * 0.003)), an = Math.atan2(side[1], side[0]) * 0 + (r() - 0.5) * 2.4 - Math.PI / 2, l = (0.003 + r() * 0.005) * k; g.strokeStyle = 'rgba(206,204,196,0.6)'; g.lineWidth = Math.max(0.6, 0.0005 * k); g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + Math.cos(an) * l * 0.5 + 1, p[1] + Math.sin(an) * l * 0.5, p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l); g.stroke(); }
      g.restore();
    }
    return { handle: hp, tuft: tp };
  }
  // the glass: back wall first (behind the handles), its front after; translucent cut paper, a thick base, a dried ring
  function glassBack(g, cam, C) {
    const r = B.glassR, h = B.glassH, k = cam.k(C[0], C[1] + h / 2, C[2]);
    const ring = (y, rr, n) => { const p = []; for (let i = 0; i < (n || 32); i++) { const a = i / (n || 32) * Math.PI * 2; p.push([C[0] + Math.cos(a) * rr, C[1] + y, C[2] + Math.sin(a) * rr]); } return cam.xy(p); };
    const body = poly(hull(ring(0, r * 0.94).concat(ring(h, r)))).path(0.5, 821);
    shadow(g, body, -0.012 * k, 0.004 * k, 0.006 * k, 0.28, '#3A444C');
    g.save(); g.fillStyle = 'rgba(150,166,174,0.32)'; g.fill(body); g.restore();
    // the inside of the far wall, seen through the near one
    const backHalf = poly(ring(h, r * 0.9).slice(16).concat(ring(0.012, r * 0.86).slice(16).reverse())).path(0.4, 822);
    g.save(); g.fillStyle = 'rgba(120,136,146,0.25)'; g.fill(backHalf); g.restore();
    return body;
  }
  function glassFront(g, cam, C) {
    const r = B.glassR, h = B.glassH, k = cam.k(C[0], C[1] + h / 2, C[2]);
    const ring = (y, rr, a0, a1, n) => { const p = []; n = n || 24; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([C[0] + Math.cos(a) * rr, C[1] + y, C[2] + Math.sin(a) * rr]); } return cam.xy(p); };
    // the thick base, a dried water ring in it
    const base = poly(ring(0, r * 0.94, Math.PI, Math.PI * 2).concat(ring(0.012, r * 0.93, Math.PI * 2, Math.PI).reverse().reverse())).path(0.3, 823);
    g.save(); g.fillStyle = 'rgba(160,176,184,0.4)'; g.fill(poly(hull(ring(0, r * 0.94, 0, Math.PI * 2).concat(ring(0.012, r * 0.93, 0, Math.PI * 2)))).path(0.3, 824)); g.restore();
    g.save(); g.strokeStyle = 'rgba(206,210,206,0.55)'; g.lineWidth = Math.max(1, 0.0015 * k); g.stroke(poly(ring(0.013, r * 0.8, 0, Math.PI * 2)).path(0.6, 825)); g.restore();
    // the near wall: a faint pane, two cut highlights (the window is to the right), the rim
    const near = poly(ring(h, r, 0, -Math.PI).concat(ring(0, r * 0.94, -Math.PI, 0))).path(0.4, 826);
    g.save(); g.fillStyle = 'rgba(178,192,198,0.18)'; g.fill(near); g.restore();
    const hiA = cam.xy([[C[0] + r * 0.62, C[1] + 0.012, C[2] - r * 0.78], [C[0] + r * 0.62, C[1] + h - 0.006, C[2] - r * 0.78]]), hiB = cam.xy([[C[0] + r * 0.88, C[1] + 0.02, C[2] - r * 0.47], [C[0] + r * 0.88, C[1] + h - 0.012, C[2] - r * 0.47]]);
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(222,228,228,0.7)'; g.lineWidth = Math.max(2, 0.005 * k); g.beginPath(); g.moveTo(hiA[0][0], hiA[0][1]); g.lineTo(hiA[1][0], hiA[1][1]); g.stroke();
    g.strokeStyle = 'rgba(222,228,228,0.45)'; g.lineWidth = Math.max(1, 0.002 * k); g.beginPath(); g.moveTo(hiB[0][0], hiB[0][1]); g.lineTo(hiB[1][0], hiB[1][1]); g.stroke();
    const sideL = cam.xy([[C[0] - r, C[1] + 0.006, C[2]], [C[0] - r, C[1] + h, C[2]]]), sideR = cam.xy([[C[0] + r, C[1] + 0.006, C[2]], [C[0] + r, C[1] + h, C[2]]]);
    g.strokeStyle = 'rgba(110,124,134,0.5)'; g.lineWidth = Math.max(1, 0.0018 * k); g.beginPath(); g.moveTo(sideL[0][0], sideL[0][1]); g.lineTo(sideL[1][0], sideL[1][1]); g.stroke();
    g.strokeStyle = 'rgba(214,222,224,0.6)'; g.beginPath(); g.moveTo(sideR[0][0], sideR[0][1]); g.lineTo(sideR[1][0], sideR[1][1]); g.stroke();
    g.strokeStyle = 'rgba(214,222,224,0.8)'; g.lineWidth = Math.max(1.2, 0.0022 * k); g.stroke(poly(ring(h, r, 0, Math.PI * 2, 40)).path(0.3, 827));
    g.restore();
  }
  // the shelf under the cabinet: its top, its lit front lip, its shadow on the tiles
  function shelf(g, cam) {
    const s = B.shelf, k = cam.k(0, s.y, s.z0);
    const top = quad(g, cam, [[s.x0, s.y, s.z0], [s.x1, s.y, s.z0], [s.x1, s.y, 0], [s.x0, s.y, 0]], { fill: P.shelf, rough: 0.4, seed: 831, tex: 0.4, kind: 'card' });
    const sh = cam.xy([[s.x0, s.y - s.t, 0], [s.x1, s.y - s.t, 0], [s.x1 - 0.02, s.y - s.t - 0.05, 0], [s.x0 - 0.06, s.y - s.t - 0.06, 0]]); g.save(); g.filter = `blur(${Math.max(3, 0.01 * k)}px)`; g.globalAlpha = 0.35; g.fillStyle = '#3E4850'; g.fill(poly(sh).path(0, 1)); g.restore();
    const lip = quad(g, cam, [[s.x0, s.y - s.t, s.z0], [s.x1, s.y - s.t, s.z0], [s.x1, s.y, s.z0], [s.x0, s.y, s.z0]], { fill: P.shelfEdge, rough: 0.3, seed: 832, tex: 0.3, kind: 'card' });
    cres(g, lip, 0, -0.002 * k, '#DADFE0', 0.6);
    return top;
  }
  // his things on his half of the shelf: a razor, a squeezed tube of toothpaste
  function shelfThings(g, cam) {
    const y = B.shelf.y, k = cam.k(-0.2, y, -0.12);
    const tube = cam.xy([[-0.30, y + 0.002, -0.1], [-0.16, y + 0.002, -0.13], [-0.155, y + 0.018, -0.13], [-0.30, y + 0.012, -0.1]]);
    const tp = GG.piece(g, poly(tube).path(0.8, 841), { fill: '#C8CDCF', tex: 0.4, kind: 'card', seed: 842, lift: [-0.006 * k, 0.003 * k], liftAlpha: 0.35, liftBlur: 4 });
    cres(g, tp, 0, -0.002 * k, '#D8DCDD', 0.7);
    const cap = cam.xy([[-0.16, y + 0.002, -0.13], [-0.14, y + 0.002, -0.135], [-0.14, y + 0.02, -0.135], [-0.16, y + 0.02, -0.13]]); GG.piece(g, poly(cap).path(0.4, 843), { fill: '#3F6EA8', tex: 0.3, seed: 844 });
    const band = cam.xy([[-0.27, y + 0.004, -0.106], [-0.22, y + 0.004, -0.116], [-0.22, y + 0.015, -0.116], [-0.27, y + 0.013, -0.106]]); g.fillStyle = 'rgba(63,110,168,0.6)'; g.fill(poly(band).path(0.3, 845));
    const razor = cam.xy([[-0.36, y + 0.004, -0.2], [-0.24, y + 0.004, -0.22], [-0.24, y + 0.014, -0.22], [-0.36, y + 0.012, -0.2]]);
    GG.piece(g, poly(razor).path(0.5, 846), { fill: '#3B4248', tex: 0.3, seed: 847, lift: [-0.006 * k, 0.003 * k], liftAlpha: 0.35, liftBlur: 4 });
    const rh = cam.xy([[-0.245, y + 0.004, -0.235], [-0.215, y + 0.004, -0.235], [-0.215, y + 0.022, -0.21], [-0.245, y + 0.022, -0.21]]); GG.piece(g, poly(rh).path(0.4, 848), { fill: P.chrome, tex: 0.3, seed: 849 });
  }
  // the reflected room in the mirror: the wall behind us (tiles, the towel rail), the open door and the dark hall, his-side wall
  function reflectedRoom(g, cam, clip) {
    g.save(); g.clip(clip);
    g.fillStyle = P.mirrorDeep; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    const back = { pt: (u, v) => mirrorPt([u, v, B.backZ]), u0: B.leftX, u1: B.rightX, v0: 0, v1: B.ceil };
    const band = (u, v) => 2.2 + (u > 0 ? 0.6 : 0) - Math.abs(v - 1.5) * 0.6 - (u < -0.4 ? 0.7 : 0);
    tileWall(g, cam, back, band, ['#5D676E', '#6E7880', '#7F8990', '#8F99A0'], 851, { cells: 32, tex: 0.4 });
    // the side walls, seen in the glass
    [[B.leftX, 1, 0.5], [B.rightX, -1, 1.6]].forEach(([x, nrmX, bb], i) => { const w = { pt: (u, v) => mirrorPt([x, v, u]), u0: B.backZ, u1: MZ, v0: 0, v1: B.ceil }; tileWall(g, cam, w, () => bb, ['#5D676E', '#6E7880', '#7F8990', '#8F99A0'], 852 + i, { cells: 16, tex: 0.4 }); });
    // the open door, the hall beyond it: dark, one cut band of grey from a window somewhere along it
    const d = B.door, dq = cam.xy([mirrorPt([d.x0, 0, B.backZ]), mirrorPt([d.x1, 0, B.backZ]), mirrorPt([d.x1, d.y1, B.backZ]), mirrorPt([d.x0, d.y1, B.backZ])]);
    const dp = GG.piece(g, poly(dq).path(0.6, 853), { fill: P.hallDeep, tex: 0.5, seed: 854, kind: 'card' });
    onPieces(g, [dp], t => { const q = cam.xy([mirrorPt([d.x0 + 0.3, 0, B.backZ - 1.2]), mirrorPt([d.x1 + 0.4, 0, B.backZ - 1.2]), mirrorPt([d.x1 + 0.4, 2.2, B.backZ - 1.2]), mirrorPt([d.x0 + 0.5, 2.2, B.backZ - 1.2])]); t.fillStyle = P.hall; t.fill(poly(q).path(2, 855)); });
    const leaf = cam.xy([mirrorPt([d.x1, 0, B.backZ]), mirrorPt([d.x1 + 0.08, 0, B.backZ + 0.55]), mirrorPt([d.x1 + 0.08, d.y1, B.backZ + 0.55]), mirrorPt([d.x1, d.y1, B.backZ])]);
    GG.piece(g, poly(leaf).path(0.6, 856), { fill: '#7E888E', tex: 0.5, seed: 857, kind: 'card' });
    [[d.x0 - 0.05, d.x0], [d.x1, d.x1 + 0.05]].forEach(([a, b2], i) => { const q = cam.xy([mirrorPt([a, 0, B.backZ + 0.002]), mirrorPt([b2, 0, B.backZ + 0.002]), mirrorPt([b2, d.y1 + 0.05, B.backZ + 0.002]), mirrorPt([a, d.y1 + 0.05, B.backZ + 0.002])]); GG.piece(g, poly(q).path(0.4, 858 + i), { fill: '#8C969C', tex: 0.4, seed: 860 + i }); });
    // the towel rail on the wall behind us, a towel on it (his half of the reflection)
    const tr = cam.xy([mirrorPt([-0.85, 1.22, B.backZ + 0.05]), mirrorPt([-0.3, 1.22, B.backZ + 0.05])]); g.strokeStyle = '#8A949A'; g.lineWidth = Math.max(2, 0.012 * cam.k(...mirrorPt([-0.5, 1.2, B.backZ]))); g.beginPath(); g.moveTo(tr[0][0], tr[0][1]); g.lineTo(tr[1][0], tr[1][1]); g.stroke();
    const tw = cam.xy([mirrorPt([-0.78, 1.23, B.backZ + 0.06]), mirrorPt([-0.42, 1.23, B.backZ + 0.06]), mirrorPt([-0.43, 0.7, B.backZ + 0.07]), mirrorPt([-0.77, 0.72, B.backZ + 0.07])]);
    const twp = GG.piece(g, poly(tw).path(1.2, 862), { fill: '#56646F', tex: 0.6, kind: 'cloth', seed: 863 }); cres(g, twp, 3, 0, '#6D7C88', 0.7);
    g.restore();
  }
  // a cold veil and a streak of sheen over everything in the mirror (cut paper: the glass is real)
  function mirrorVeil(g, cam, clip, strength) {
    g.save(); g.clip(clip);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(196,208,214,' + (0.55 * strength) + ')'; g.fill(clip);
    g.globalCompositeOperation = 'screen';
    const c0 = cam.p(B.cab.x1, B.cab.y1, MZ), c1 = cam.p(B.cab.x0, B.cab.y0, MZ), w = c0[0] - c1[0];
    const streak = O.S().poly([[c1[0] + w * 0.58, c0[1] - 20], [c1[0] + w * 0.70, c0[1] - 20], [c1[0] + w * 0.44, c1[1] + 20], [c1[0] + w * 0.32, c1[1] + 20]]).path(2.5, 871);
    g.fillStyle = 'rgba(170,184,192,' + (0.16 * strength) + ')'; g.fill(streak);
    const st2 = O.S().poly([[c1[0] + w * 0.74, c0[1] - 20], [c1[0] + w * 0.77, c0[1] - 20], [c1[0] + w * 0.51, c1[1] + 20], [c1[0] + w * 0.48, c1[1] + 20]]).path(1.5, 872);
    g.fillStyle = 'rgba(170,184,192,' + (0.12 * strength) + ')'; g.fill(st2);
    g.restore();
  }
  // the cabinet's two mirrored doors: the glass regions (the clip for reflections) and their frames
  function doorGlass(cam) {
    const c = B.cab, p = new Path2D();
    [[c.x0 + 0.014, -0.006], [0.006, c.x1 - 0.014]].forEach(([a, b2]) => p.addPath(poly(cam.xy([[a, c.y0 + 0.014, MZ], [b2, c.y0 + 0.014, MZ], [b2, c.y1 - 0.014, MZ], [a, c.y1 - 0.014, MZ]])).path(0, 1)));
    return p;
  }
  function cabinetFrames(g, cam) {
    const c = B.cab, k = cam.k(0, 1.5, MZ);
    [[c.x0, -0.002], [0.002, c.x1]].forEach(([a, b2], i) => {
      const outer = cam.xy([[a, c.y0, MZ], [b2, c.y0, MZ], [b2, c.y1, MZ], [a, c.y1, MZ]]), inner = cam.xy([[a + 0.014, c.y0 + 0.014, MZ], [b2 - 0.014, c.y0 + 0.014, MZ], [b2 - 0.014, c.y1 - 0.014, MZ], [a + 0.014, c.y1 - 0.014, MZ]]);
      const fr = O.S().poly(outer).path(0.4, 881 + i); fr.addPath(O.S().poly(inner.slice().reverse()).path(0.2, 883 + i));
      GG.piece(g, fr, { fill: P.frame, tex: 0.4, kind: 'card', seed: 885 + i });
      cres(g, fr, i ? -0.002 * k : 0.002 * k, -0.002 * k, '#D0D6D8', 0.7);
    });
    // the seam between the doors (the centre line), the cabinet's shadow on the tiles below it
    line3(g, cam, [[0, c.y0, MZ - 0.001], [0, c.y1, MZ - 0.001]], 'rgba(40,48,54,0.7)', Math.max(1.5, 0.004 * k));
  }
  // the frosted window right of the cabinet: its reveal, the frosted panes, the bar, the sill
  function frostedWindow(g, cam) {
    const w = B.window, k = cam.k((w.x0 + w.x1) / 2, 1.5, 0), dz = 0.11;
    vqs(g, cam, [-1, 0, 0], [[w.x1, w.y0, 0], [w.x1, w.y0, dz], [w.x1, w.y1, dz], [w.x1, w.y1, 0]], { fill: P.tile, rough: 0.4, seed: 891, tex: 0.4, kind: 'card' });
    vqs(g, cam, [0, -1, 0], [[w.x0, w.y1, 0], [w.x1, w.y1, 0], [w.x1, w.y1, dz], [w.x0, w.y1, dz]], { fill: P.tileSh, rough: 0.4, seed: 892, tex: 0.4, kind: 'card' });
    const glass = quad(g, cam, [[w.x0, w.y0, dz], [w.x1, w.y0, dz], [w.x1, w.y1, dz], [w.x0, w.y1, dz]], { fill: P.win, rough: 0.3, seed: 893, tex: 0.35, kind: 'paper' });
    // the frosted glass: brighter at the top, a soft cut band of the sky; nothing to see through it
    onPieces(g, [glass], t => { const q = cam.xy([[w.x0, w.y0 + 0.42, dz], [w.x1, w.y0 + 0.36, dz], [w.x1, w.y1, dz], [w.x0, w.y1, dz]]); t.fillStyle = P.winHi; t.fill(poly(q).path(3, 894)); const q2 = cam.xy([[w.x0, w.y0, dz], [w.x1, w.y0, dz], [w.x1, w.y0 + 0.14, dz], [w.x0, w.y0 + 0.18, dz]]); t.fillStyle = '#B9C0C3'; t.fill(poly(q2).path(2, 895)); });
    const fr = (pts, s) => quad(g, cam, pts, { fill: P.winFrame, rough: 0.3, seed: s, tex: 0.3, kind: 'card' });
    fr([[w.x0, w.y0, dz - 0.002], [w.x1, w.y0, dz - 0.002], [w.x1, w.y0 + 0.035, dz - 0.002], [w.x0, w.y0 + 0.035, dz - 0.002]], 896);
    fr([[w.x0, w.y1 - 0.035, dz - 0.002], [w.x1, w.y1 - 0.035, dz - 0.002], [w.x1, w.y1, dz - 0.002], [w.x0, w.y1, dz - 0.002]], 897);
    fr([[w.x0, w.y0, dz - 0.002], [w.x0 + 0.035, w.y0, dz - 0.002], [w.x0 + 0.035, w.y1, dz - 0.002], [w.x0, w.y1, dz - 0.002]], 898);
    fr([[w.x1 - 0.035, w.y0, dz - 0.002], [w.x1, w.y0, dz - 0.002], [w.x1, w.y1, dz - 0.002], [w.x1 - 0.035, w.y1, dz - 0.002]], 899);
    fr([[w.x0, (w.y0 + w.y1) / 2 + 0.06, dz - 0.004], [w.x1, (w.y0 + w.y1) / 2 + 0.06, dz - 0.004], [w.x1, (w.y0 + w.y1) / 2 + 0.09, dz - 0.004], [w.x0, (w.y0 + w.y1) / 2 + 0.09, dz - 0.004]], 900);
    const handle = cam.xy([[w.x1 - 0.06, (w.y0 + w.y1) / 2 + 0.02, dz - 0.02], [w.x1 - 0.045, (w.y0 + w.y1) / 2 + 0.02, dz - 0.02], [w.x1 - 0.045, (w.y0 + w.y1) / 2 + 0.1, dz - 0.02], [w.x1 - 0.06, (w.y0 + w.y1) / 2 + 0.1, dz - 0.02]]); GG.piece(g, poly(handle).path(0.3, 901), { fill: P.chrome, tex: 0.3, seed: 902 });
    const sill = quad(g, cam, [[w.x0 - 0.03, w.y0, -0.05], [w.x1 + 0.03, w.y0, -0.05], [w.x1 + 0.03, w.y0, dz], [w.x0 - 0.03, w.y0, dz]], { fill: P.tileHi, rough: 0.3, seed: 903, tex: 0.3, kind: 'card', lift: [0, 0.008 * k], liftAlpha: 0.4, liftBlur: 6 });
    quad(g, cam, [[w.x0 - 0.03, w.y0 - 0.018, -0.05], [w.x1 + 0.03, w.y0 - 0.018, -0.05], [w.x1 + 0.03, w.y0, -0.05], [w.x0 - 0.03, w.y0, -0.05]], { fill: P.tile, rough: 0.3, seed: 904, tex: 0.3, kind: 'card' });
  }
  const vqs = (g, cam, n, pts, o) => cam.sees(n, pts[0]) ? quad(g, cam, pts, o) : null;
  // the basin: its rim and bowl (seen from above), the front apron, the pedestal, the tap; foam when he has been brushing
  function sup(cx, cz, hx, hz, y, n, p2) { const pts = []; n = n || 48; p2 = p2 || 2.8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pts.push([cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / p2) * hx, y, cz + Math.sign(s) * Math.pow(Math.abs(s), 2 / p2) * hz]); } return pts; }
  function basin(g, cam, foam) {
    const b = B.basin, cx = 0, cz = (b.z0 + 0) / 2, hx = (b.x1 - b.x0) / 2, hz = -b.z0 / 2, k = cam.k(0, b.y, cz);
    // the pedestal
    const ped = cam.xy([[-0.085, 0, -0.2], [0.085, 0, -0.2], [0.07, b.y - 0.12, -0.24], [-0.07, b.y - 0.12, -0.24]]);
    const pp = GG.piece(g, poly(ped).path(0.6, 911), { fill: P.basinSh, tex: 0.4, kind: 'card', seed: 912, lift: [-0.01 * k, 0], liftAlpha: 0.3, liftBlur: 8 }); cres(g, pp, -0.006 * k, 0, P.basin, 0.8);
    // the apron (the basin's outside, from the rim down)
    const rim = sup(cx, cz, hx, hz, b.y), low = sup(cx, cz + 0.02, hx * 0.86, hz * 0.8, b.y - 0.13);
    const ap = poly(hull(cam.xy(rim).concat(cam.xy(low)))).path(0.6, 913);
    shadow(g, ap, -0.02 * k, 0.03 * k, 0.03 * k, 0.3, '#3E4850');
    GG.piece(g, ap, { fill: P.basinSh, tex: 0.45, kind: 'card', seed: 914 });
    cres(g, ap, 0.012 * k, 0, P.basin, 0.85);
    // the rim, the bowl in it, the drain
    const rp = GG.piece(g, poly(cam.xy(rim)).path(0.4, 915), { fill: P.basin, tex: 0.4, kind: 'card', seed: 916 });
    cres(g, rp, 0, -0.004 * k, '#D3D8D9', 0.7);
    const bowl = poly(cam.xy(sup(cx, cz - 0.01, hx * 0.82, hz * 0.76, b.y))).path(0.4, 917);
    GG.piece(g, bowl, { fill: P.basinIn, tex: 0.4, kind: 'card', seed: 918 });
    onPieces(g, [bowl], t => { const q = cam.xy(sup(cx, cz + 0.04, hx * 0.9, hz * 0.7, b.y - 0.1)); t.fillStyle = P.basinSh; t.fill(poly(q).path(1.2, 919)); const q2 = cam.xy(sup(cx + 0.04, cz + 0.06, hx * 0.6, hz * 0.45, b.y - 0.13)); t.fillStyle = '#8E989E'; t.fill(poly(q2).path(1.5, 920)); });
    const dr = cam.p(0, b.y - 0.13, cz + 0.02); g.fillStyle = '#4E585F'; g.beginPath(); g.ellipse(dr[0], dr[1], 0.02 * k, 0.012 * k, 0, 0, 7); g.fill(); g.strokeStyle = P.chromeHi; g.lineWidth = Math.max(1, 0.003 * k); g.stroke();
    if (foam) {
      const r = O.rng('foam');
      [[0.02, 0.03, 0.03], [-0.05, 0.05, 0.018], [0.07, 0.0, 0.014], [0.0, -0.04, 0.012], [-0.02, 0.01, 0.022]].forEach(([dx2, dz2, rr], i) => {
        const fp = cam.xy(sup(dx2, cz + 0.02 + dz2, rr * 1.3, rr, b.y - 0.12 + 0.004, 18, 2)); const p2 = GG.piece(g, poly(fp).path(1.2, 921 + i), { fill: P.foam, tex: 0.35, kind: 'paper', seed: 930 + i });
        cres(g, p2, 0.003 * k, 0.003 * k, P.foamSh, 0.8);
      });
    }
    // the soap on the rim's right corner
    const so = cam.xy(sup(0.21, -0.06, 0.035, 0.022, b.y + 0.012, 20, 3)), sb = cam.xy(sup(0.21, -0.06, 0.035, 0.022, b.y + 0.001, 20, 3));
    const sp = GG.piece(g, poly(hull(so.concat(sb))).path(0.5, 940), { fill: P.soap, tex: 0.4, seed: 941, lift: [-0.006 * k, 0.004 * k], liftAlpha: 0.3, liftBlur: 4 }); cres(g, sp, 0, -0.002 * k, '#CFC9BF', 0.8);
    // the tap: a column at the back, its spout, its lever
    const col = cam.xy([[-0.016, b.y, -0.05], [0.016, b.y, -0.05], [0.016, b.y + 0.15, -0.05], [-0.016, b.y + 0.15, -0.05]]);
    const cp = GG.piece(g, poly(col).path(0.3, 942), { fill: P.chrome, tex: 0.25, seed: 943, lift: [-0.008 * k, 0.004 * k], liftAlpha: 0.35, liftBlur: 5 });
    cres(g, cp, -0.004 * k, 0, P.chromeHi, 0.9);
    const spout = cam.xy([[-0.012, b.y + 0.15, -0.05], [0.012, b.y + 0.15, -0.05], [0.01, b.y + 0.135, -0.17], [-0.01, b.y + 0.135, -0.17], [-0.01, b.y + 0.12, -0.17], [-0.012, b.y + 0.125, -0.05]]);
    const spp = GG.piece(g, poly(spout).path(0.3, 944), { fill: P.chrome, tex: 0.25, seed: 945 }); cres(g, spp, 0, -0.002 * k, P.chromeHi, 0.9);
    const lever = cam.xy([[-0.01, b.y + 0.15, -0.04], [0.01, b.y + 0.15, -0.04], [0.008, b.y + 0.2, -0.0], [-0.008, b.y + 0.2, -0.0]]); GG.piece(g, poly(lever).path(0.3, 946), { fill: P.chromeSh, tex: 0.25, seed: 947 });
  }
  // his towel on a ring, his half of the wall
  function towel(g, cam) {
    const [x, y] = B.towel, k = cam.k(x, y, 0);
    const ring = cam.xy(sup(x, -0.03, 0.06, 0.004, y + 0.06, 32, 2).map(p => [p[0], y + 0.06 + (p[2] + 0.03) * 0 + Math.sin(Math.atan2(p[2] + 0.03, p[0] - x)) * 0, -0.03]));
    const rr = cam.p(x, y + 0.06, -0.03); g.strokeStyle = P.chrome; g.lineWidth = Math.max(2, 0.008 * k); g.beginPath(); g.ellipse(rr[0], rr[1], 0.06 * k, 0.06 * k, 0, 0, 7); g.stroke();
    const tw = cam.xy([[x - 0.1, y + 0.02, -0.04], [x + 0.1, y + 0.02, -0.04], [x + 0.13, y - 0.42, -0.05], [x + 0.02, y - 0.47, -0.05], [x - 0.12, y - 0.44, -0.05]]);
    const tp = GG.piece(g, GG.blob(tw).path(1.4, 951), { fill: P.towel, tex: 0.65, kind: 'wool', seed: 952, lift: [-0.012 * k, 0.012 * k], liftAlpha: 0.4, liftBlur: 10 });
    cres(g, tp, 0.01 * k, -0.004 * k, P.towelHi, 0.8);
    const fold = cam.xy([[x - 0.02, y + 0.0, -0.045], [x - 0.0, y - 0.44, -0.05]]); g.strokeStyle = P.towelSh; g.lineWidth = Math.max(2, 0.008 * k); g.beginPath(); g.moveTo(fold[0][0], fold[0][1]); g.lineTo(fold[1][0], fold[1][1]); g.stroke();
  }

  // ================================================================ the cameras
  const CAM = {
    // the insert: level with the brushes, close; the glass on the centre line, the mirror's lower edge behind the heads
    glass: camera({ pos: [0, 1.16, -0.82], pitch: -0.05, f: 2150, place: [B.glass, 960, 790] }),
    // from the doorway, at his height: an elevation of the basin wall, the cabinet's seam on the centre line
    mirror: camera({ pos: [0, 1.82, -2.25], pitch: 0, f: 1780, place: [[0, B.cab.y1, MZ], 960, 64] }),
  };

  // ---------------------------------------------------------------- state
  const st = (s, view) => { s = s || {}; return { lift: clamp(s.lift || 0, 0, 1), brush: s.brush || (view === 'mirror' ? 'out' : 'in'), glow: s.glow == null ? 0 : clamp(s.glow, 0, 1), foam: s.foam ? 1 : 0, res: s.res || 1 }; };
  // where his brush is at a lift (0 in the glass .. 0.55 clear of the rim .. 1 taken up and out to the left)
  function brushPose(lift) {
    const b = B.hisBrush, u = clamp(lift / 0.55, 0, 1), w = clamp((lift - 0.55) / 0.45, 0, 1), e = FILM_EASE(u), e2 = FILM_EASE(w);
    const d = [b.tip[0] - b.base[0], b.tip[1] - b.base[1], b.tip[2] - b.base[2]], L = Math.hypot(...d), n = d.map(v => v / L);
    const up = 0.125 * e;                                                                 // slides up along its own axis
    let base = [b.base[0] + n[0] * up, b.base[1] + n[1] * up, b.base[2] + n[2] * up];
    // then lifts away up and left, turning upright
    base = [base[0] - 0.16 * e2, base[1] + 0.15 * e2, base[2] - 0.05 * e2];
    const ang = Math.atan2(n[0], n[1]) * (1 - e2), tip = [base[0] + Math.sin(ang) * L, base[1] + Math.cos(ang) * L, base[2] + n[2] * L * (1 - e2)];
    return { base, tip, face: b.face };
  }
  const FILM_EASE = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ================================================================ views
  // GLASS: the wall, the mirror's lower edge (the room and the brush heads reflected), the shelf, the glass, the two brushes
  function glassView() {
    const cam = CAM.glass;
    const behind = (c, res) => layer(c, 'glass:behind', g => {
      g.fillStyle = P.tileSh; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
      tileWall(g, cam, { pt: (u, v) => [u, v, 0], u0: -0.5, u1: 0.5, v0: 0.85, v1: 1.5 }, wallBand, cols4, 801, { cells: 40, tex: 0.55 });
      // the mirror cabinet's bottom edge and the mirror above it
      const clip = doorGlass(cam);
      reflectedRoom(g, cam, clip);
      // the brushes' heads reflected, just behind the real ones
      g.save(); g.clip(clip); brush(g, cam, { base: mirrorPt(B.herBrush.base), tip: mirrorPt(B.herBrush.tip), face: B.herBrush.face }, { dusty: true, shadow: false }); g.restore();
      mirrorVeil(g, cam, clip, 1);
      cabinetFrames(g, cam);
      shelf(g, cam); shelfThings(g, cam);
      glassBack(g, cam, B.glass);
      brush(g, cam, B.herBrush, { dusty: true });
    }, res);
    const hisRefl = (c, lift, res) => layer(c, 'glass:hisrefl:' + lift.toFixed(2), g => { const pose = brushPose(lift), clip = doorGlass(cam); g.save(); g.clip(clip); brush(g, cam, { base: mirrorPt(pose.base), tip: mirrorPt(pose.tip), face: pose.face }, { shadow: false }); g.restore(); mirrorVeil(g, cam, clip, 0.9); }, res);
    const hisAt = (c, lift, res) => { const L = (Math.round(lift * 24) / 24); return layer(c, 'glass:his:' + L.toFixed(3), g => brush(g, cam, brushPose(L)), res); };
    const front = (c, res) => layer(c, 'glass:front', g => glassFront(g, cam, B.glass), res);
    return {
      back(c, t, s) {
        s = st(s, 'glass'); blit(c, behind(c, s.res));
        if (s.brush !== 'out') { blit(c, hisAt(c, s.lift, s.res)); }
        blit(c, front(c, s.res));
        if (s.glow > 0) blitBox(c, glowLayer(c, cam, 'glass', s.res), GLOWBOX.glass, s.glow, 'screen');
      },
      front(c, t, s) { },
      cam,
      brushAt(s) { s = st(s, 'glass'); const p = brushPose(s.lift), a = cam.p(p.base), b = cam.p(p.tip), gr = cam.p(lerp(p.base[0], p.tip[0], 0.32), lerp(p.base[1], p.tip[1], 0.32), lerp(p.base[2], p.tip[2], 0.32)); return { grip: [Math.round(gr[0]), Math.round(gr[1]), Math.round(cam.k(...p.base))], base: [a[0], a[1]], tip: [b[0], b[1]], angle: Math.atan2(b[0] - a[0], -(b[1] - a[1])) }; },
    };
  }
  // the phone's smooth light on the shelf around it (it faces the room); a cropped layer drawn with the glow's alpha
  const GLOWBOX = {};
  function glowLayer(c, cam, name, res) {
    const ph = B.phone, k = cam.k(...ph), q = cam.p(ph[0], B.shelf.y, ph[2] - 0.06), r = 0.24 * k;
    const bx = GLOWBOX[name] = [Math.floor(q[0] - r), Math.floor(q[1] - r * 0.7), Math.ceil(2 * r), Math.ceil(1.4 * r)];
    return boxLayer(c, name + ':glow', bx, g => {
      const top = poly(cam.xy([[B.shelf.x0, B.shelf.y, B.shelf.z0], [B.shelf.x1, B.shelf.y, B.shelf.z0], [B.shelf.x1, B.shelf.y, 0], [B.shelf.x0, B.shelf.y, 0]])).path(0, 1);
      g.save(); g.clip(top); GG.glow(g, q[0], q[1], r, P.glow, 0.42, 'screen', 0.55); g.restore();
      const lip = poly(cam.xy([[B.shelf.x0, B.shelf.y - B.shelf.t, B.shelf.z0], [B.shelf.x1, B.shelf.y - B.shelf.t, B.shelf.z0], [B.shelf.x1, B.shelf.y, B.shelf.z0], [B.shelf.x0, B.shelf.y, B.shelf.z0]])).path(0, 1);
      g.save(); g.clip(lip); GG.glow(g, q[0], q[1], r * 0.8, P.glowHot, 0.35, 'screen', 0.6); g.restore();
    }, res);
  }
  // MIRROR: back() is the wall, the window and the mirror with the room in it; his reflection goes between (v.inMirror);
  // front() is the cabinet's frames, the shelf and everything on it, the basin, the towel. His real self, if drawn, goes after front().
  function mirrorView() {
    const cam = CAM.mirror, clip = doorGlass(cam);
    const behind = (c, res) => layer(c, 'mirror:behind', g => {
      g.fillStyle = P.tileSh; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
      tileWall(g, cam, backWall, wallBand, cols4, 701, { cells: 56 });
      [[B.leftX, [1, 0, 0], 3], [B.rightX, [-1, 0, 0], 1]].forEach(([x, n, bb], i) => { if (!cam.sees(n, [x, 1, -0.5])) return; tileWall(g, cam, { pt: (u, v) => [x, v, u], u0: -2.2, u1: 0, v0: 0, v1: B.ceil }, (u, v) => bb - (v < 0.8 ? 0.8 : 0), cols4, 702 + i, { cells: 20 }); });
      frostedWindow(g, cam);
      // the cabinet's shadow on the tiles under it
      const sh = cam.xy([[B.cab.x0 - 0.04, B.cab.y0, 0], [B.cab.x1, B.cab.y0, 0], [B.cab.x1 - 0.03, B.cab.y0 - 0.06, 0], [B.cab.x0 - 0.08, B.cab.y0 - 0.07, 0]]); g.save(); g.filter = 'blur(6px)'; g.globalAlpha = 0.3; g.fillStyle = '#3E4850'; g.fill(poly(sh).path(0, 1)); g.restore();
      reflectedRoom(g, cam, clip);
      // what stands on the shelf, seen again in the glass (the backs of the brushes, the glass)
      g.save(); g.clip(clip); brush(g, cam, { base: mirrorPt(B.herBrush.base), tip: mirrorPt(B.herBrush.tip), face: B.herBrush.face }, { dusty: true, shadow: false }); g.restore();
      mirrorVeil(g, cam, clip, 1);
    }, res);
    const reflBrush = (c, res) => layer(c, 'mirror:hisrefl', g => { g.save(); g.clip(clip); brush(g, cam, { base: mirrorPt(B.hisBrush.base), tip: mirrorPt(B.hisBrush.tip), face: B.hisBrush.face }, { shadow: false }); g.restore(); mirrorVeil(g, cam, clip, 0.9); }, res);
    const front = (c, foam, res) => layer(c, 'mirror:front:' + foam, g => {
      cabinetFrames(g, cam); towel(g, cam);
      shelf(g, cam); shelfThings(g, cam);
      basin(g, cam, foam);
      glassBack(g, cam, B.glass); brush(g, cam, B.herBrush, { dusty: true });
    }, res);
    const hisIn = (c, res) => layer(c, 'mirror:hisbrush', g => brush(g, cam, B.hisBrush), res);
    const glassF = (c, res) => layer(c, 'mirror:glassfront', g => glassFront(g, cam, B.glass), res);
    return {
      back(c, t, s) { s = st(s, 'mirror'); blit(c, behind(c, s.res)); if (s.brush === 'in') blit(c, reflBrush(c, s.res)); },
      front(c, t, s) {
        s = st(s, 'mirror'); blit(c, front(c, s.foam, s.res));
        if (s.brush === 'in') blit(c, hisIn(c, s.res));
        blit(c, glassF(c, s.res));
        if (s.glow > 0) blitBox(c, glowLayer(c, cam, 'mirror', s.res), GLOWBOX.mirror, s.glow, 'screen');
      },
      // draw fn(g) clipped to the mirror's glass, then lay the glass's cold veil and sheen over it (for his reflection)
      inMirror(c, fn, strength) { const g = c.g; g.save(); g.clip(clip); fn(g); g.restore(); mirrorVeil(g, cam, clip, strength == null ? 0.8 : strength); },
      mirrorPath: clip,
      cam,
    };
  }

  // ================================================================ anchors, light, split
  const A = (cam, p) => { const q = cam.p(p); return [Math.round(q[0]), Math.round(q[1]), Math.round(cam.k(p[0], p[1], p[2]))]; };
  const views = { glass: glassView(), mirror: mirrorView() };
  {
    const g = CAM.glass, m = CAM.mirror;
    views.glass.anchors = { glass: A(g, [0, B.glass[1] + B.glassH, B.glass[2]]), brush: views.glass.brushAt({ lift: 0 }).grip, dusty: A(g, B.herBrush.tip), phone: A(g, B.phone), handFrom: [-60, 980] };
    views.glass.light = { x: 2300, y: 300, color: '#D3D8D9', kind: 'window', dir: [-1, 0.2] };
    views.glass.split = +(A(g, B.glass)[0] / W).toFixed(3);
    views.mirror.anchors = { reflection: A(m, mirrorPt(B.face)), back: A(m, [B.face[0], B.face[1] + 0.02, B.face[2] - 0.1]), basin: A(m, B.basinAt), tap: A(m, [0, B.basin.y + 0.13, -0.17]), phone: A(m, B.phone), glass: A(m, [0, B.glass[1] + B.glassH, B.glass[2]]), dusty: A(m, B.herBrush.tip), window: A(m, [(B.window.x0 + B.window.x1) / 2, 1.5, 0.11]) };
    views.mirror.light = { x: views.mirror.anchors.window[0], y: views.mirror.anchors.window[1], color: '#D3D8D9', kind: 'window' };
    views.mirror.split = +(A(m, [0, 1.5, MZ])[0] / W).toFixed(3);
    views.mirror.phoneLean = B.phoneLean; views.glass.phoneLean = B.phoneLean;
  }

  // ================================================================ demos (4 s each)
  // stand-ins only for judging the sheets: the phone (gloss, portrait, leaning back) and a flat paper figure for him
  function standInPhone(c, v, lit) {
    const a = v.anchors.phone, k = a[2], gl = c.gl, w = 0.071 * k, h = 0.147 * k * Math.cos(B.phoneLean);
    gl.save(); gl.translate(a[0], a[1]);
    gl.fillStyle = '#000000'; gl.beginPath(); gl.roundRect(-w / 2, -h / 2, w, h, w * 0.16); gl.fill();
    if (lit) { const gr = gl.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#2A1E3A'); gr.addColorStop(1, '#3A2440'); gl.fillStyle = gr; gl.beginPath(); gl.roundRect(-w / 2 + w * 0.06, -h / 2 + w * 0.06, w * 0.88, h - w * 0.12, w * 0.12); gl.fill();
      const bg = gl.createLinearGradient(-w * 0.4, 0, w * 0.4, 0); bg.addColorStop(0, '#FF8FB1'); bg.addColorStop(1, '#B48CFF'); gl.fillStyle = bg; gl.beginPath(); gl.roundRect(-w * 0.38, -h * 0.34, w * 0.76, h * 0.12, w * 0.06); gl.fill(); }
    gl.restore();
  }
  function standInHim(c, v) {
    const r = v.anchors.reflection, b = v.anchors.back;
    v.inMirror(c, g => { g.fillStyle = '#6B5348'; const k = r[2]; g.beginPath(); g.ellipse(r[0], r[1] - 0.02 * k, 0.085 * k, 0.12 * k, 0, 0, 7); g.fill(); g.fillStyle = '#3E4A47'; g.beginPath(); g.ellipse(r[0], r[1] + 0.33 * k, 0.24 * k, 0.17 * k, 0, 0, 7); g.fill(); });
    return b;
  }
  function standInBack(c, v) { const b = v.anchors.back, k = b[2], g = c.g; g.save(); g.fillStyle = '#2B2826'; g.globalAlpha = 0.92; g.beginPath(); g.ellipse(b[0], b[1], 0.09 * k, 0.115 * k, 0, 0, 7); g.fill(); g.fillStyle = '#2F3836'; g.beginPath(); g.ellipse(b[0] + 0.02 * k, b[1] + 0.32 * k, 0.25 * k, 0.2 * k, 0, 0, 7); g.fill(); g.restore(); }
  const demo = (name, view, s, mid, after) => ({ name, draw(c, t) { const v = views[view], ss2 = typeof s === 'function' ? s(t) : s; v.back(c, t, ss2); if (mid) mid(c, v, t); v.front(c, t, ss2); if (after) after(c, v, t); } });
  SETS.bathroom = {
    views, room: B,
    demos: [
      demo('glass: morning, both brushes in', 'glass', { lift: 0 }, null, (c, v) => standInPhone(c, v, false)),
      demo('glass: his brush lifted out (animated)', 'glass', t => ({ lift: clamp((t - 0.4) / 2.6, 0, 1) })),
      demo('glass: lift 0.5, clear of the rim', 'glass', { lift: 0.5 }),
      demo('mirror: morning (his brush out)', 'mirror', { brush: 'out' }, null, (c, v) => standInPhone(c, v, false)),
      demo('mirror: the phone lit, foam', 'mirror', { brush: 'out', glow: 1, foam: 1 }, (c, v) => standInHim(c, v), (c, v) => { standInBack(c, v); standInPhone(c, v, true); }),
      demo('mirror: both brushes in the glass', 'mirror', { brush: 'in' }),
    ],
  };
})();
