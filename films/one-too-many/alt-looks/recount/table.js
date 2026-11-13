/* RECOUNT - THE COUNT: locked orthographic overhead of the borrowed round table under the pendant.
   One layout table feeds every view: seats, piles, glasses, the seat-width gap at Scott's right. */
(function (G) {
  'use strict';
  const { P, rgba, mix, clamp, lerp, lin, rad, paper, rim, polyPath, smooth, smoothPath, pool, blob, cast } = RC;
  const D2R = Math.PI / 180;
  const LAYOUT = {
    c: [960, 548], tr: 300, seatR: 428, pileR: 212,
    // angles in screen degrees (y down). Scott at the bottom; his right = screen right (he faces up).
    seats: [
      { id: 'scott', a: 90 }, { id: 'GAP', a: 90 - 360 / 7 }, { id: 'angelo', a: 90 - 2 * 360 / 7 }, { id: 'christof', a: 90 - 3 * 360 / 7 },
      { id: 'deena', a: 90 - 4 * 360 / 7 }, { id: 'marina', a: 90 - 5 * 360 / 7 }, { id: 'kay', a: 90 - 6 * 360 / 7 },
    ],
  };
  const at = (a, r) => [LAYOUT.c[0] + Math.cos(a * D2R) * r, LAYOUT.c[1] + Math.sin(a * D2R) * r];

  // person seen from directly above. local frame: origin = head centre, +y toward the table, +x = person's LEFT... (we mirror so +x is their right)
  function xfLocal(cx, cy, ang) { // ang = direction the person faces (toward table), radians
    const fx = Math.cos(ang), fy = Math.sin(ang), rx = -fy, ry = fx; // right-hand vector (screen) when facing (fx,fy): rotate +90 -> (−fy, fx)
    return (x, y) => [cx + rx * x + fx * y, cy + ry * x + fy * y];
  }
  const COSTUME = {
    scott: { cloth: P.oxford, sleeve: 'roll', skin: P.skin.scott, hair: P.hair.scott },
    kay: { cloth: P.rain, skin: P.skin.kay, hair: P.hair.kay, nails: P.lipstick },
    marina: { cloth: '#5A1220', skin: P.skin.marina, hair: P.hair.marina, rings: true, rib: true },
    christof: { cloth: P.bottle, skin: P.skin.christof, hair: P.hair.christof, cord: true },
    deena: { cloth: P.mustard, skin: P.skin.deena, hair: P.hair.deena, rib: true },
    angelo: { cloth: P.cardBack, skin: P.skin.angelo, hair: P.hair.angelo, tee: true },
  };

  // light model for the overhead: pendant above L; returns 0..1 intensity at a point
  function lightAt(L, x, y) { const d = Math.hypot(x - L.x, y - L.y) / L.r; return clamp(1 - Math.pow(Math.max(0, d - L.core) / (1 - L.core), 1.6), 0, 1); }

  function chair(g, seat, L) {
    const ang = (seat.a + 180) * D2R, [hx, hy] = at(seat.a, LAYOUT.seatR), X = xfLocal(hx, hy, ang);
    const seatP = polyPath(smooth([X(-58, -28), X(58, -28), X(62, 40), X(-62, 40)], true, 4));
    const back = polyPath(smooth([X(-74, -70), X(-40, -92), X(40, -92), X(74, -70), X(70, -56), X(36, -76), X(-36, -76), X(-70, -56)], true, 6));
    const lk = lightAt(L, hx, hy);
    paper(g, seatP, mix(P.walnut, '#000000', 0.35), { shadow: { dx: 0, dy: 0, blur: 14, alpha: 0.6 } });
    paper(g, back, mix(P.walnut, P.tungsten, 0.12 * lk), { shadow: { dx: (hx - L.x) * 0.03, dy: (hy - L.y) * 0.03, blur: 10, alpha: 0.7 },
      shade: (h) => { const [a, b] = X(0, -100), [c, d] = X(0, -60); h.fillStyle = lin(h, a, b, c, d, [[0, '#000000', 0.5], [1, P.tungsten, 0.25 * lk]]); h.fillRect(0, 0, 1920, 1080); } });
    return X;
  }

  // ---- top-down hair silhouettes (identity lives in the silhouette) ----
  function hairTop(g, id, X, s, L, hx, hy) {
    const lk = lightAt(L, hx, hy); const dirToL = Math.atan2(L.y - hy, L.x - hx);
    const sheen = (h, col, k) => { const sx = hx + Math.cos(dirToL) * s * 0.18, sy = hy + Math.sin(dirToL) * s * 0.18; h.save(); h.globalCompositeOperation = 'screen'; h.fillStyle = rad(h, sx, sy, 0, s * 0.55, [[0, col, 0.55 * k], [0.6, col, 0.15 * k], [1, col, 0]]); h.fillRect(sx - s, sy - s, s * 2, s * 2); h.restore(); };
    const sh = { dx: (hx - L.x) * 0.05, dy: (hy - L.y) * 0.05, blur: 16, alpha: 0.7 };
    if (id === 'deena') {
      // big round afro puff + hoops
      const r = OTM.rng('afro'); const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; const rr = s * 0.78 * (1 + (r() - 0.5) * 0.07 + 0.03 * Math.sin(a * 9)); const p = X(Math.cos(a) * rr, -s * 0.12 + Math.sin(a) * rr); pts.push(p); }
      const p = polyPath(pts, true);
      paper(g, p, mix(P.hair.deena, '#000000', 0.2), { shadow: sh, shade: (h) => { sheen(h, '#8A5A3A', lk);
        const rr = OTM.rng('kink'); h.save(); h.globalCompositeOperation = 'screen'; for (let i = 0; i < 260; i++) { const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * s * 0.75; const [x, y] = X(Math.cos(a) * d, -s * 0.12 + Math.sin(a) * d); h.strokeStyle = rgba('#B07850', 0.12 + 0.18 * lk); h.lineWidth = 1.2; h.beginPath(); h.arc(x, y, 2 + rr() * 2.5, rr() * 6, rr() * 6 + 3); h.stroke(); } h.restore(); },
        rim: { dx: Math.cos(dirToL), dy: Math.sin(dirToL), w: 2.5, color: P.tcore, alpha: 0.55 * lk } });
      // hoops at the ears (either side of the head, under the puff edge)
      [-1, 1].forEach(side => { const [x, y] = X(side * s * 0.5, s * 0.22); g.save(); g.strokeStyle = '#D9A520'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(x, y, s * 0.12, s * 0.16, 0, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#FFF1C8'; g.shadowColor = '#FFD980'; g.shadowBlur = 10; g.beginPath(); g.arc(x - s * 0.06, y - s * 0.1, 2.6, 0, Math.PI * 2); g.fill(); g.restore(); });
      return;
    }
    if (id === 'christof') {
      // auburn curly mop (bumpy outline + curls), short full beard peeking at the front
      const beard = polyPath(smooth([X(-s * 0.36, s * 0.18), X(-s * 0.3, s * 0.5), X(0, s * 0.62), X(s * 0.3, s * 0.5), X(s * 0.36, s * 0.18)], false, 6).concat([X(0, s * 0.2)]), true);
      paper(g, beard, mix('#6A2A12', '#000000', 0.15), { shadow: sh, shade: (h) => sheen(h, '#D06A3A', lk * 0.7) });
      const r = OTM.rng('curls'); const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; for (let k = 0; k < 4; k++) { const aa = a + k / 4 * (Math.PI * 2 / 18); const bump = Math.pow(Math.sin(k / 4 * Math.PI), 0.6); const rr = s * (0.5 + 0.06 * bump + (r() - 0.5) * 0.02); pts.push(X(Math.cos(aa) * rr * 1.02, -s * 0.06 + Math.sin(aa) * rr)); } }
      const p = polyPath(pts, true);
      paper(g, p, P.hair.christof, { shadow: sh, shade: (h) => { sheen(h, '#F09050', lk);
        h.save(); for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s * 0.42; const [x, y] = X(Math.cos(a) * d, -s * 0.06 + Math.sin(a) * d); h.strokeStyle = rgba('#3A1408', 0.55); h.lineWidth = 2; h.beginPath(); h.arc(x, y, 4 + r() * 4, r() * 6, r() * 6 + 4); h.stroke(); h.strokeStyle = rgba('#FFB070', 0.35 * lk); h.lineWidth = 1.2; h.beginPath(); h.arc(x - 1, y - 1, 3 + r() * 3, r() * 6, r() * 6 + 2); h.stroke(); } h.restore(); },
        rim: { dx: Math.cos(dirToL), dy: Math.sin(dirToL), w: 2.5, color: P.tcore, alpha: 0.6 * lk } });
      return;
    }
    // smooth styles: head oval
    const head = polyPath(smooth([X(0, -s * 0.52), X(s * 0.38, -s * 0.36), X(s * 0.43, 0), X(s * 0.36, s * 0.36), X(0, s * 0.48), X(-s * 0.36, s * 0.36), X(-s * 0.43, 0), X(-s * 0.38, -s * 0.36)], true, 6));
    if (id === 'kay') {
      // shoulder-length straight black hair, wet: falls onto the shoulders behind, centre part, specular beads
      const fall = polyPath(smooth([X(-s * 0.46, -s * 0.05), X(-s * 0.62, -s * 0.55), X(-s * 0.4, -s * 0.95), X(0, -s * 1.02), X(s * 0.4, -s * 0.95), X(s * 0.62, -s * 0.55), X(s * 0.46, -s * 0.05), X(s * 0.3, s * 0.3), X(-s * 0.3, s * 0.3)], true, 6));
      paper(g, fall, P.hair.kay, { shadow: sh, shade: (h) => { sheen(h, '#7A8A9A', lk * 0.6);
        h.save(); h.globalCompositeOperation = 'screen'; for (let i = -6; i <= 6; i++) { const [a, b] = X(i * s * 0.04, s * 0.2), [c, d] = X(i * s * 0.085, -s * 0.98); h.strokeStyle = rgba('#9FB2C2', 0.1 + 0.12 * lk); h.lineWidth = 1.4; h.beginPath(); h.moveTo(a, b); h.lineTo(c, d); h.stroke(); }
          const rr = OTM.rng('beads'); for (let i = 0; i < 26; i++) { const [x, y] = X((rr() - 0.5) * s * 0.9, -s * 0.9 + rr() * s * 1.0); h.fillStyle = rgba('#EAF2F8', 0.55 + rr() * 0.4); h.beginPath(); h.arc(x, y, 1 + rr() * 1.4, 0, Math.PI * 2); h.fill(); } h.restore();
          const [a, b] = X(0, s * 0.3), [c, d] = X(0, -s * 0.5); h.strokeStyle = rgba(mix(P.skin.kay, '#000000', 0.4), 0.8); h.lineWidth = 2; h.beginPath(); h.moveTo(a, b); h.lineTo(c, d); h.stroke(); },
        rim: { dx: Math.cos(dirToL), dy: Math.sin(dirToL), w: 2, color: '#BFD3E6', alpha: 0.45 * lk } });
      return;
    }
    const col = id === 'angelo' ? P.hair.angelo : id === 'marina' ? P.hair.marina : P.hair.scott;
    if (id === 'marina') { // low chignon at the back of the head, a pen stuck through it
      const [bx, by] = X(0, -s * 0.5); const bun = new Path2D(); bun.ellipse(bx, by, s * 0.26, s * 0.22, Math.atan2(by - hy, bx - hx), 0, Math.PI * 2);
      paper(g, bun, col, { shadow: sh, shade: (h) => { sheen(h, '#8A6A5A', lk); h.strokeStyle = rgba('#5A4038', 0.6); h.lineWidth = 1.2; for (let k = 0; k < 3; k++) { h.beginPath(); h.ellipse(bx, by, s * (0.08 + k * 0.06), s * (0.06 + k * 0.05), 0.4, 0.3, 4.5); h.stroke(); } } });
    }
    paper(g, head, col, { shadow: sh, shade: (h) => {
      sheen(h, id === 'angelo' ? '#9AA6B8' : '#8A6A5A', lk * (id === 'angelo' ? 1.1 : 0.8));
      h.save(); h.globalCompositeOperation = 'screen'; h.lineCap = 'round';
      if (id === 'angelo') { for (let i = -5; i <= 5; i++) { const [a, b] = X(i * s * 0.06, s * 0.42), [m1, m2] = X(i * s * 0.075, 0), [c, d] = X(i * s * 0.05, -s * 0.5); h.strokeStyle = rgba('#C8D2E0', 0.12 + 0.16 * lk); h.lineWidth = 1.5; h.beginPath(); h.moveTo(a, b); h.quadraticCurveTo(m1, m2, c, d); h.stroke(); } }
      if (id === 'marina') { const [a, b] = X(s * 0.08, s * 0.46), [c, d] = X(0, -s * 0.4); h.strokeStyle = rgba(mix(P.skin.marina, '#000000', 0.3), 0.9); h.lineWidth = 2; h.beginPath(); h.moveTo(a, b); h.lineTo(c, d); h.stroke(); for (let i = -4; i <= 4; i++) { const [p1, p2] = X(s * 0.08 + i * 0.015 * s, s * 0.4), [q1, q2] = X(i * s * 0.09, -s * 0.45); h.strokeStyle = rgba('#B09080', 0.1 + 0.1 * lk); h.lineWidth = 1.2; h.beginPath(); h.moveTo(p1, p2); h.lineTo(q1, q2); h.stroke(); } }
      if (id === 'scott') { const [wx, wy] = X(s * 0.08, -s * 0.2); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; h.strokeStyle = rgba('#9A7A60', 0.12 + 0.12 * lk); h.lineWidth = 1.4; h.beginPath(); h.moveTo(wx, wy); h.quadraticCurveTo(wx + Math.cos(a) * s * 0.2, wy + Math.sin(a) * s * 0.2, wx + Math.cos(a + 0.8) * s * 0.42, wy + Math.sin(a + 0.8) * s * 0.42); h.stroke(); } }
      h.restore();
    }, rim: { dx: Math.cos(dirToL), dy: Math.sin(dirToL), w: 2, color: P.tcore, alpha: 0.5 * lk } });
    if (id === 'marina') { // the pen through the bun
      const [a, b] = X(-s * 0.36, -s * 0.36), [c, d] = X(s * 0.3, -s * 0.66); g.save(); g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 6; g.shadowOffsetX = (hx - L.x) * 0.02; g.shadowOffsetY = (hy - L.y) * 0.02;
      g.strokeStyle = '#1E2A48'; g.lineWidth = 6; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.shadowColor = 'transparent';
      g.strokeStyle = '#D8DDE2'; g.lineWidth = 6; g.beginPath(); g.moveTo(c, d); g.lineTo(c + (c - a) * 0.12, d + (d - b) * 0.12); g.stroke();
      g.strokeStyle = 'rgba(220,230,240,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a + 1, b - 1); g.lineTo(c + 1, d - 1); g.stroke(); g.restore();
    }
    if (id === 'scott') { // cowlick flick at the crown
      const [a, b] = X(-s * 0.02, -s * 0.12), [c, d] = X(s * 0.22, -s * 0.42), [e, f] = X(s * 0.14, -s * 0.06); const p = new Path2D(); p.moveTo(a, b); p.quadraticCurveTo(c, d, ...X(s * 0.4, -s * 0.22)); p.quadraticCurveTo(e, f, a, b);
      paper(g, p, mix(col, '#B08A68', 0.45), { shadow: { dx: 4, dy: 4, blur: 5, alpha: 0.8 }, rim: { dx: L.x - hx, dy: L.y - hy, w: 2, color: P.tcore, alpha: 0.8 } });
    }
    if (id === 'angelo') { // the unlit cigarette behind his right ear
      const [a, b] = X(s * 0.36, s * 0.02), [c, d] = X(s * 0.5, s * 0.34); g.save(); g.lineCap = 'butt'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 3;
      g.strokeStyle = '#F2EEE6'; g.lineWidth = 5.5; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.shadowColor = 'transparent'; g.strokeStyle = '#C8823A'; g.beginPath(); g.moveTo(a, b); g.lineTo(a + (c - a) * 0.28, b + (d - b) * 0.28); g.stroke(); g.restore();
    }
  }

  G.TBL = { LAYOUT, at, xfLocal, COSTUME, lightAt, chair, hairTop, D2R };
})(window);
