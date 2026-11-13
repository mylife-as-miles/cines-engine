/* Scene 3: A Son of Ealdholt [L18–L21]. Twenty-one winters in a few painted tableaux, cut on the narrator's phrases.
   L18: the ford below Ealdholt turning through the seasons (snow, thaw, summer, rain) while a boy on its bank grows into
        a young man (YEAR 33 at the start); an insert of hands binding a spearhead ("mending spears"); the ford in the
        rain, low ("guarding a ford"); a great house's shut gate in the rain, Cael small at the foot of its steps.
   L19: dusk in the practice yard, a spear driven at a straw post; an insert of hands bound in cloth, a stain coming
        through ("until his hands bled"); a sparring bout in the rain: time slows, the drops hang, the strike's path
        shows as a ghost before it comes, and he is already out of it.
   L20: the smithy at dusk, Runa and Cael on the bench, the forge behind them, far off on a mountain the lights of a
        great house; an insert of her hands mending a strap, the unsworn cord at her wrist; the two of them from behind,
        the lights between them.
   L21: close on Cael's face in profile, looking at the lights; on "Not yet" the focus racks to them. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- the cues and the shots (phrase boundaries measured on the takes)
  function TT() {
    const a = K.cue('L18'), b = K.cue('L19'), c = K.cue('L20'), d = K.cue('L21'), sc = K.scene(3);
    const T = { s0: sc.start, s1: sc.end, L18: a.start, L19: b.start, L20: c.start, L21: d.start };
    T.cuts = [sc.start, a.start + 3.9, a.start + 5.15, a.start + 6.25, b.start - 0.12, b.start + 2.25, b.start + 4.55, c.start - 0.12, c.start + 3.0, c.start + 5.2, d.start - 0.18, sc.end + 2];
    return T;
  }
  const easeIO = ease;

  // ---------------------------------------------------------------- colour helpers
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbStr = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const toHex = c => '#' + ((1 << 24) | (clamp(Math.round(c[0]), 0, 255) << 16) | (clamp(Math.round(c[1]), 0, 255) << 8) | clamp(Math.round(c[2]), 0, 255)).toString(16).slice(1);
  // blend a list of hex colours by weights (the seasons)
  function mixW(cols, w) { const o = [0, 0, 0]; let s = 0; cols.forEach((c, i) => { const r = hexRGB(c); o[0] += r[0] * w[i]; o[1] += r[1] * w[i]; o[2] += r[2] * w[i]; s += w[i]; }); return toHex(o.map(v => v / (s || 1))); }
  const mix2 = (a, b, u) => { const A = hexRGB(a), B = hexRGB(b); return toHex([lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]); };

  // ---------------------------------------------------------------- painting helpers
  // a ridge: fill from a noisy skyline (periodic in x over 4000 px) down to y = bottom
  function ridge(ctx, base, amp, seed, freq, col, bottom = H + 400, x0 = -800, x1 = W + 800, sharp = 0) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 16) { const u = x / 4000 * TAU; let n = K.fbm(Math.cos(u) * freq + seed, Math.sin(u) * freq + seed * 0.7, 4, seed); if (sharp) n = Math.pow(n, 1 + sharp); ctx.lineTo(x, base - amp * n); }
    ctx.lineTo(x1, bottom); ctx.closePath(); ctx.fill();
  }
  // parallax: a layer at depth factor p (0 far .. 1 at the focal plane .. >1 near) under camera {x, y, z}
  function par(ctx, cam, p, fn) {
    ctx.save(); const z = 1 + (cam.z - 1) * p; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2 - cam.x * p, -H / 2 - cam.y * p); fn(); ctx.restore();
  }
  function sky(ctx, stops) { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([u, c]) => g.addColorStop(u, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function band(ctx, y0, y1, col, a0, a1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgbStr(hexRGB(col), a0)); g.addColorStop(1, rgbStr(hexRGB(col), a1)); ctx.fillStyle = g; ctx.fillRect(-400, y0, W + 800, y1 - y0); }
  // a figure with a rim of light on one side: the rim drawn offset, the dark figure over it
  function rimFig(ctx, x, y, h, o, rim, dx, dy = 0) { if (rim) K.figure(ctx, x + dx, y + dy, h, Object.assign({}, o, { fill: rim })); K.figure(ctx, x, y, h, o); }
  // where K.figure's near hand is (to put a spear in it): a standing adult, no lean
  function handAt(x, y, h, f, a, b) { const sx = 0.05, sy = -0.786, ex = sx + Math.sin(a) * 0.19, ey = sy + Math.cos(a) * 0.19, wx = ex + Math.sin(a + b) * 0.17, wy = ey + Math.cos(a + b) * 0.17; return [x + f * h * (wx + Math.sin(a + b) * 0.012), y + h * (wy + Math.cos(a + b) * 0.012 + 0.005)]; }
  function spear(ctx, gx, gy, ang, len, back, col, w, head = '#8d8f92') {
    const dx = Math.cos(ang), dy = Math.sin(ang), tx = gx + dx * len * (1 - back), ty = gy + dy * len * (1 - back);
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(gx - dx * len * back, gy - dy * len * back); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = head; ctx.beginPath(); ctx.moveTo(tx + dx * w * 9, ty + dy * w * 9); ctx.lineTo(tx - dy * w * 1.6, ty + dx * w * 1.6); ctx.lineTo(tx + dy * w * 1.6, ty - dx * w * 1.6); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // a small fire (torch, forge mouth): additive tongues
  function flame(ctx, x, y, s, t, amt = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) {
      const u = (k + 0.5) / 6 - 0.5, hgt = s * (0.7 + 0.5 * K.noise(t * 2.2 + k * 3.1, k, 61)) * (1 - Math.abs(u) * 0.9) * amt, bx = x + u * s * 0.8, lean = (K.noise(t * 1.4 + k, 2 + k, 63) - 0.5) * s * 0.5, wd = s * 0.2;
      const g = ctx.createLinearGradient(0, y, 0, y - hgt); g.addColorStop(0, 'rgba(255,236,180,0.6)'); g.addColorStop(0.35, 'rgba(255,160,64,0.45)'); g.addColorStop(1, 'rgba(160,40,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - wd, y); ctx.bezierCurveTo(bx - wd, y - hgt * 0.4, bx + lean - wd * 0.3, y - hgt * 0.7, bx + lean, y - hgt); ctx.bezierCurveTo(bx + lean + wd * 0.3, y - hgt * 0.7, bx + wd, y - hgt * 0.4, bx + wd, y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // rain whose streaks shorten into hanging drops as time slows (speed 1 = normal, ~0 = still)
  function drops(ctx, tw, speed, o = {}) {
    const r = rng(o.seed || 5), n = o.n || 220, ang = o.angle != null ? o.angle : 0.18, al = o.alpha != null ? o.alpha : 0.3, L = (o.len || 40) * Math.max(0.06, speed);
    ctx.save(); ctx.strokeStyle = o.color || 'rgba(205,214,224,1)'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const z = 0.35 + r() * 0.65, sp = 1000 * z, x0 = r() * (W + 400), y0 = r() * H, py = (y0 + tw * sp) % (H + L + 40) - L - 20, px = (x0 - py * Math.tan(ang)) % (W + 400) - 200;
      ctx.globalAlpha = al * z * (speed < 0.3 ? 1.6 : 1); ctx.lineWidth = (speed < 0.3 ? 2.2 : 1.1) * z;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(ang) * L * z, py + Math.cos(ang) * L * z); ctx.stroke();
      if (speed < 0.3 && z > 0.75) { ctx.globalAlpha = 0.5 * z; ctx.fillStyle = 'rgba(255,240,215,1)'; ctx.beginPath(); ctx.arc(px - 0.6, py - 0.6, 1.1 * z, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // a painterly wash over the frame (granulation, uneven pigment), cheap: a cached tile
  const washTile = () => K.cached('s3:wash', () => {
    const s = 512, c = K.canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const u = i / s * TAU, v = j / s * TAU; const n = K.fbm(Math.cos(u) * 1.6 + 3, Math.sin(u) * 1.6 + Math.cos(v) * 1.6, 4, 9) * 0.7 + K.fbm(Math.sin(v) * 5 + 1, Math.cos(v) * 5 + Math.sin(u) * 2, 3, 12) * 0.3; const k = (j * s + i) * 4, val = 128 + (n - 0.5) * 120; img.data[k] = img.data[k + 1] = img.data[k + 2] = clamp(val, 0, 255); img.data[k + 3] = 255; }
    x.putImageData(img, 0, 0); return c;
  });
  function wash(ctx, a = 0.12, ox = 0, oy = 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a; ctx.scale(2, 2); K.tile(ctx, washTile(), 0, 0, W / 2 + 2, H / 2 + 2, ox, oy); ctx.restore(); }
  function finish(ctx, vig = 0.5, washA = 0.1, t = 0) { wash(ctx, washA, t * 3, 0); K.vignette(ctx, vig, '8,8,10', 0.32); }

  // ---------------------------------------------------------------- A / C. The ford below Ealdholt, through the seasons
  // seasons: [winter, thaw, summer, autumn rain]
  function seasonW(t, T) {
    const b = [T.s0 + 2.4, T.L18 + 0.9, T.L18 + 2.4, T.L18 + 3.4], fd = 0.85, w = [0, 0, 0, 0];
    const k1 = smooth(span(t, b[0] - fd / 2, b[0] + fd / 2)), k2 = smooth(span(t, b[1] - fd / 2, b[1] + fd / 2)), k3 = smooth(span(t, b[2] - fd / 2, b[2] + fd / 2));
    w[0] = 1 - k1; w[1] = k1 * (1 - k2); w[2] = k2 * (1 - k3); w[3] = k3; return w;
  }
  function ford(ctx, t, cam, w, o = {}) {
    const S = cols => mixW(cols, w);
    // sky and a sun behind thin cloud (low in winter, high in summer)
    sky(ctx, [[0, S(['#76828c', '#7a8c92', '#6c8ca4', '#3e4852'])], [0.55, S(['#b9c1c6', '#c1c8bc', '#d6d2b0', '#7e868a'])], [1, S(['#dfe3e4', '#e1e2cf', '#f0e0b6', '#9ea4a4'])]]);
    const sunY = lerp(380, 170, w[2] + w[1] * 0.5), sunA = 0.18 + 0.32 * w[2] + 0.12 * w[1] - 0.12 * w[3];
    par(ctx, cam, 0.03, () => { K.glow(ctx, 1260, sunY, 700, [255, 240, 205], sunA); K.glow(ctx, 1260, sunY, 120, [255, 248, 230], sunA * 1.2); });
    // drifting cloud bands
    par(ctx, cam, 0.06, () => { for (let i = 0; i < 6; i++) { const x = ((i * 520 + t * (12 + i * 3)) % 3200) - 700, y = 120 + i * 48; ctx.fillStyle = S(['#c6ccd0', '#c9cfc6', '#e6e0c8', '#5a636a']); ctx.globalAlpha = 0.35 + 0.25 * w[3]; ctx.beginPath(); ctx.ellipse(x, y, 420, 34, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; });
    // far fells (snow-capped in winter)
    par(ctx, cam, 0.12, () => {
      ridge(ctx, 520, 300, 1, 1.6, S(['#a9b4bb', '#7c8a86', '#6e8888', '#5a5c58']), H + 400, -800, W + 800, 0.4);
      if (w[0] + w[1] * 0.4 > 0.01) { ctx.save(); ctx.globalAlpha = w[0] + w[1] * 0.35; ridge(ctx, 520, 300, 1, 1.6, '#e9edf0', H + 400, -800, W + 800, 0.4); ctx.clip(); const sg = ctx.createLinearGradient(0, 240, 0, 560); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(120,136,150,0.4)'); ctx.fillStyle = sg; ctx.fillRect(-800, 200, W + 1600, 400); ctx.fillStyle = 'rgba(80,94,108,0.35)'; for (let i = 0; i < 26; i++) { const x = -600 + i * 130 + 60 * K.hash(i, 1, 5), y = 330 + 120 * K.hash(i, 2, 5); ctx.beginPath(); ctx.ellipse(x, y, 30 + 40 * K.hash(i, 3, 5), 6, -0.5, 0, TAU); ctx.fill(); } ctx.restore(); }
    });
    band(ctx, 380, 620, S(['#dfe3e4', '#dfe0cc', '#ecdcb4', '#8e9494']), 0, 0.55);
    // middle fells and Ealdholt on its rise: palisade, longhall, smoke
    par(ctx, cam, 0.3, () => {
      ridge(ctx, 610, 160, 7, 1.2, S(['#8c969c', '#5d6e56', '#566e48', '#4e4c3e']));
      if (w[0] > 0.01) { ctx.save(); ctx.globalAlpha = w[0] * 0.85; ridge(ctx, 610, 160, 7, 1.2, '#d6dce0'); ctx.restore(); }
      const hx = 520, hy = 560;
      ctx.fillStyle = S(['#3a3c3e', '#33302a', '#36302a', '#2a2620']);
      ctx.beginPath(); ctx.moveTo(hx - 130, hy); ctx.lineTo(hx - 120, hy - 44); ctx.lineTo(hx - 10, hy - 98); ctx.lineTo(hx + 100, hy - 44); ctx.lineTo(hx + 110, hy); ctx.fill();
      for (let i = 0; i < 34; i++) { const X = hx - 220 + i * 13; ctx.fillRect(X, hy - 28 - 4 * K.hash(i, 1, 7), 8, 40); }
      if (w[0] > 0.01) { ctx.save(); ctx.globalAlpha = w[0]; ctx.fillStyle = '#eef1f3'; ctx.beginPath(); ctx.moveTo(hx - 122, hy - 44); ctx.lineTo(hx - 10, hy - 98); ctx.lineTo(hx + 102, hy - 44); ctx.lineTo(hx + 80, hy - 50); ctx.lineTo(hx - 10, hy - 90); ctx.lineTo(hx - 100, hy - 50); ctx.fill(); ctx.restore(); }
      K.smoke(ctx, t, { n: 7, x: hx - 40, y: hy - 330, w: 80, h: 240, color: [150, 150, 146], alpha: 0.22, size: 120, rise: 10, seed: 31, drift: 4 });
      ctx.fillStyle = 'rgba(255,200,120,0.6)'; for (let i = 0; i < 2; i++) ctx.fillRect(hx - 40 + i * 50, hy - 34, 6, 7);
    });
    band(ctx, 560, 760, S(['#e3e6e7', '#dcdcc8', '#e4d6b0', '#848a8a']), 0, 0.45);
    // the valley floor and the river with the ford
    par(ctx, cam, 0.55, () => {
      ctx.fillStyle = S(['#c9cfd2', '#6e7e50', '#7c8a4a', '#5e5034']); ctx.fillRect(-600, 650, W + 1200, 600);
      ctx.save(); ctx.globalAlpha = 0.3; for (let i = 0; i < 18; i++) { const x = -400 + i * 170, y = 680 + (i % 3) * 30; ctx.fillStyle = S(['#b6bec2', '#5c6e44', '#8e9450', '#4e4028']); ctx.beginPath(); ctx.ellipse(x, y, 140, 12, 0, 0, TAU); ctx.fill(); } ctx.restore();
      // river: wider and browner at the thaw; ice at its edges in winter
      const ry = 760, rw = 46 + 22 * w[1];
      const rv = S(['#8e9aa2', '#7a7460', '#6a8896', '#4a5660']);
      ctx.fillStyle = rv; ctx.beginPath(); ctx.moveTo(-600, ry - rw * 0.6); for (let x = -600; x <= W + 600; x += 40) ctx.lineTo(x, ry - rw / 2 + 12 * Math.sin(x * 0.004)); for (let x = W + 600; x >= -600; x -= 40) ctx.lineTo(x, ry + rw / 2 + 14 * Math.sin(x * 0.0035 + 1)); ctx.fill();
      ctx.strokeStyle = 'rgba(235,240,240,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = ((i * 137 + t * 60) % (W + 1000)) - 500, y = ry + (K.hash(i, 2, 9) - 0.5) * rw * 0.7; ctx.globalAlpha = 0.3 + 0.4 * w[2]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + 30 * K.hash(i, 3, 9), y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (w[0] > 0.01) { ctx.save(); ctx.globalAlpha = w[0] * 0.9; ctx.fillStyle = '#e6ecee'; for (const s of [-1, 1]) { ctx.beginPath(); for (let x = -600; x <= W + 600; x += 40) ctx.lineTo(x, ry + s * (rw / 2 - 8 - 10 * K.noise(x * 0.01, s, 3))); ctx.lineTo(W + 600, ry + s * rw); ctx.lineTo(-600, ry + s * rw); ctx.fill(); } ctx.restore(); }
      // the ford's stepping stones
      for (let i = 0; i < 7; i++) { const x = 1180 - i * 34 + 8 * Math.sin(i * 2), y = ry + rw / 2 - 4 - i * (rw - 8) / 6; ctx.fillStyle = S(['#e8eced', '#5a5a52', '#6a685c', '#3a3a36']); ctx.beginPath(); ctx.ellipse(x, y, 16, 7, 0, 0, TAU); ctx.fill(); }
    });
    // the near bank: reeds and the thorn tree, the boy (then the man) on watch with his spear
    par(ctx, cam, 0.85, () => {
      const by = 900;
      ctx.fillStyle = S(['#dfe4e6', '#4e6036', '#5a6c32', '#4a3c26']); ctx.beginPath(); ctx.moveTo(-600, by); for (let x = -600; x <= W + 600; x += 30) ctx.lineTo(x, by - 40 - 30 * K.fbm(x * 0.003, 4, 3, 21)); ctx.lineTo(W + 600, H + 300); ctx.lineTo(-600, H + 300); ctx.fill();
      // reeds and grass (dark in winter against the snow)
      ctx.save(); ctx.strokeStyle = S(['#5a5a50', '#3e5230', '#4e6230', '#6a5232']); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 90; i++) { const x = -500 + i * 33 + 10 * K.hash(i, 1, 23), hgt = 30 + 60 * K.hash(i, 2, 23), sw = Math.sin(t * 1.6 + i * 0.7) * (6 + 10 * w[3]); ctx.beginPath(); ctx.moveTo(x, by - 20); ctx.quadraticCurveTo(x + sw * 0.4, by - 20 - hgt * 0.5, x + sw, by - 20 - hgt); ctx.stroke(); }
      ctx.restore();
      // the thorn tree on the bank: bare, blossom, leaf, rust
      const tx = 1720, ty = by - 30;
      ctx.save(); ctx.strokeStyle = '#2e2620'; ctx.lineCap = 'round';
      const br = (x, y, a, L, d) => { if (d > 6 || L < 6) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; ctx.lineWidth = Math.max(1.2, 14 - d * 2.2); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); const sw = Math.sin(t * 0.9 + d) * 0.02 * d; br(x2, y2, a - 0.42 + sw + (K.hash(d, x | 0, 3) - 0.5) * 0.3, L * 0.74, d + 1); br(x2, y2, a + 0.38 + sw, L * 0.7, d + 1); };
      br(tx, ty, -Math.PI / 2 - 0.2, 150, 0);
      ctx.restore();
      const leaf = w[1] * 0.8 + w[2] + w[3] * 0.7;
      if (leaf > 0.01) { ctx.save(); for (let i = 0; i < 160; i++) { const a = K.hash(i, 1, 27) * TAU, rr = Math.sqrt(K.hash(i, 2, 27)), x = tx - 60 + Math.cos(a) * rr * 260, y = ty - 410 + Math.sin(a) * rr * 150; ctx.globalAlpha = leaf * 0.85; ctx.fillStyle = w[1] > 0.5 ? (i % 3 ? '#e8e4dc' : '#9aae78') : mixW(['#48602e', '#7a4a26'], [w[2] + w[1], w[3]]); ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 1.2 + i) * 2, y, 9, 6, a, 0, TAU); ctx.fill(); } ctx.restore(); }
      // the watcher on the bank by the stones: a boy in winter, a young man by autumn
      const grow = smooth(span(t, T0().s0 + 2, T0().L18 + 3.2)), fh = lerp(230, 380, grow), fx = 1150, fy = by - 22;
      const dark = S(['#2a2c30', '#262620', '#2a2620', '#1c1c1e']);
      if (grow < 0.55) rimFig(ctx, fx, fy, fh, { kind: 'child', head: 'hood', hold: 'none', face: 1, fill: dark, arm: 0.3, bend: 0.4 }, null, 0);
      if (grow > 0.3) { ctx.save(); ctx.globalAlpha = smooth(span(grow, 0.3, 0.55)); rimFig(ctx, fx, fy, fh, { kind: 'cloak', head: w[3] > 0.5 ? 'hood' : 'hair', hold: 'spear', face: 1, fill: dark }, null, 0); ctx.restore(); }
      if (grow < 0.55) { spear(ctx, fx + 18, fy + 4, -Math.PI / 2 - 0.05, fh * 1.25, 0.02, dark, 4); }
    });
    // weather: snow, the thaw's mist, summer motes, autumn rain and leaves
    if (w[0] > 0.01) { ctx.save(); ctx.globalAlpha = w[0]; K.specks(ctx, t, { kind: 'snow', n: 160, wind: 30, alpha: 0.85, seed: 33 }); ctx.restore(); }
    if (w[1] > 0.01) { ctx.save(); ctx.globalAlpha = w[1] * 0.5; K.smoke(ctx, t, { n: 10, x: -200, y: 520, w: W + 400, h: 300, color: [226, 228, 220], alpha: 0.35, size: 520, rise: 2, seed: 35, drift: 12 }); ctx.restore(); }
    if (w[2] > 0.01) { ctx.save(); ctx.globalAlpha = w[2]; K.specks(ctx, t, { kind: 'dust', n: 70, alpha: 0.6, seed: 37 }); ctx.restore(); }
    if (w[3] > 0.01) { ctx.save(); ctx.globalAlpha = w[3]; drops(ctx, t, 1, { n: 200, alpha: 0.28, seed: 39 }); for (let i = 0; i < 14; i++) { const u = ((t * 0.12 + K.hash(i, 1, 41)) % 1), x = 1500 + (K.hash(i, 2, 41) - 0.5) * 500 + u * 300, y = 520 + u * 560, a = t * 3 + i; ctx.fillStyle = '#8a4a22'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3.5, a, 0, TAU); ctx.fill(); } ctx.restore(); }
    if (!o.noGrade) { K.grade(ctx, S(['#c8d4e0', '#d8e0c8', '#f2d8a8', '#8a98a8']), 'soft-light', 0.3); }
  }
  let TCACHE = null; const T0 = () => TCACHE || (TCACHE = TT());

  function shotFord(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(-60, 90, easeIO(u)), y: lerp(10, -10, u), z: lerp(1.0, 1.1, easeIO(u)) };
    ford(ctx, t, cam, seasonW(t, T));
    // YEAR 33, small, lower left, fading
    const a = win(t, T.s0 + 0.5, T.L18 + 1.6, 0.8, 1.0);
    if (a > 0) { K.text(ctx, 'YEAR 33', 118, H - 112, '500 30px Cinzel', 'rgba(34,36,42,0.88)', 8, 'left', a * 0.9); ctx.save(); ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#2a2c32'; ctx.fillRect(118, H - 96, 120 * smooth(span(t, T.s0 + 0.7, T.s0 + 1.8)), 1.2); ctx.restore(); }
    finish(ctx, 0.48, 0.1, t);
  }
  // "guarding a ford": the same ford in the autumn rain, low and close on him
  function shotFordLow(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(1150 - W / 2 - 160, 1150 - W / 2 - 120, u) / 0.85, y: lerp(180, 170, u) / 0.85, z: lerp(2.0, 2.1, u) };
    ford(ctx, t + 40, cam, [0, 0, 0, 1], { noGrade: true });
    drops(ctx, t, 1, { n: 260, alpha: 0.35, seed: 43, len: 60 });
    K.grade(ctx, '#7a8898', 'soft-light', 0.35); K.grade(ctx, '#2a3440', 'multiply', 0.15);
    finish(ctx, 0.55, 0.1, t);
  }

  // ---------------------------------------------------------------- B. hands binding a spearhead (close insert, warm daylight)
  // a hand gripping (a rod along local x through the origin), seen from the thumb side, in silhouette with a rim of light on
  //   its upper edge; the forearm (a wool sleeve) runs off to local -x. s: the hand's length unit in px.
  function handPath(c) {
    c.beginPath();
    c.moveTo(-1.6, -0.34); c.bezierCurveTo(-1.2, -0.33, -0.9, -0.31, -0.72, -0.32);                 // forearm to the wrist
    c.bezierCurveTo(-0.58, -0.36, -0.48, -0.48, -0.34, -0.54);                                        // back of the hand rising
    for (let i = 0; i < 4; i++) { const x0 = -0.34 + i * 0.2; c.quadraticCurveTo(x0 + 0.1, -0.62, x0 + 0.2, -0.55 + i * 0.01); }   // knuckles
    c.bezierCurveTo(0.58, -0.46, 0.66, -0.24, 0.64, -0.02);                                           // the first finger, front
    c.bezierCurveTo(0.63, 0.2, 0.56, 0.36, 0.44, 0.44);                                               // round under the rod
    for (let i = 0; i < 4; i++) { const x0 = 0.44 - i * 0.19; c.quadraticCurveTo(x0 - 0.095, 0.53, x0 - 0.19, 0.45); }   // the curled fingertips
    c.bezierCurveTo(-0.42, 0.46, -0.56, 0.4, -0.7, 0.3);                                              // heel of the palm
    c.bezierCurveTo(-0.9, 0.28, -1.2, 0.3, -1.6, 0.32); c.closePath();
  }
  function thumbPath(c) { c.beginPath(); c.moveTo(-0.58, -0.2); c.bezierCurveTo(-0.38, -0.34, -0.06, -0.26, 0.2, -0.16); c.bezierCurveTo(0.34, -0.1, 0.34, 0.05, 0.2, 0.06); c.bezierCurveTo(-0.08, 0.08, -0.36, 0.12, -0.6, 0.16); c.closePath(); }
  function hand(ctx, x, y, s, ang, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, o.flip ? -s : s);
    const sk = o.skin || '#1a1310', sl = o.sleeve || '#141012', rim = o.light;
    // the sleeve, a little wider than the wrist, with a soft woollen edge
    handPath(ctx); ctx.fillStyle = sk; ctx.fill();
    thumbPath(ctx); ctx.fill();
    if (o.wrap) o.wrap(ctx);
    const sg = ctx.createLinearGradient(-0.95, 0, -2.4, 0); sg.addColorStop(0, sl); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-0.95, -0.42); for (let k = 0; k <= 6; k++) ctx.lineTo(-0.95 - (k % 2) * 0.05, -0.42 + k * 0.14); ctx.lineTo(-2.9, 0.62); ctx.lineTo(-2.9, -0.62); ctx.closePath(); ctx.fill();
    if (rim) {
      // the rim: the outline lit along its upper edge only (clip to the upper half, stroke the outline offset up)
      ctx.save(); ctx.beginPath(); ctx.rect(-0.96, -1, 1.8, 0.9); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rim; ctx.lineJoin = 'round';
      ctx.translate(0, o.flip ? 0.025 : -0.025); ctx.lineWidth = 0.045; handPath(ctx); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rg2 = ctx.createLinearGradient(-0.95, 0, -2.2, 0); rg2.addColorStop(0, rim); rg2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.strokeStyle = rg2; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.95, -0.45); ctx.lineTo(-2.9, -0.65); ctx.stroke(); ctx.restore();
    }
    // seams between the curled fingers
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.02; for (const k of [-0.14, 0.06, 0.26]) { ctx.beginPath(); ctx.moveTo(k, -0.52); ctx.bezierCurveTo(k + 0.22, -0.34, k + 0.22, 0.24, k - 0.02, 0.45); ctx.stroke(); }
    ctx.restore();
  }
  function shotMend(ctx, t, T, lt, d) {
    const u = lt / d, z = lerp(1.0, 1.08, u), rim = 'rgba(255,224,170,0.95)';
    // the open door behind: a bright, soft rectangle of day; the room dark around it
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(K.cached('s3:door', () => {
      const c = K.canvas(W, H), x = c.getContext('2d'); x.fillStyle = '#1a120c'; x.fillRect(0, 0, W, H);
      const dg = x.createLinearGradient(0, 80, 0, 760); dg.addColorStop(0, '#f6e6c4'); dg.addColorStop(1, '#d8b88a');
      x.filter = 'blur(18px)'; x.fillStyle = dg; x.fillRect(560, 60, 760, 760); x.filter = 'none';
      K.glow(x, 940, 400, 900, [255, 220, 160], 0.35);
      x.filter = 'blur(6px)'; x.fillStyle = 'rgba(40,28,18,0.85)'; x.fillRect(520, 0, 70, 900); x.fillRect(1290, 0, 70, 900); x.fillRect(520, 0, 840, 70); x.filter = 'none';
      return c;
    }), 0, 0);
    // dust in the light
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const x = 600 + K.hash(i, 1, 53) * 700, y = ((K.hash(i, 2, 53) * 800 - t * 14 * (0.5 + K.hash(i, 3, 53))) % 800 + 800) % 800 + 60; ctx.fillStyle = `rgba(255,236,200,${0.35 * K.hash(i, 4, 53)})`; ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 8, y, 1.5 + K.hash(i, 5, 53) * 2, 0, TAU); ctx.fill(); } ctx.restore();
    // the bench edge in the foreground
    ctx.fillStyle = '#0e0a08'; ctx.beginPath(); ctx.moveTo(-100, 900); ctx.lineTo(W + 100, 840); ctx.lineTo(W + 100, H + 100); ctx.lineTo(-100, H + 100); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,160,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-100, 900); ctx.lineTo(W + 100, 840); ctx.stroke();
    // the workshop in silhouette: a rack of spears and a hanging lamp at the left, a shelf at the right
    ctx.fillStyle = '#0c0806';
    for (let i = 0; i < 5; i++) { ctx.fillRect(180 + i * 46, 260 + (i % 2) * 30, 7, 640); ctx.beginPath(); ctx.moveTo(183 + i * 46, 230 + (i % 2) * 30); ctx.lineTo(176 + i * 46, 262 + (i % 2) * 30); ctx.lineTo(190 + i * 46, 262 + (i % 2) * 30); ctx.fill(); }
    ctx.fillRect(150, 520, 260, 14); ctx.fillRect(1420, 420, 330, 16); for (let i = 0; i < 4; i++) ctx.fillRect(1440 + i * 70, 360 + (i % 2) * 14, 40, 60 - (i % 2) * 14);
    // at the bench in the doorway's light: a boy, then (the same bench, years on) a young man, binding a spearhead
    const older = lt > d * 0.5 ? 1 : 0, benchY = 740;
    for (const [k, a] of [[0, 1 - older], [1, older]]) {
      if (a <= 0.01) continue; ctx.save(); ctx.globalAlpha = a;
      const h = k ? 420 : 300, fx = 860, fy = benchY + 170, work = Math.sin(lt * 7 + k) * 0.14;
      rimFig(ctx, fx, fy, h, { kind: k ? 'cloak' : 'child', head: 'hair', hold: 'none', face: 1, arm: 0.95 + work, bend: 0.75, farArm: 0.8 - work, farBend: 0.9, lean: 0.22, fill: '#0c0806' }, rim, -3, -2);
      ctx.restore();
    }
    // a stool under him; the bench before him with the spear along it, the head catching the day, the binding growing
    ctx.fillStyle = '#0a0705'; ctx.fillRect(780, benchY + 60, 120, 14); ctx.fillRect(790, benchY + 74, 10, 80); ctx.fillRect(880, benchY + 74, 10, 80);
    ctx.save(); const ang = -0.02, sx0 = 800, sy0 = benchY - 8;
    ctx.strokeStyle = '#0c0806'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 + 560, sy0 + 560 * ang); ctx.stroke();
    ctx.translate(sx0 + 560, sy0 + 560 * ang); ctx.rotate(ang); const hg = ctx.createLinearGradient(0, -12, 0, 12); hg.addColorStop(0, '#f4f2ec'); hg.addColorStop(1, '#3a3b3d'); ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.quadraticCurveTo(44, -19, 110, 0); ctx.quadraticCurveTo(44, 19, -8, 5); ctx.closePath(); ctx.fill();
    for (let i = 0; i < Math.min(10, 3 + Math.floor(lt * 6)); i++) { ctx.strokeStyle = '#e8d4a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-11 - i * 5, -5); ctx.lineTo(-13 - i * 5, 5); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#0a0705'; ctx.fillRect(940, benchY, 520, 22); ctx.fillRect(960, benchY + 22, 18, 150); ctx.fillRect(1420, benchY + 22, 18, 150);
    ctx.fillStyle = 'rgba(255,220,170,0.5)'; ctx.fillRect(940, benchY, 520, 2);
    ctx.restore();
    K.grade(ctx, '#f0c890', 'soft-light', 0.22);
    finish(ctx, 0.6, 0.08, t);
  }

  // ---------------------------------------------------------------- D. a great house's shut gate in the rain; Cael at the foot of the steps
  function shotGate(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(-20, 10, u), y: lerp(20, -10, u), z: lerp(1.0, 1.12, easeIO(u)) };
    sky(ctx, [[0, '#1e252e'], [0.5, '#3a4450'], [1, '#4c545c']]);
    par(ctx, cam, 0.1, () => { ridge(ctx, 640, 120, 3, 1.5, '#2c343c'); });
    drops(ctx, t + 3, 1, { n: 140, alpha: 0.18, seed: 61, len: 50 });
    // the gatehouse: two towers, a tall arch, a shut door; a great house's banner; torches
    par(ctx, cam, 0.6, () => {
      const cx = 960, base = 820;
      ctx.fillStyle = '#2a2f36'; ctx.fillRect(cx - 520, 80, 300, base - 80); ctx.fillRect(cx + 220, 80, 300, base - 80); ctx.fillRect(cx - 240, 230, 480, base - 230);
      for (let i = 0; i < 6; i++) { ctx.fillRect(cx - 520 + i * 54, 44, 34, 40); ctx.fillRect(cx + 220 + i * 54, 44, 34, 40); }
      // stone courses
      ctx.strokeStyle = 'rgba(10,12,16,0.45)'; ctx.lineWidth = 2; for (let y = 120; y < base; y += 46) { ctx.beginPath(); ctx.moveTo(cx - 520, y); ctx.lineTo(cx + 520, y); ctx.stroke(); }
      const sheen = ctx.createLinearGradient(cx - 520, 0, cx + 520, 0); sheen.addColorStop(0, 'rgba(160,180,200,0.12)'); sheen.addColorStop(0.5, 'rgba(0,0,0,0)'); sheen.addColorStop(1, 'rgba(160,180,200,0.08)'); ctx.fillStyle = sheen; ctx.fillRect(cx - 520, 40, 1040, base - 40);
      // arch and the door (iron-studded, shut)
      ctx.fillStyle = '#14171c'; ctx.beginPath(); ctx.moveTo(cx - 170, base); ctx.lineTo(cx - 170, 470); ctx.arc(cx, 470, 170, Math.PI, 0); ctx.lineTo(cx + 170, base); ctx.fill();
      ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.moveTo(cx - 150, base); ctx.lineTo(cx - 150, 480); ctx.arc(cx, 480, 150, Math.PI, 0); ctx.lineTo(cx + 150, base); ctx.fill();
      ctx.fillStyle = '#1a120c'; ctx.fillRect(cx - 3, 340, 6, base - 340); for (const y of [520, 640, 760]) ctx.fillRect(cx - 150, y, 300, 12);
      ctx.fillStyle = '#7a7470'; for (const y of [526, 646, 766]) for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cx - 130 + i * 32.5, y, 4, 0, TAU); ctx.fill(); }
      // the great house's banner (gold grain) hanging over the arch, heavy with rain
      K.banner(ctx, cx, 250, 150, 230, K.HOUSES[1], t, { wind: 0.12, alpha: 0.95 });
      // windows lit warm high in the towers
      for (const [x, y] of [[cx - 400, 230], [cx - 330, 380], [cx + 360, 260], [cx + 300, 420]]) { const fl = 0.8 + 0.2 * K.noise(t * 3 + x, 1, 5); ctx.fillStyle = `rgba(255,190,110,${0.85 * fl})`; ctx.fillRect(x, y, 14, 34); K.glow(ctx, x + 7, y + 17, 70, [255, 170, 90], 0.25 * fl); }
      // torches either side of the arch
      for (const s of [-1, 1]) { const x = cx + s * 230, y = 520; ctx.fillStyle = '#1a1612'; ctx.fillRect(x - 5, y, 10, 50); flame(ctx, x, y + 4, 34, t + s, 1); K.glow(ctx, x, y - 10, 340, [255, 150, 70], 0.32 + 0.06 * Math.sin(t * 11 + s)); }
      // a guard under the arch
      K.figure(ctx, cx + 120, base, 250, { kind: 'armour', head: 'helm', hold: 'spear', face: -1, fill: '#0e1014' });
      // the steps, wet, catching the torchlight
      for (let i = 0; i < 6; i++) { const y = base + i * 26, w2 = 300 + i * 70; ctx.fillStyle = i % 2 ? '#262a30' : '#2c3036'; ctx.fillRect(cx - w2, y, 2 * w2, 26); ctx.fillStyle = 'rgba(255,170,90,0.18)'; ctx.fillRect(cx - w2, y, 2 * w2, 3); }
    });
    // the wet ground; Cael small at the foot of the steps, seen from behind, waiting; two others sitting hooded on the steps
    par(ctx, cam, 0.85, () => {
      const gy = 1000;
      ctx.fillStyle = '#1c2026'; ctx.fillRect(-300, gy - 20, W + 600, 400);
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(960 + s * 230, gy + 30); ctx.scale(1, 0.18); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, 'rgba(255,150,70,0.35)'); g.addColorStop(1, 'rgba(255,150,70,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 260, 0, TAU); ctx.fill(); ctx.restore(); }
      K.figure(ctx, 640, 900, 150, { kind: 'cloak', head: 'hood', hold: 'none', face: 1, fill: '#121418', seated: false, lean: 0.25 });
      K.figure(ctx, 1290, 905, 140, { kind: 'robe', head: 'hood', hold: 'staff', face: -1, fill: '#121418', lean: 0.2 });
      const fx = 900, fy = gy + 30, fh = 330;
      rimFig(ctx, fx, fy, fh, { kind: 'cloak', head: 'hair', hold: 'spear', face: 1, fill: '#0c0d10' }, 'rgba(255,170,100,0.55)', 3, -2);
    });
    drops(ctx, t, 1, { n: 280, alpha: 0.32, seed: 63, len: 55 });
    // splashes on the ground
    ctx.save(); ctx.strokeStyle = 'rgba(200,210,220,0.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 30; i++) { const ph = (t * 2.4 + K.hash(i, 1, 65)) % 1, x = K.hash(i, 2, 65) * W, y = 1000 + K.hash(i, 3, 65) * 70; ctx.globalAlpha = (1 - ph) * 0.5; ctx.beginPath(); ctx.ellipse(x, y, 4 + ph * 18, 1.5 + ph * 4, 0, 0, TAU); ctx.stroke(); } ctx.restore();
    K.grade(ctx, '#5a6a80', 'soft-light', 0.3);
    finish(ctx, 0.62, 0.1, t);
  }

  // ---------------------------------------------------------------- E / G. the practice yard at dusk
  function duskYard(ctx, t, cam, o = {}) {
    sky(ctx, [[0, '#1c2236'], [0.42, '#4a4058'], [0.62, '#a8645a'], [0.74, '#d89a6a'], [1, '#e6b07a']]);
    par(ctx, cam, 0.04, () => { K.glow(ctx, 1380, 640, 600, [255, 170, 110], 0.35); });
    par(ctx, cam, 0.08, () => { for (let i = 0; i < 5; i++) { const x = ((i * 600 + t * 8) % 3000) - 600, y = 330 + i * 40; ctx.fillStyle = 'rgba(60,44,60,0.45)'; ctx.beginPath(); ctx.ellipse(x, y, 520, 26, 0, 0, TAU); ctx.fill(); } });
    par(ctx, cam, 0.15, () => ridge(ctx, 700, 210, 21, 1.4, '#3a3048'));
    band(ctx, 560, 760, '#c88a6a', 0, 0.35);
    par(ctx, cam, 0.35, () => {
      ridge(ctx, 780, 120, 23, 1.1, '#262234');
      // the longhall of the hold, roof against the sky, warm windows, smoke
      const hx = 360, hy = 740; ctx.fillStyle = '#18161e'; ctx.beginPath(); ctx.moveTo(hx - 260, hy); ctx.lineTo(hx - 240, hy - 70); ctx.lineTo(hx, hy - 170); ctx.lineTo(hx + 240, hy - 70); ctx.lineTo(hx + 260, hy); ctx.fill();
      for (let i = 0; i < 3; i++) { const fl = 0.8 + 0.2 * K.noise(t * 2 + i, 2, 9); ctx.fillStyle = `rgba(255,180,100,${0.8 * fl})`; ctx.fillRect(hx - 120 + i * 100, hy - 50, 12, 16); }
      K.smoke(ctx, t, { n: 8, x: hx - 30, y: hy - 520, w: 60, h: 360, color: [70, 60, 70], alpha: 0.3, size: 140, rise: 10, seed: 71, drift: 5 });
    });
    band(ctx, 700, 860, '#8a6a6a', 0, 0.3);
    // the yard: churned ground, a rail fence, a weapon rack
    par(ctx, cam, 0.7, () => {
      ctx.fillStyle = '#1e1a1e'; ctx.fillRect(-500, 860, W + 1000, 400);
      const g = ctx.createLinearGradient(0, 860, 0, 960); g.addColorStop(0, 'rgba(220,140,100,0.25)'); g.addColorStop(1, 'rgba(220,140,100,0)'); ctx.fillStyle = g; ctx.fillRect(-500, 860, W + 1000, 100);
      ctx.fillStyle = '#141216'; for (let i = 0; i < 14; i++) { const x = -300 + i * 190; ctx.fillRect(x, 760, 12, 110); } ctx.fillRect(-300, 790, 2700, 9); ctx.fillRect(-300, 830, 2700, 8);
      ctx.fillRect(1650, 700, 10, 170); ctx.fillRect(1760, 700, 10, 170); ctx.fillRect(1640, 720, 140, 8); for (let i = 0; i < 4; i++) { ctx.fillRect(1660 + i * 28, 600 + (i % 2) * 20, 4, 270); }
      if (o.puddles) for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(230,150,110,0.25)'; ctx.beginPath(); ctx.ellipse(200 + i * 380, 960 + (i % 2) * 40, 120, 9, 0, 0, TAU); ctx.fill(); }
    });
  }
  function shotPost(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(-40, 50, u), y: 0, z: lerp(1.02, 1.08, u) };
    duskYard(ctx, t, cam, { puddles: true });
    par(ctx, cam, 0.8, () => {
      // the straw-wrapped post
      const px = 1200, py = 930;
      ctx.fillStyle = '#16131a'; ctx.fillRect(px - 16, py - 330, 32, 330); ctx.fillStyle = '#2a2220'; ctx.beginPath(); ctx.roundRect(px - 34, py - 300, 68, 170, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(230,160,110,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 34, py - 290); ctx.lineTo(px + 34, py - 140); ctx.stroke();
      // Cael driving the spear at it, again and again (a thrust each 0.85 s)
      const cyc = (lt % 0.85) / 0.85, thrust = cyc < 0.35 ? easeOut(cyc / 0.35) : 1 - smooth((cyc - 0.35) / 0.65);
      const fx = 820 + thrust * 30, fy = 935, fh = 300, a = lerp(0.85, 1.45, thrust), b = lerp(1.0, 0.08, thrust);
      const rim = 'rgba(255,170,120,0.6)';
      rimFig(ctx, fx, fy, fh, { kind: 'cloak', head: 'hair', hold: 'none', face: 1, arm: a, bend: b, farArm: a - 0.2, farBend: b + 0.3, fill: '#0e0c12' }, rim, 3, -1);
      const [gx, gy] = handAt(fx, fy, fh, 1, a, b);
      spear(ctx, gx, gy, -0.06, fh * 1.35, 0.45, '#0e0c12', 5, '#4a4446');
      if (thrust > 0.92) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,150,0.5)'; for (let i = 0; i < 8; i++) { const a2 = K.hash(i, Math.floor(lt / 0.85), 3) * TAU; ctx.fillRect(px - 34 + Math.cos(a2) * 30 * (thrust - 0.9) * 10, py - 230 + Math.sin(a2) * 30 * (thrust - 0.9) * 10, 3, 3); } ctx.restore(); }
    });
    drops(ctx, t, 1, { n: 120, alpha: 0.2, seed: 73, color: 'rgba(255,214,190,1)' });
    K.grade(ctx, '#d89070', 'soft-light', 0.2);
    finish(ctx, 0.55, 0.1, t);
  }
  // a hand bound in cloth on the spear shaft, against the dusk; a stain comes through
  function shotHands(ctx, t, T, lt, d) {
    const u = lt / d, z = lerp(1.0, 1.1, easeIO(u));
    // the dusk yard behind, out of focus
    const q = 0.25, B = K.layer('s3:bgh', W * q, H * q), bx = B.getContext('2d');
    bx.save(); bx.scale(q, q); duskYard(bx, t, { x: -300, y: -200, z: 1.6 }); bx.restore();
    ctx.save(); ctx.filter = 'blur(5px)'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
    ctx.fillStyle = 'rgba(10,6,10,0.25)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    const hx = 980, hy = 560, hs = 300, ha = -0.5, rim = 'rgba(255,180,120,0.9)';
    // the shaft through the fist, the thrust still in it
    const sh = Math.sin(lt * 9) * 2;
    ctx.save(); ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - Math.cos(ha) * 1200, hy - Math.sin(ha) * 1200 + sh); ctx.lineTo(hx + Math.cos(ha) * 1300, hy + Math.sin(ha) * 1300 + sh); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,120,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - Math.cos(ha) * 1200 + 8, hy - Math.sin(ha) * 1200 - 14); ctx.lineTo(hx + Math.cos(ha) * 1300 + 8, hy + Math.sin(ha) * 1300 - 14); ctx.stroke(); ctx.restore();
    const nb = 5, st = smooth(span(t, T.cuts[5] + 0.35, T.cuts[6]));
    hand(ctx, hx, hy + sh, hs, ha, { skin: '#1a1210', sleeve: '#100c0e', light: rim, wrap: c => {
      // the cloth, wound in bands over the knuckles and the back of the hand
      c.save(); handPath(c); c.clip();
      const band = i => { const x0 = 0.5 - i * 0.24; c.beginPath(); c.moveTo(x0, -0.8); c.lineTo(x0 + 0.21, -0.8); c.quadraticCurveTo(x0 + 0.14, 0, x0 + 0.05, 0.7); c.lineTo(x0 - 0.16, 0.7); c.quadraticCurveTo(x0 - 0.07, 0, x0, -0.8); c.closePath(); };
      for (let i = 0; i < nb; i++) { band(i); const g = c.createLinearGradient(0, -0.7, 0, 0.6); g.addColorStop(0, '#e2d6bc'); g.addColorStop(0.5, '#a89a80'); g.addColorStop(1, '#4a4236'); c.fillStyle = g; c.fill(); }
      if (st > 0) { for (const [sx, sy, r] of [[0.32, -0.5, 0.2], [0.1, -0.56, 0.18], [-0.12, -0.54, 0.15], [0.46, -0.22, 0.13]]) { const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * (0.35 + st)); g.addColorStop(0, `rgba(96,18,16,${0.85 * st})`); g.addColorStop(0.7, `rgba(110,26,22,${0.45 * st})`); g.addColorStop(1, 'rgba(110,26,22,0)'); c.fillStyle = g; c.beginPath(); for (let i = 0; i < nb; i++) { const x0 = 0.5 - i * 0.24; c.moveTo(x0, -0.8); c.lineTo(x0 + 0.21, -0.8); c.quadraticCurveTo(x0 + 0.14, 0, x0 + 0.05, 0.7); c.lineTo(x0 - 0.16, 0.7); c.quadraticCurveTo(x0 - 0.07, 0, x0, -0.8); c.closePath(); } c.fill(); } }
      c.restore();
      // a loose end of the cloth stirring in the wind
      c.fillStyle = '#b8ac90'; c.beginPath(); c.moveTo(-0.7, 0.2); c.quadraticCurveTo(-0.95, 0.6 + Math.sin(t * 4) * 0.06, -1.2, 0.85 + Math.sin(t * 4 + 1) * 0.1); c.lineTo(-1.05, 0.9 + Math.sin(t * 4 + 1) * 0.1); c.quadraticCurveTo(-0.85, 0.6, -0.6, 0.28); c.closePath(); c.fill();
    } });
    ctx.restore();
    drops(ctx, t, 1, { n: 90, alpha: 0.18, seed: 79, color: 'rgba(255,214,190,1)' });
    K.grade(ctx, '#c07858', 'soft-light', 0.2);
    finish(ctx, 0.62, 0.1, t);
  }
  // the read: time slows, the drops hang, the strike's ghost shows before it comes; then he is out of it
  function shotRead(ctx, t, T, lt, d) {
    const s0 = 0.75, s1 = d - 0.75;                                  // the slow stretch
    const slow = win(lt, s0, s1, 0.3, 0.12), speed = 1 - 0.95 * slow;
    // warped time: the world crawls in the slow stretch
    const n = 40; let tw = 0; for (let i = 0; i < n; i++) { const uu = lt * (i + 0.5) / n; tw += (1 - 0.95 * win(uu, s0, s1, 0.3, 0.12)) * lt / n; }
    const push = easeIO(clamp(lt / d)), cam = { x: lerp(10, 50, push) + (lt > s1 ? K.shake(t, 8 * Math.exp(-(lt - s1) * 5), 3)[0] : 0), y: lerp(250, 270, push), z: lerp(1.42, 1.62, push) };
    duskYard(ctx, T.cuts[6] + tw, cam, { puddles: true });
    par(ctx, cam, 0.9, () => {
      const by = 950, ph = clamp(tw / (d * 0.55));                    // the partner's strike: wind-up then down
      const wind = smooth(span(tw, 0.25, 0.75)), strike = smooth(span(tw, 0.8, 1.05)), after = lt > s1 + 0.05 ? 1 : 0;
      const Px = 1180, Ph = 320, ang = lerp(0.6, 2.9, wind) - strike * 2.3;      // staff angle about his hands
      // the partner (older, heavier), staff raised for an overhead blow
      rimFig(ctx, Px, by, Ph, { kind: 'tunic', head: 'bare', hold: 'none', face: -1, arm: lerp(0.4, 2.6, wind) - strike * 1.6, bend: 0.3, farArm: lerp(0.3, 2.4, wind) - strike * 1.5, farBend: 0.4, fill: '#0c0a10', lean: -0.08 * strike }, 'rgba(255,170,120,0.55)', -3, -1);
      const [hx, hy] = handAt(Px, by, Ph, -1, lerp(0.4, 2.6, wind) - strike * 1.6, 0.3);
      const sa = -Math.PI / 2 - (ang - 1.5) * 0.9;
      // the read: a ghost of where the staff will fall, drawn ahead of it
      const ghost = win(lt, s0 + 0.25, s1 + 0.1, 0.35, 0.15);
      if (ghost > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 7; k++) { const a2 = lerp(sa, -Math.PI * 0.08 + Math.PI, k / 6) ; void a2; }
        ctx.strokeStyle = `rgba(255,214,150,${0.32 * ghost})`; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, hy, Ph * 0.95, -Math.PI * 0.62, -Math.PI * 1.0 + 0.05, true); ctx.stroke();
        ctx.strokeStyle = `rgba(255,236,190,${0.55 * ghost})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, Ph * 0.95, -Math.PI * 0.62, -Math.PI * 1.0 + 0.05, true); ctx.stroke();
        // where it lands: the place he stands now
        K.glow(ctx, hx - Ph * 0.95, hy + 10, 70, [255, 200, 140], 0.35 * ghost);
        ctx.restore();
      }
      spear(ctx, hx, hy, sa, Ph * 1.1, 0.3, '#0c0a10', 7, '#0c0a10');
      // Cael: guard, then (slowly) a step inside the blow, the spear's butt to the chest
      const step = smooth(span(lt, s0 + 0.6, s1 + 0.15));
      const Cx = lerp(760, 905, step), Ch = 312, ca = lerp(1.15, 1.5, step), cb = lerp(0.8, 0.15, step);
      rimFig(ctx, Cx, by, Ch, { kind: 'cloak', head: 'hair', hold: 'none', face: 1, arm: ca, bend: cb, farArm: ca - 0.25, farBend: cb + 0.3, fill: '#0c0a10', lean: 0.06 * step }, 'rgba(255,170,120,0.6)', 3, -1);
      const [gx, gy] = handAt(Cx, by, Ch, 1, ca, cb);
      spear(ctx, gx, gy, lerp(-0.25, Math.PI + 0.05, 0) + lerp(0, 0.18, step), Ch * 1.32, lerp(0.4, 0.62, step), '#0c0a10', 5, '#4a4446');
      // a flash where the butt meets him
      if (after) { const k = Math.exp(-(lt - s1) * 6); K.glow(ctx, Px - 70, by - Ph * 0.6, 90, [255, 220, 170], 0.5 * k); }
      void ph;
    });
    drops(ctx, T.cuts[6] + tw, speed, { n: 200, alpha: 0.32, seed: 75, color: 'rgba(255,220,196,1)' });
    K.grade(ctx, '#d89070', 'soft-light', 0.2 + 0.1 * slow);
    if (slow > 0) K.grade(ctx, '#2a2a40', 'multiply', 0.12 * slow);
    finish(ctx, 0.55 + 0.1 * slow, 0.1, t);
  }

  // ---------------------------------------------------------------- H / I / J / K. the smithy at dusk; the lights of a great house far off
  function greatHouse(ctx, t, x, y, s, a = 1) {
    // a dark mountain shoulder with a keep on it, its windows lit
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#1a2032'; ctx.beginPath(); ctx.moveTo(x - s * 3, y + s * 1.2); ctx.quadraticCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.2, y - s * 0.5); ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.8, x + s * 1.4, y - s * 0.3); ctx.quadraticCurveTo(x + s * 2.4, y + s * 0.3, x + s * 3.2, y + s * 1.2); ctx.fill();
    ctx.fillStyle = '#141826'; ctx.fillRect(x - s * 0.1, y - s * 0.95, s * 0.12, s * 0.5); ctx.fillRect(x + s * 0.2, y - s * 0.8, s * 0.4, s * 0.35); ctx.fillRect(x - s * 0.4, y - s * 0.7, s * 0.25, s * 0.25);
    for (let i = 0; i < 11; i++) { const lx = x - s * 0.35 + K.hash(i, 1, 91) * s * 0.9, ly = y - s * 0.85 + K.hash(i, 2, 91) * s * 0.45, fl = 0.65 + 0.35 * K.noise(t * 1.5 + i * 3, i, 93); ctx.fillStyle = `rgba(255,200,120,${fl})`; ctx.fillRect(lx, ly, Math.max(1.5, s * 0.022), Math.max(1.5, s * 0.03)); K.glow(ctx, lx, ly, s * 0.08, [255, 180, 100], 0.25 * fl); }
    ctx.restore();
  }
  function duskSky(ctx, t) {
    sky(ctx, [[0, '#0c1224'], [0.45, '#22304a'], [0.7, '#4a5468'], [0.82, '#8a6a64'], [1, '#a87a62']]);
    for (let i = 0; i < 60; i++) { const x = K.hash(i, 1, 95) * W, y = K.hash(i, 2, 95) * H * 0.45, tw = 0.5 + 0.5 * Math.sin(t * (1 + K.hash(i, 3, 95) * 2) + i); ctx.fillStyle = `rgba(230,236,255,${0.5 * tw * K.hash(i, 4, 95)})`; ctx.fillRect(x, y, 2, 2); }
  }
  // Runa and Cael on the bench, side view: she mends a strap; he sits with his spear against the wall
  function runa(ctx, x, y, h, t, rim) {
    const o = { kind: 'gown', head: 'hair', hold: 'none', face: 1, arm: 1.05, bend: 1.2, farArm: 0.9, farBend: 1.3, fill: '#0c0a0e' };
    // seated: draw the figure, then hide the legs under a lap
    rimFig(ctx, x, y, h, Object.assign({}, o), rim, -3, -1);
    // braids down her back, the satchel at her hip
    ctx.save(); ctx.fillStyle = '#0c0a0e'; ctx.translate(x, y); ctx.scale(h, h);
    for (const off of [0, 0.022]) { ctx.beginPath(); for (let k = 0; k < 7; k++) { const yy = -0.93 + k * 0.05, xx = -0.06 - off + Math.sin(k * 1.4 + t * 0.6) * 0.006; ctx.ellipse(xx, yy, 0.017, 0.028, 0, 0, TAU); } ctx.fill(); }
    ctx.beginPath(); ctx.roundRect(-0.13, -0.56, 0.11, 0.12, 0.02); ctx.fill(); ctx.fillRect(-0.08, -0.8, 0.012, 0.26);
    ctx.restore();
  }
  function smithy(ctx, t, cam, o = {}) {
    duskSky(ctx, t);
    par(ctx, cam, 0.05, () => { ridge(ctx, 690, 240, 31, 1.3, '#202838'); greatHouse(ctx, t, 1450, 520, 120); });
    band(ctx, 580, 760, '#6a6070', 0, 0.35);
    par(ctx, cam, 0.25, () => ridge(ctx, 800, 130, 33, 1.0, '#141a26'));
    par(ctx, cam, 0.6, () => {
      // the smithy: stone walls, a turf roof, the open door full of the forge's light
      const sx = 560, sy = 920;
      ctx.fillStyle = '#16141a'; ctx.fillRect(sx - 360, sy - 330, 620, 330); ctx.beginPath(); ctx.moveTo(sx - 400, sy - 320); ctx.lineTo(sx - 60, sy - 520); ctx.lineTo(sx + 300, sy - 320); ctx.fill();
      ctx.fillRect(sx + 120, sy - 560, 70, 200);
      const fl = 0.85 + 0.1 * Math.sin(t * 7) + 0.08 * K.noise(t * 4, 1, 97);
      const dg = ctx.createLinearGradient(0, sy - 240, 0, sy); dg.addColorStop(0, `rgba(255,150,60,${0.9 * fl})`); dg.addColorStop(1, `rgba(255,200,110,${fl})`); ctx.fillStyle = dg; ctx.fillRect(sx - 230, sy - 240, 150, 240);
      K.glow(ctx, sx - 155, sy - 100, 420, [255, 140, 60], 0.45 * fl);
      // light thrown out of the door onto the ground
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,140,60,${0.22 * fl})`; ctx.beginPath(); ctx.moveTo(sx - 230, sy); ctx.lineTo(sx - 80, sy); ctx.lineTo(sx + 260, sy + 160); ctx.lineTo(sx - 420, sy + 160); ctx.closePath(); ctx.fill(); ctx.restore();
      // sparks and smoke from the chimney
      K.embers(ctx, t, { n: 26, heat: 0.8, x: sx + 100, y: sy - 900, w: 120, h: 360, seed: 99 });
      K.smoke(ctx, t, { n: 8, x: sx + 100, y: sy - 1000, w: 120, h: 420, color: [50, 50, 60], alpha: 0.3, size: 160, rise: 12, seed: 101, drift: 8 });
    });
    par(ctx, cam, 0.8, () => {
      ctx.fillStyle = '#0e0c12'; ctx.fillRect(-500, 920, W + 1000, 400);
      // the bench, Runa and Cael on it, the forge light on their near edges
      const bx = 1020, by = 930, rim = 'rgba(255,150,70,0.7)';
      ctx.fillStyle = '#0a090c'; ctx.fillRect(bx - 200, by - 110, 470, 20); ctx.fillRect(bx - 180, by - 90, 16, 90); ctx.fillRect(bx + 230, by - 90, 16, 90);
      runa(ctx, bx - 60, by - 10, 300, t, rim);
      ctx.fillStyle = '#0a090c'; ctx.fillRect(bx - 130, by - 140, 140, 50);
      rimFig(ctx, bx + 140, by - 4, 330, { kind: 'cloak', head: 'hair', hold: 'none', face: 1, arm: 0.6, bend: 1.2, farArm: 0.5, farBend: 1.3, fill: '#0a090c' }, rim, -3, -1);
      ctx.fillRect(bx + 60, by - 120, 210, 46);
      spear(ctx, bx + 330, by + 6, -Math.PI / 2 - 0.12, 420, 0, '#0a090c', 6, '#2a2a30');
      // the strap in her hands, the needle catching the light
      const nx = bx + 10, ny = by - 175 + Math.sin(t * 3.2) * 6; ctx.strokeStyle = 'rgba(255,190,120,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + 18, ny - 14); ctx.stroke();
    });
    K.embers(ctx, t, { n: 10, heat: 0.5, x: 200, y: 500, w: 900, h: 500, seed: 103 });
  }
  function shotSmithy(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(-70, 40, easeIO(u)), y: 0, z: lerp(1.0, 1.06, u) };
    smithy(ctx, t, cam);
    K.grade(ctx, '#5a6890', 'soft-light', 0.25);
    finish(ctx, 0.6, 0.1, t);
  }
  // her hands mending the strap; the unsworn cord at her wrist
  function shotCord(ctx, t, T, lt, d) {
    const u = lt / d, z = lerp(1.32, 1.42, easeIO(u)), fl = 0.85 + 0.1 * Math.sin(t * 7) + 0.08 * K.noise(t * 4, 1, 97);
    ctx.fillStyle = '#0e0c10'; ctx.fillRect(0, 0, W, H);
    K.glow(ctx, 760, 420, 760, [255, 130, 50], 0.22 * fl);
    for (let i = 0; i < 9; i++) { const x = K.hash(i, 1, 105) * 700, y = 150 + K.hash(i, 2, 105) * 700, r = 50 + K.hash(i, 3, 105) * 90; K.glow(ctx, x, y, r, [255, 140, 60], 0.14 * fl); }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2 + 110, -H / 2 - 30);
    // the dark wool of her lap
    ctx.fillStyle = '#1e1a1e'; ctx.beginPath(); ctx.moveTo(-100, 760); ctx.quadraticCurveTo(900, 640, W + 100, 780); ctx.lineTo(W + 100, H + 100); ctx.lineTo(-100, H + 100); ctx.fill();
    // the strap across her knees, stitch holes, a new stitch drawn through
    ctx.save(); ctx.translate(960, 700); ctx.rotate(-0.1);
    ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.roundRect(-620, -38, 1240, 76, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,90,0.25)'; ctx.fillRect(-620, -38, 1240, 8);
    const done = Math.floor(lt * 2.2);
    for (let i = 0; i < 18; i++) { const x = -420 + i * 42; ctx.fillStyle = '#1a0f08'; ctx.beginPath(); ctx.arc(x, -14, 4, 0, TAU); ctx.fill(); if (i < 6 + done) { ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x + 21, 14); ctx.stroke(); } }
    ctx.restore();
    // her right hand drawing the thread up, the needle catching the forge
    const pull = (lt * 2.2) % 1, nx = 960 - 420 + (6 + done) * 42 + 30, ny = 640 - easeOut(pull) * 170;
    ctx.save(); ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nx - 20, 700); ctx.quadraticCurveTo(nx - 6, 660, nx + 6, ny + 10); ctx.stroke(); ctx.restore();
    hand(ctx, nx + 120, ny - 40, 120, -2.75, { skin: '#1e1612', sleeve: '#2a2228', light: `rgba(255,150,70,${0.6 * fl})`, flip: true });
    ctx.save(); ctx.strokeStyle = '#ece8e0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx + 2, ny + 22); ctx.lineTo(nx + 22, ny - 34); ctx.stroke(); ctx.restore();
    K.glow(ctx, nx + 18, ny - 28, 22, [255, 220, 170], 0.6 * fl);
    // her left hand gripping the strap; at its wrist the unsworn cord: plain grey, knotted
    const lx = 600, ly = 668, ls = 150, la = 0.15;
    hand(ctx, lx, ly, ls, la, { skin: '#1e1612', sleeve: '#2a2228', light: `rgba(255,150,70,${0.55 * fl})` });
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(la); ctx.scale(ls, ls);
    const cx = -1.08;
    ctx.strokeStyle = '#8a8884'; ctx.lineWidth = 0.075; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 0.06, -0.68); ctx.bezierCurveTo(cx + 0.06, -0.3, cx + 0.06, 0.1, cx - 0.04, 0.46); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,198,190,0.6)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(cx - 0.08, -0.66); ctx.bezierCurveTo(cx + 0.03, -0.3, cx + 0.03, 0.1, cx - 0.06, 0.44); ctx.stroke();
    for (const k of [-0.42, -0.02, 0.3]) { ctx.fillStyle = '#7a7874'; ctx.beginPath(); ctx.ellipse(cx + 0.03, k, 0.08, 0.065, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(255,170,100,${0.5 * fl})`; ctx.beginPath(); ctx.ellipse(cx + 0.0, k - 0.025, 0.035, 0.022, 0.3, 0, TAU); ctx.fill(); }
    // the loose ends of the knot hanging
    ctx.strokeStyle = '#8a8884'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(cx + 0.03, 0.3); ctx.quadraticCurveTo(cx + 0.12, 0.55, cx + 0.05, 0.78); ctx.moveTo(cx + 0.03, 0.3); ctx.quadraticCurveTo(cx - 0.06, 0.56, cx - 0.04, 0.74); ctx.stroke();
    ctx.restore();
    ctx.restore();
    K.grade(ctx, '#c07040', 'soft-light', 0.18);
    finish(ctx, 0.66, 0.1, t);
  }
  // the two of them from behind, the lights far off between them
  function shotLights(ctx, t, T, lt, d) {
    const u = lt / d, cam = { x: lerp(-20, 20, u), y: 0, z: lerp(1.0, 1.1, easeIO(u)) }, fl = 0.85 + 0.1 * Math.sin(t * 7) + 0.08 * K.noise(t * 4, 1, 97);
    duskSky(ctx, t);
    par(ctx, cam, 0.06, () => { ridge(ctx, 700, 260, 41, 1.2, '#1e2636'); greatHouse(ctx, t, 960, 560, 150); });
    band(ctx, 600, 780, '#5a5468', 0, 0.35);
    par(ctx, cam, 0.25, () => ridge(ctx, 820, 120, 43, 1.0, '#121824'));
    par(ctx, cam, 0.9, () => {
      // backs: Runa at the left turned to him, Cael at the right looking out; forge light on their backs from behind us
      const rim = `rgba(255,140,60,${0.75 * fl})`;
      ctx.fillStyle = '#08070a'; ctx.fillRect(-300, 1000, W + 600, 300);
      // a figure seen from behind: shoulders under wool, the neck, the head (turned a little), the hair. Each part is its
      // own filled shape (rim first, offset toward the forge behind us; then the dark shape over it).
      const parts = (x, h, turn, who) => {
        const by = 1090, hx = x + turn * h * 0.03, hy = by - h * 0.9, out = [];
        out.push(c => { c.beginPath(); c.moveTo(x - h * 0.42, by + 20); c.bezierCurveTo(x - h * 0.42, by - h * 0.4, x - h * 0.34, by - h * 0.62, x - h * 0.1, by - h * 0.68); c.lineTo(x + h * 0.1, by - h * 0.68); c.bezierCurveTo(x + h * 0.34, by - h * 0.62, x + h * 0.42, by - h * 0.4, x + h * 0.42, by + 20); c.closePath(); });
        out.push(c => { c.beginPath(); c.rect(x - h * 0.055, by - h * 0.8, h * 0.11, h * 0.14); });
        if (who === 'cael') out.push(c => {   // hair to the jaw: round crown, falling a little wider, ragged at the ends
          c.beginPath(); c.moveTo(hx - h * 0.118, hy + h * 0.02); c.bezierCurveTo(hx - h * 0.13, hy - h * 0.2, hx + h * 0.13, hy - h * 0.2, hx + h * 0.118, hy + h * 0.02);
          c.quadraticCurveTo(hx + h * 0.13, hy + h * 0.1, hx + h * 0.125, hy + h * 0.15); c.lineTo(hx + h * 0.1, hy + h * 0.125); c.lineTo(hx + h * 0.085, hy + h * 0.16); c.lineTo(hx + h * 0.06, hy + h * 0.12);
          c.lineTo(hx - h * 0.06, hy + h * 0.12); c.lineTo(hx - h * 0.085, hy + h * 0.165); c.lineTo(hx - h * 0.1, hy + h * 0.125); c.lineTo(hx - h * 0.128, hy + h * 0.155); c.quadraticCurveTo(hx - h * 0.132, hy + h * 0.1, hx - h * 0.118, hy + h * 0.02); c.closePath(); });
        else out.push(c => { c.beginPath(); c.ellipse(hx, hy, h * 0.105, h * 0.13, 0, 0, TAU); });
        if (who === 'runa') {
          out.push(c => { c.beginPath(); c.moveTo(hx + h * 0.085, hy - h * 0.04); c.quadraticCurveTo(hx + h * 0.13, hy + h * 0.01, hx + h * 0.112, hy + h * 0.035); c.lineTo(hx + h * 0.09, hy + h * 0.06); c.closePath(); });   // the turned cheek and nose
          for (const sd of [-1, 1]) out.push(c => { c.beginPath(); for (let k = 0; k < 9; k++) { const bx2 = hx + sd * h * (0.085 + k * 0.006) + Math.sin(k * 1.3 + t * 0.7) * 1.2, by2 = hy + h * 0.06 + k * h * 0.05, r = h * (0.026 - k * 0.0012); c.moveTo(bx2 + r, by2); c.ellipse(bx2, by2, r, r * 1.35, 0, 0, TAU); } });
        }
        return out;
      };
      const body = (x, h, turn, who) => {
        const ps = parts(x, h, turn, who);
        ctx.save(); ctx.translate(-5, -4); ctx.fillStyle = rim; for (const f of ps) { f(ctx); ctx.fill(); } ctx.restore();
        ctx.fillStyle = '#08070a'; for (const f of ps) { f(ctx); ctx.fill(); }
        if (who === 'runa') { ctx.strokeStyle = `rgba(255,140,60,${0.35 * fl})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - h * 0.25, 1090 - h * 0.62); ctx.lineTo(x + h * 0.3, 1090 - h * 0.15); ctx.stroke(); }
      };
      body(560, 520, 1, 'runa');
      body(1330, 600, 0.3, 'cael');
      // his spear leaning on the bench end
      spear(ctx, 1700, 1100, -Math.PI / 2 + 0.08, 900, 0, '#08070a', 9, '#14141a');
    });
    K.embers(ctx, t, { n: 12, heat: 0.5, x: 0, y: 300, w: W, h: 700, seed: 107 });
    K.grade(ctx, '#5a6890', 'soft-light', 0.25);
    finish(ctx, 0.62, 0.1, t);
  }
  // close on him: the profile against the dusk, the lights behind; on "Not yet" the focus racks to them
  function profilePath(ctx, s) {
    // facing right; (0, 0) at the base of the neck, s = head height
    ctx.beginPath();
    ctx.moveTo(-0.9 * s, 0.9 * s);                          // shoulder behind
    ctx.quadraticCurveTo(-0.55 * s, 0.25 * s, -0.25 * s, 0.05 * s);
    ctx.lineTo(-0.25 * s, -0.25 * s);                       // nape
    ctx.lineTo(-0.2 * s, -0.16 * s); ctx.lineTo(-0.34 * s, -0.2 * s); ctx.lineTo(-0.3 * s, -0.27 * s); ctx.lineTo(-0.42 * s, -0.3 * s); ctx.lineTo(-0.38 * s, -0.38 * s);   // locks at the nape
    ctx.bezierCurveTo(-0.52 * s, -0.5 * s, -0.52 * s, -0.95 * s, -0.12 * s, -1.08 * s);   // back of the head, hair to the jaw
    ctx.bezierCurveTo(0.2 * s, -1.18 * s, 0.44 * s, -0.98 * s, 0.42 * s, -0.8 * s);        // crown to the hairline
    ctx.lineTo(0.36 * s, -0.76 * s); ctx.lineTo(0.41 * s, -0.71 * s);                       // a lock over the brow
    ctx.lineTo(0.43 * s, -0.6 * s);                         // brow
    ctx.lineTo(0.41 * s, -0.55 * s);                        // eye
    ctx.quadraticCurveTo(0.5 * s, -0.42 * s, 0.53 * s, -0.36 * s);   // nose
    ctx.lineTo(0.46 * s, -0.33 * s);
    ctx.quadraticCurveTo(0.47 * s, -0.27 * s, 0.45 * s, -0.24 * s);  // lips
    ctx.quadraticCurveTo(0.47 * s, -0.19 * s, 0.43 * s, -0.16 * s);
    ctx.quadraticCurveTo(0.44 * s, -0.08 * s, 0.32 * s, -0.04 * s);  // chin, jaw
    ctx.quadraticCurveTo(0.15 * s, -0.02 * s, 0.1 * s, 0.1 * s);     // throat
    ctx.quadraticCurveTo(0.2 * s, 0.5 * s, 0.9 * s, 0.9 * s);        // collar of the cloak forward
    ctx.lineTo(0.9 * s, 2 * s); ctx.lineTo(-0.9 * s, 2 * s); ctx.closePath();
  }
  function shotProfile(ctx, t, T, lt, d) {
    const u = clamp(lt / d), z = lerp(1.0, 1.08, easeIO(u)), fl = 0.85 + 0.1 * Math.sin(t * 7) + 0.08 * K.noise(t * 4, 1, 97);
    const rack = smooth(span(t, T.L21 + 1.45, T.L21 + 2.25));         // 0: on him, 1: on the lights
    // the far layer (sky, mountain, lights) at quarter size, blurred by how far the focus is from it
    const q = 0.25, B = K.layer('s3:bg', W * q, H * q), bx = B.getContext('2d');
    bx.save(); bx.scale(q, q); duskSky(bx, t); ridge(bx, 760, 300, 51, 1.1, '#1c2434'); greatHouse(bx, t, 1300, 640, 220); bx.restore();
    const bb = lerp(4, 0, rack);
    ctx.save(); ctx.filter = bb > 0.2 ? `blur(${bb * q * 4}px)` : 'none'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
    if (rack > 0.5) greatHouse(ctx, t, 1300, 640, 220, smooth((rack - 0.5) * 2) * 0.9);
    // him: rim light from the forge behind (left), the dusk cool on his face
    const F = K.layer('s3:fg', W * 0.5, H * 0.5), fx = F.getContext('2d');
    fx.save(); fx.scale(0.5, 0.5); fx.translate(W / 2, H / 2); fx.scale(z, z); fx.translate(-W / 2, -H / 2);
    const px = 640, py = 760, s = 470, wind = Math.sin(t * 1.1) * 0.01;
    fx.save(); fx.translate(px - 7, py - 3); fx.fillStyle = `rgba(255,150,70,${0.9 * fl})`; profilePath(fx, s); fx.fill(); fx.restore();
    fx.save(); fx.translate(px, py); fx.fillStyle = '#0a090c'; profilePath(fx, s); fx.fill();
    // a lock of hair at the jaw stirring; the cool edge of dusk on the brow and nose
    fx.fillStyle = '#0a090c'; fx.beginPath(); fx.moveTo(-0.18 * s, -0.3 * s); fx.quadraticCurveTo(-0.02 * s + wind * s, -0.15 * s, -0.05 * s + wind * s * 2, -0.02 * s); fx.lineTo(-0.15 * s, -0.1 * s); fx.closePath(); fx.fill();
    fx.strokeStyle = 'rgba(150,170,210,0.35)'; fx.lineWidth = 3; fx.beginPath(); fx.moveTo(0.4 * s, -0.72 * s); fx.lineTo(0.43 * s, -0.6 * s); fx.quadraticCurveTo(0.5 * s, -0.42 * s, 0.53 * s, -0.36 * s); fx.stroke();
    // the eye: a glint of the far lights
    K.glow(fx, 0.36 * s, -0.55 * s, 12, [255, 200, 130], 0.6 * (0.7 + 0.3 * fl));
    fx.restore(); fx.restore();
    const fb = lerp(0, 3.5, rack);
    ctx.save(); ctx.filter = fb > 0.2 ? `blur(${fb}px)` : 'none'; ctx.drawImage(F, 0, 0, W, H); ctx.restore();
    K.embers(ctx, t, { n: 10, heat: 0.45, x: 0, y: 200, w: 900, h: 800, seed: 109 });
    K.grade(ctx, '#5a6890', 'soft-light', 0.25);
    finish(ctx, 0.66, 0.1, t);
  }

  // ---------------------------------------------------------------- the shots in order
  const SHOTS = [shotFord, shotMend, shotFordLow, shotGate, shotPost, shotHands, shotRead, shotSmithy, shotCord, shotLights, shotProfile];
  const FADES = [0, 0.2, 0.15, 0.2, 0.3, 0.25, 0.2, 0.35, 0.25, 0.25, 0.3];
  function drawShot(ctx, i, t, T) { const a = T.cuts[i], b = T.cuts[i + 1]; ctx.save(); SHOTS[i](ctx, t, T, Math.max(0, t - a), b - a); ctx.restore(); }

  SCENES[3] = {
    join: 'dissolve', joinDur: 1.4,
    draw(ctx, t, sc) {
      const T = T0(); t = Math.min(t, sc.end + 1.2);
      let i = 0; while (i < SHOTS.length - 1 && t >= T.cuts[i + 1]) i++;
      const fd = FADES[i];
      if (i > 0 && fd > 0 && t < T.cuts[i] + fd) {
        const A = K.layer('s3:a'), B = K.layer('s3:b');
        drawShot(A.getContext('2d'), i - 1, t, T); drawShot(B.getContext('2d'), i, t, T);
        ctx.drawImage(A, 0, 0); ctx.globalAlpha = smooth((t - T.cuts[i]) / fd); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1;
      } else drawShot(ctx, i, t, T);
    },
  };
})();
