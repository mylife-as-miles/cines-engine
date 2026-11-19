/* Crownfall arena skies: the two skies the chess arenas stand under, painted in code with the kit (window.KIT).

   SKIES.paint('eclipse' | 'violet') returns a canvas holding a cylindrical panorama, PW x PH:
     across  the whole horizon, azimuth -180..+180 degrees, with the eclipse at the centre (azimuth 0);
     down    elevation TOP (+78 degrees, top row) to BOTTOM (-12 degrees, bottom row); the horizon is at elevation 0.
   The game wraps it on a dome behind the arena and adds what must stay sharp or move in its own shader: the stars, the
   drifting cloud, the aurora and the eclipse itself. Here are the things a painter would lay in first: the fall of light
   from the eclipse, the glow all round the horizon, the far cloud, the river of stars, and the broken skyline of a
   kingdom older than the arena. Deterministic: seeded hash noise only, so the same sky is painted every time. */
(function () {
  'use strict';
  const K = window.KIT, { clamp, lerp, smooth, hash, rng } = K;
  const PW = 4096, PH = 1280, TOP = 78, BOTTOM = -12, RAD = Math.PI / 180;
  const ECLIPSE_EL = 20.3;                                  // where the game hangs the eclipse (atan(85 / 230))

  // value noise that wraps in x every `period` cells, so the panorama has no seam
  function pnoise(x, y, period, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const xa = ((x0 % period) + period) % period, xb = (xa + 1) % period;
    const a = hash(xa, y0, seed), b = hash(xb, y0, seed), c = hash(xa, y0 + 1, seed), d = hash(xb, y0 + 1, seed);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  function pfbm(x, y, period, oct, seed) {
    let f = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < oct; o++) { f += amp * pnoise(x, y, period, seed + o * 17); norm += amp; amp *= 0.5; x *= 2; y *= 2; period *= 2; }
    return f / norm;
  }
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // a colour ramp over elevation: stops are [elevation, '#rrggbb'], highest first
  function ramp(stops) {
    const S = stops.map(([e, c]) => [e, hex(c)]);
    return (el, out) => {
      if (el >= S[0][0]) { out[0] = S[0][1][0]; out[1] = S[0][1][1]; out[2] = S[0][1][2]; return; }
      for (let i = 1; i < S.length; i++) if (el >= S[i][0]) {
        const t = smooth((el - S[i][0]) / (S[i - 1][0] - S[i][0])), a = S[i][1], b = S[i - 1][1];
        out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return;
      }
      const L = S[S.length - 1][1]; out[0] = L[0]; out[1] = L[1]; out[2] = L[2];
    };
  }

  const LOOKS = {
    // A warm eclipse at midday: the sky falls to dusk, and all round the horizon runs the ring of sunset light that a
    // total eclipse leaves there. Below the horizon, the red breath of the lava.
    eclipse: {
      sky: ramp([[78, '#17121c'], [52, '#231a22'], [30, '#3b2826'], [14, '#6e3d27'], [5, '#b4683a'], [0.5, '#d99355'], [-1.5, '#7a3a22'], [-6, '#3a130c'], [-12, '#1c0806']]),
      halo: [255, 176, 96], haloNear: 1.0, haloFar: 0.42,
      cloudDark: [38, 26, 30], cloudLit: [255, 170, 104], cloudAmount: 0.62, cloudSeed: 311,
      ridge: [[26, 17, 18], [44, 27, 24], [78, 46, 34]],           // near, middle, far skyline (the far one takes the horizon's light)
      stars: null,
      seed: 1201,
    },
    // A violet night: the dark moon in its ring, the river of stars high across the sky, a cold teal breath of airglow
    // above a horizon lost in violet mist.
    violet: {
      sky: ramp([[78, '#04030c'], [55, '#090720'], [32, '#150f38'], [15, '#241a52'], [6, '#35296c'], [1.5, '#48407f'], [-1, '#2a2050'], [-6, '#150c26'], [-12, '#0a0612']]),
      halo: [150, 108, 255], haloNear: 0.75, haloFar: 0.3,
      cloudDark: [14, 10, 34], cloudLit: [168, 132, 255], cloudAmount: 0.4, cloudSeed: 733,
      ridge: [[9, 7, 22], [18, 13, 40], [38, 30, 76]],
      stars: { band: [200, 208, 255], warm: [255, 196, 236] },
      seed: 2207,
    },
  };

  function paint(name) {
    const L = LOOKS[name]; if (!L) throw new Error('unknown sky ' + name);
    const c = K.canvas(PW, PH), x = c.getContext('2d'), img = x.createImageData(PW, PH), d = img.data;
    const col = [0, 0, 0], sinE0 = Math.sin(ECLIPSE_EL * RAD), cosE0 = Math.cos(ECLIPSE_EL * RAD);
    // the river of stars lies along a great circle tilted across the sky (its pole N)
    const N = (() => { const a = 62 * RAD, b = 38 * RAD; return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)]; })();
    const cosAz = new Float32Array(PW), sinAz = new Float32Array(PW);
    for (let i = 0; i < PW; i++) { const az = ((i + 0.5) / PW - 0.5) * 360 * RAD; cosAz[i] = Math.cos(az); sinAz[i] = Math.sin(az); }
    for (let j = 0; j < PH; j++) {
      const el = TOP - (j + 0.5) / PH * (TOP - BOTTOM), sinE = Math.sin(el * RAD), cosE = Math.cos(el * RAD);
      for (let i = 0; i < PW; i++) {
        const u = (i + 0.5) / PW, az = (u - 0.5) * 360;
        L.sky(el, col);
        let r = col[0], g = col[1], b = col[2];
        // angular distance from the eclipse
        const cd = clamp(sinE * sinE0 + cosE * cosE0 * cosAz[i], -1, 1), dist = Math.acos(cd) / RAD;
        // the horizon's ring of light is uneven, and strongest under the eclipse
        const ring = Math.exp(-Math.pow(Math.abs(el - 1.2) / 7, 1.4)) * (0.55 + 0.75 * pfbm(u * 9, 3.7, 9, 3, L.seed + 5)) * (0.75 + 0.5 * Math.exp(-Math.abs(az) / 70));
        if (name === 'eclipse') { r += 70 * ring; g += 34 * ring; b += 10 * ring; }
        else { r += 10 * ring; g += 34 * ring; b += 42 * ring; }               // the teal airglow
        // the fall of light from the eclipse: a near glow and a far one, and faint rays out of it
        const near = Math.exp(-Math.pow(dist / 10, 1.25)), far = Math.exp(-dist / 34);
        const phi = Math.atan2(el - ECLIPSE_EL, az * cosE0), rays = Math.pow(pnoise((phi / (2 * Math.PI) + 0.5) * 48, 0.5, 48, L.seed + 9), 2.2) * Math.exp(-dist / 30) * smooth((dist - 4) / 10);
        const hl = (near * L.haloNear + far * L.haloFar + rays * 0.42) * (el > -2 ? 1 : Math.max(0, 1 + (el + 2) / 6));
        r += L.halo[0] * hl * 0.62; g += L.halo[1] * hl * 0.62; b += L.halo[2] * hl * 0.62;
        // the river of stars (the violet night only): a band of unresolved light with dark lanes and warm knots
        if (L.stars && el > -1) {
          const dir0 = cosE * sinAz[i], dir1 = sinE, dir2 = -cosE * cosAz[i];
          const off = Math.asin(clamp(dir0 * N[0] + dir1 * N[1] + dir2 * N[2], -1, 1)) / RAD;
          const along = Math.atan2(dir0 * N[2] - dir2 * N[0], dir1) / (2 * Math.PI) + 0.5;
          const body = Math.exp(-Math.pow(off / 10, 2)), n1 = pfbm(along * 14, off * 0.14 + 20, 14, 5, L.seed + 21), lane = Math.exp(-Math.pow((off + (n1 - 0.5) * 11) / 3.4, 2)) * (0.35 + 0.65 * pfbm(along * 28, 1.3, 28, 3, L.seed + 27));
          const dens = clamp(body * (0.25 + 1.25 * n1) - lane * 0.4 * body, 0, 1) * smooth((el + 1) / 14);
          const warm = pfbm(along * 6, off * 0.1 + 3, 6, 3, L.seed + 33);
          r += lerp(L.stars.band[0], L.stars.warm[0], warm) * dens * 0.36; g += lerp(L.stars.band[1], L.stars.warm[1], warm) * dens * 0.36; b += lerp(L.stars.band[2], L.stars.warm[2], warm) * dens * 0.36;
          // star dust: single bright texels, thick inside the band and thin outside it
          const h = hash(i, j, L.seed + 41); if (h > 0.9972 - dens * 0.012) { const s = 40 + 150 * hash(i, j, L.seed + 43); r += s; g += s; b += s * 1.05; }
          // nebula: slow violet and rose veils through the middle sky
          const veil = Math.pow(pfbm(u * 5, el * 0.045 + 7, 5, 4, L.seed + 51), 2.4) * smooth((el - 6) / 22) * 0.9;
          r += 86 * veil; g += 30 * veil; b += 120 * veil;
        }
        // far cloud: a flat layer seen in perspective (so it crowds into streaks towards the horizon), clear round the
        // eclipse; the side of each mass that faces the eclipse takes its light
        if (el > -0.5) {
          const high = smooth((el - 3) / 7), cot = 1 / Math.tan(Math.max(el, 2.2) * RAD), sc = 0.62;
          const qx = sinAz[i] * cot * sc + 31.7, qy = -cosAz[i] * cot * sc + 17.3, ex = 31.7, ey = -(1 / Math.tan(ECLIPSE_EL * RAD)) * sc + 17.3;
          let tx = ex - qx, ty = ey - qy; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const oct = el > 12 ? 5 : el > 6 ? 4 : 3;
          const plane = K.fbm(qx, qy, oct, L.cloudSeed), planeL = K.fbm(qx + tx * 0.07, qy + ty * 0.07, oct, L.cloudSeed);
          const band = pfbm(u * 10, el * 0.8 + 4, 10, 3, L.cloudSeed + 3), bandL = pfbm(u * 10 + (az > 0 ? -0.04 : 0.04), el * 0.8 + 4, 10, 3, L.cloudSeed + 3);
          const cn = band + (plane - band) * high, cnL = bandL + (planeL - bandL) * high;
          const cover = smooth((cn - (1 - L.cloudAmount)) / 0.2) * smooth((el + 0.5) / 4) * smooth((dist - 7) / 16) * (1 - 0.35 * smooth((el - 50) / 25));
          if (cover > 0.002) {
            const edge = clamp((cn - cnL) * 11 + 0.2, 0, 1), light = clamp(edge * (0.22 + 1.6 * far + 1.3 * near), 0, 1);
            const cr = L.cloudDark[0] + (L.cloudLit[0] - L.cloudDark[0]) * light, cg = L.cloudDark[1] + (L.cloudLit[1] - L.cloudDark[1]) * light, cb = L.cloudDark[2] + (L.cloudLit[2] - L.cloudDark[2]) * light;
            const a = cover * 0.8; r = r * (1 - a) + cr * a; g = g * (1 - a) + cg * a; b = b * (1 - a) + cb * a;
          }
        }
        // the painter's hand: slow mottling, long strokes along the sky, and a grain that also breaks any banding
        const mot = pfbm(u * 20, el * 0.16, 20, 3, L.seed + 61) - 0.5, stroke = pfbm(u * 70, el * 0.9, 70, 2, L.seed + 67) - 0.5, grain = hash(i, j, L.seed + 71) - 0.5;
        const k = 1 + mot * 0.16 + stroke * 0.07;
        const o = (j * PW + i) * 4;
        d[o] = clamp(r * k + grain * 3.2, 0, 255); d[o + 1] = clamp(g * k + grain * 3.2, 0, 255); d[o + 2] = clamp(b * k + grain * 3.2, 0, 255); d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    skyline(x, L, name);
    return c;
  }

  // The broken skyline: three ranges one behind another, each paler with distance, and on them what is left of an older
  // kingdom (towers, a run of arches, standing stones). Drawn three times across so shapes that cross the seam match.
  function skyline(x, L, name) {
    const yOf = el => (TOP - el) / (TOP - BOTTOM) * PH, pxPerDeg = PW / 360;
    const layers = [
      { col: L.ridge[2], base: 0.6, peak: 6.4, cells: 22, seed: L.seed + 101, ruins: 6, tall: 9.5, alpha: 0.92 },
      { col: L.ridge[1], base: -0.1, peak: 5.0, cells: 16, seed: L.seed + 131, ruins: 5, tall: 8.0, alpha: 0.96 },
      { col: L.ridge[0], base: -0.8, peak: 3.6, cells: 11, seed: L.seed + 161, ruins: 4, tall: 6.5, alpha: 1 },
    ];
    for (const ly of layers) {
      const R = rng(ly.seed), fill = `rgba(${ly.col[0]},${ly.col[1]},${ly.col[2]},${ly.alpha})`;
      // the ridge: a ridged, wrapping noise, in degrees of elevation
      const ridge = u => { const n = pfbm(u * ly.cells, 0.37, ly.cells, 4, ly.seed), m = 1 - Math.abs(pfbm(u * ly.cells * 2, 5.1, ly.cells * 2, 3, ly.seed + 7) * 2 - 1); return ly.base + ly.peak * (0.25 + 0.75 * n) * (0.55 + 0.45 * m); };
      x.fillStyle = fill; x.beginPath(); x.moveTo(0, PH);
      for (let i = 0; i <= PW; i += 2) x.lineTo(i, yOf(ridge(i / PW)));
      x.lineTo(PW, PH); x.closePath(); x.fill();
      // ruins standing on the ridge
      for (let n = 0; n < ly.ruins; n++) {
        const u = R(), kind = R(), w = (1.5 + R() * 1.6) * pxPerDeg, h = ly.tall * (0.5 + R() * 0.5), lean = (R() - 0.5) * 0.06, gap = R();
        for (const wrap of [-1, 0, 1]) {
          const cx = (u + wrap) * PW; if (cx < -400 || cx > PW + 400) continue;
          const foot = yOf(ridge(u)) + 6, top = yOf(ridge(u) + h);
          x.save(); x.translate(cx, foot); x.transform(1, 0, lean, 1, 0, 0); x.fillStyle = fill;
          if (kind < 0.42) {                                   // a broad keep, its crown broken on one side. Kept low and
            // wide on purpose: a tall thin tower crossed by a streak of cloud reads as a cross, and no real-world
            // religious symbol belongs in this sky.
            const kw = w * 1.7, kh = (top - foot) * 0.5;
            x.beginPath(); x.moveTo(-kw / 2, 0); x.lineTo(-kw * 0.44, kh + kw * (0.12 + gap * 0.3)); x.lineTo(-kw * 0.16, kh + kw * 0.2); x.lineTo(-kw * 0.05, kh); x.lineTo(kw * 0.2, kh + kw * 0.06); x.lineTo(kw * 0.3, kh * 0.82); x.lineTo(kw * 0.46, kh * 0.8); x.lineTo(kw / 2, 0); x.closePath(); x.fill();
          } else if (kind < 0.74) {                            // a run of arches: piers and what is left of the span
            const spans = 2 + Math.floor(gap * 3), pier = w * 0.34, bay = w * 1.5, hh = (top - foot) * 0.62;
            for (let s = 0; s <= spans; s++) { x.fillRect(s * bay - pier / 2, hh, pier, -hh); }
            for (let s = 0; s < spans; s++) { if (s === Math.floor(gap * spans)) continue; x.beginPath(); x.moveTo(s * bay - pier / 2, hh); x.lineTo(s * bay - pier / 2, hh * 1.22); x.lineTo((s + 1) * bay + pier / 2, hh * 1.22); x.lineTo((s + 1) * bay + pier / 2, hh); x.arc((s + 0.5) * bay, hh, bay / 2 - pier / 2, 0, Math.PI, true); x.closePath(); x.fill(); }
          } else {                                             // standing stones
            for (let s = 0; s < 3; s++) { const sw = w * (0.42 + 0.2 * ((s * 7 + n) % 3)), sh = (top - foot) * (0.3 + 0.14 * ((s * 5 + n) % 4) / 3); x.beginPath(); x.moveTo(s * w * 0.8 - sw / 2, 0); x.lineTo(s * w * 0.8 - sw * 0.4, sh); x.lineTo(s * w * 0.8 + sw * 0.3, sh * 1.04); x.lineTo(s * w * 0.8 + sw / 2, 0); x.closePath(); x.fill(); }
          }
          x.restore();
        }
      }
      // haze lying against the foot of each range, so the three read as distance
      const hz = x.createLinearGradient(0, yOf(ly.base + ly.peak * 0.5), 0, yOf(ly.base - 1.5));
      const glow = name === 'eclipse' ? '210,128,72' : '70,62,130';
      hz.addColorStop(0, `rgba(${glow},0)`); hz.addColorStop(1, `rgba(${glow},${0.2 + 0.1 * layers.indexOf(ly)})`);
      x.fillStyle = hz; x.fillRect(0, yOf(ly.base + ly.peak * 0.5), PW, yOf(ly.base - 1.5) - yOf(ly.base + ly.peak * 0.5));
    }
    // the ground beyond the arena falls away into the lava's breath (eclipse) or the mist (violet)
    const g = x.createLinearGradient(0, yOf(-1), 0, PH), lowc = name === 'eclipse' ? '46,14,8' : '14,9,28';
    g.addColorStop(0, `rgba(${lowc},0)`); g.addColorStop(0.5, `rgba(${lowc},0.82)`); g.addColorStop(1, `rgba(${lowc},1)`);
    x.fillStyle = g; x.fillRect(0, yOf(-1), PW, PH - yOf(-1));
  }

  window.SKIES = { PW, PH, TOP, BOTTOM, ECLIPSE_EL, names: Object.keys(LOOKS), paint };
})();
