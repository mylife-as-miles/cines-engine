/* ONE TOO MANY — film set 'yard': the back yard at night, and the burning house.
   Ports style frames F02 (cold open), F13 ("Two."), F12 (the kitchen erupts) and the S03 cold-open / ending tiles.
   The set draws the environment only: no characters (the sequences place Scott; demos use placeholders).

   ONE HOUSE. Every view draws the same model (HM, F02's facade): a two-storey body (3 upstairs windows, the big window lower left)
   and a one-storey kitchen wing at the right holding the kitchen window AND the back door with four steps. 'backdoor' is exactly
   that model at 2x about the door (MB). After the blast the doorway is a ragged burning hole and the door lies burning on the lawn
   in every view (state.blown, default true).

   SETS.yard.draw(c, t, state, view)      back + front, no characters
   SETS.yard.back(c, t, state, view)      everything behind the characters (does not call the camera)
   SETS.yard.front(c, t, state, view)     foreground grass (sheared by the blast on 'backdoor'), then state.dim
   SETS.yard.camera(c, view, t, state, cam)   c.camera() with a named framing (cams[view][name]) or {x,y,zoom,dx,dy}, plus the blast shake
   SETS.yard.shakeAt(t, state)            {dx, dy, a}: 18 px decaying in the blast, 6 px after secondBlast, else nothing (the yard never shakes)
   SETS.yard.lightAt(view, t, state, pt?) the motivated light for rims {x, y, dx, dy, color, rimW, k}; with pt [x,y] the direction is from pt to it
   SETS.yard.figStyle(view, t, state, pt?) how to fill a character this frame {fill, rimColor, rimW, light, lightPt, phase, echoes?}
   SETS.yard.flicker(t, seed)             0..1, the noise that drives the flames and the light
   SETS.yard.blastAt(t, t0)               0..1 blast clock from the boom at t0: exactly 3 white frames, then 4 negative frames, then 2.7 s of aftermath
   SETS.yard.doorHandle(doorOpen)         world point of the back-door handle ('backdoor' view) for the hand that pulls it shut
   SETS.yard.burnThrough(c, k, opts)      the black frame burning open (k 0 = black .. 1 = open). Screen space; call it LAST in the shot.
   SETS.yard.burnMattes(c, k, aspect, o)  the letterbox mattes burning away from the blast (k 0 = intact .. 1 = gone). Screen space; call it last.
   SETS.yard.fx.flame / fx.tongue / fx.sparks   flat three-tone fire and spark bursts on c.g + c.em (the shirt catching)

   Views: 'house' 'scott' 'ending' 'backdoor' 'fence' 'hands'  (each 1920x1080 world, authored framing = no camera)
   state (all optional; defaults per view in SETS.yard.defaults):
     fire 0..1            flame size / light (backdoor: < 0.5 = the house is not burning yet; the blast switches it to burning)
     blown bool           the back door blown off (default true): ragged burning doorway + the door burning on the lawn. false = shut, fire behind its panes
     curtain 0..1         upstairs curtain: 0 hangs inside, 0..0.5 lifts out on the heat, 0.5..1 burns away from the tip, 1 gone
     roof 0..1            the roof burned through over the left bedrooms (F13), flames standing in the bite
     strobe 0..1          red/blue bars sweeping through the fence slats at 1.6 Hz (and thrown across the grass)
     glassBreak  time     the big downstairs window bursts: shards out onto the lawn, a flare
     windowCollapse time  a window (collapseWin, default 2 = upstairs right) collapses inward: the lintel falls in, flare, sparks
     kitchenFlare 0..1    'backdoor', before the boom: the kitchen window, door glass and spill go hood -> fireMid -> fireCore (2-4 frames)
     blast 0..1           'backdoor': the explosion (use blastAt). white -> negative inversion (F12) -> aftermath -> burning
     secondBlast time     the second explosion: a fountain of sparks into the night from the kitchen, a flare, a 6 px shake
     doorOpen 0..1        'backdoor': the back door swung in (0 shut). It is blown off in the blast.
     handGlow 0..1        'ending' / 'hands': the warm pool on the grass round the held hands
     dim 0..1             everything toward ink (applied at the end of front(); the knockout hand is composited later and stays lit) */
(function (global) {
  'use strict';
  const O = global.OTM; const { C, W, H, S, mix, rgba, clamp, lerp } = O;
  const SETS = global.SETS = global.SETS || {};
  const FL = () => global.FILM;
  const sat = v => clamp(v, 0, 1), frac = v => v - Math.floor(v);
  const smooth = u => { u = sat(u); return u * u * (3 - 2 * u); };
  const outC = u => { u = sat(u); return 1 - (1 - u) * (1 - u) * (1 - u); };
  const NIGHT = C.yardNight, CHAR = '#2A0B05', BLACK = '#060404';
  const glowC = k => mix(NIGHT, C.fireOuter, k), lawnC = k => mix(C.grass, C.fireOuter, k), inkC = k => mix(C.ink, NIGHT, k);
  const RIM = mix(C.fireMid, C.fireCore, 0.18);
  const FIRE3 = [C.fireOuter, C.fireMid, C.fireCore], INV3 = [C.fireMid, C.fireOuter, C.ink];
  const apM = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const polyP = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  const lineP = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); return p; };
  const lay = (c, key, w, h, fn) => c.cache('yard.' + key, fn, w, h);

  // one noise drives the flames' breathing and the light they throw
  function flick(t, s) {
    s = s || 0;
    const v = 0.55 * O.vnoise(t * 2.1, 0.37, 901 + s) + 0.3 * O.vnoise(t * 5.3, 1.71, 917 + s) + 0.15 * O.vnoise(t * 11.3, 2.93, 933 + s);
    return sat((v - 0.22) / 0.56);
  }
  // the same noise low-passed (no 11 Hz octave, slower): for LARGE light areas (sky glow, lawn pools), so big hard-edged discs never jitter
  function flickA(t, s) {
    s = s || 0;
    const v = 0.68 * O.vnoise(t * 1.26, 0.37, 901 + s) + 0.32 * O.vnoise(t * 3.2, 1.71, 917 + s);
    return sat((v - 0.2) / 0.6);
  }
  // flat bands from shapes (outer -> inner), each seam printed with a dither
  function bandsOf(g, list, seed) {
    list.forEach((b, i) => {
      const p = b.shape.path(b.rough == null ? 2 : b.rough, (seed || 40) + i); g.fillStyle = b.col; g.fill(p);
      if (i) { g.save(); g.strokeStyle = O.ditherPattern(g, list[i - 1].col); g.lineWidth = 5; g.stroke(p); g.restore(); }
    });
  }
  // flat three-tone tongue pointing along ang (0 = up), animated by t (F12's tongue)
  function tongue(g, x, y, w, h, ang, seed, t, tones) {
    if (h < 2 || w < 2) return;
    g.save(); g.translate(x, y); g.rotate(ang);
    tones.forEach((col, k) => {
      const sc = 1 - k * 0.27, sh = S(), n = 9, pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, bx = (u - 0.5) * w * sc;
        const hh = Math.pow(Math.sin(u * Math.PI), 0.75) * h * sc * (0.5 + 0.8 * O.fbm(u * 3 + seed, k * 0.7 + t * 1.3, seed + k, 3));
        pts.push([bx + (O.vnoise(u * 5, k + t * 2, seed) - 0.5) * w * 0.14, -hh]);
      }
      sh.M(-w * sc / 2, 0);
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) sh.L(p[0], p[1]); else { const q = pts[i - 1]; sh.Q(q[0] + (p[0] - q[0]) * 0.5, Math.min(q[1], p[1]) - h * 0.07 * sc, p[0], p[1]); } }
      sh.L(w * sc / 2, 0).Z();
      g.fillStyle = col; g.fill(sh.path(1.0, seed + k));
    });
    g.restore();
  }
  function zenith(g, y0, amp, seed) {
    const pts = [[-20, -20], [W + 20, -20]]; for (let x = W + 20; x >= -20; x -= 40) pts.push([x, y0 + amp * Math.sin(x * 0.004 + seed) + amp * 0.5 * Math.sin(x * 0.011 + seed * 2)]);
    const p = S().poly(pts).path(2, 21); const zen = mix(C.ink, NIGHT, 0.62);
    g.fillStyle = zen; g.fill(p); g.save(); g.strokeStyle = O.ditherPattern(g, zen); g.lineWidth = 5; g.stroke(p); g.restore();
  }

  // a heavy cut-paper smoke bank (F13's): lumps along a path plus a slab off the frame edge; only its belly near the fire is lit (cached)
  function smokeBank(g, o) {
    const R = O.rng(o.seed), rr = (a, b) => a + (b - a) * R(), plume = S();
    for (let i = 0; i <= o.n; i++) { const t = i / o.n, p = o.path(t), r = o.r(t); for (let k = 0; k < 3; k++) plume.circle(p[0] + rr(-0.5, 0.5) * r, p[1] + rr(-0.3, 0.3) * r, r * rr(0.55, 0.8)); }
    if (o.slab) plume.poly(o.slab);
    const pp = plume.path(3, 77); g.fillStyle = o.col; g.fill(pp);
    (o.rims || []).forEach(([col, dx, dy, ex, ey, rx, ry]) => { const tc = O.makeCanvas(W, H).getContext('2d'); tc.fillStyle = col; tc.fill(pp); tc.globalCompositeOperation = 'destination-out'; tc.translate(dx, dy); tc.fill(pp); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'destination-in'; tc.beginPath(); tc.ellipse(ex, ey, rx, ry, 0, 0, 7); tc.fill(); g.drawImage(tc.canvas, 0, 0); });
  }
  const SMOKE_INK = mix(C.ink, NIGHT, 0.36);

  // ======================= particles =======================
  // embers rising on the heat: deterministic per-ember phase, so any t can be drawn
  function emberSys(o) {
    const R = O.rng(o.seed || 'emb'), L = [];
    for (let i = 0; i < o.n; i++) L.push({ x: o.x + R() * o.w, y: o.y + R() * o.h, life: o.life * (0.6 + 0.8 * R()), ph: R(), rise: o.rise * (0.55 + 0.9 * R()),
      s: (o.size || 1) * (1 + R() * 2.4), e: 1 + R(), rot: R() * 3, hot: R() < (o.hot == null ? 0.25 : o.hot), sw: R() * 6.28, swA: 3 + R() * 12, dr: (o.drift || 0) * (0.5 + R()) });
    return { o, L };
  }
  function drawEmbers(g, em, E, t, k) {
    const n = Math.round(E.L.length * sat(k)); if (!n) return;
    const pm = new Path2D(), ph = new Path2D(), pe = new Path2D();
    for (let i = 0; i < n; i++) {
      const e = E.L[i], u = frac(t / e.life + e.ph);
      const x = e.x + e.dr * u * u + Math.sin(t * 1.3 + e.sw) * e.swA * u, y = e.y - e.rise * u;
      const s = e.s * (u < 0.7 ? 1 : 0.55), a = e.rot + t * 0.8, P = e.hot ? ph : pm;
      P.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); P.ellipse(x, y, s, s * e.e, a, 0, 6.2832);
      if (em && i % 2 === 0) { pe.moveTo(x + 3 * s, y); pe.arc(x, y, 3 * s, 0, 6.2832); }
    }
    g.fillStyle = rgba(C.fireMid, 0.88); g.fill(pm); g.fillStyle = C.fireCore; g.fill(ph);
    if (em) { em.fillStyle = C.fireMid; em.fill(pe); }
  }
  // a burst of sparks thrown from p at time 0 of u (seconds), with gravity; drawn as short streaks
  function sparkBurst(g, em, p, u, o) {
    if (u < 0 || u > (o.life || 3)) return;
    const R = O.rng(o.seed || 'burst'), hot = new Path2D(), mid = new Path2D(), gr = o.grav == null ? 380 : o.grav;
    for (let i = 0; i < o.n; i++) {
      const a = (o.a0 == null ? -Math.PI : o.a0) + R() * (o.a1 == null ? Math.PI : o.a1 - (o.a0 == null ? -Math.PI : o.a0));
      const v = o.v0 + R() * (o.v1 - o.v0), life = (o.life || 3) * (0.45 + 0.55 * R()), hotK = R() < 0.4;
      if (u > life) continue;
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v, dr = Math.exp(-u * 0.9);
      const x = p[0] + vx * (1 - dr) / 0.9, y = p[1] + vy * (1 - dr) / 0.9 + 0.5 * gr * u * u;
      if (o.floor != null && y > o.floor) continue;
      const cvx = vx * dr, cvy = vy * dr + gr * u, l = Math.hypot(cvx, cvy) || 1, len = Math.min(26, 3 + l * 0.022) * (1 - u / life * 0.6);
      const P = hotK ? hot : mid; P.moveTo(x, y); P.lineTo(x - cvx / l * len, y - cvy / l * len);
    }
    g.save(); g.lineCap = 'round'; g.lineWidth = o.lw || 2.4; g.strokeStyle = C.fireMid; g.stroke(mid); g.strokeStyle = C.fireCore; g.stroke(hot); g.restore();
    if (em) { em.save(); em.lineWidth = 7; em.lineCap = 'round'; em.strokeStyle = C.fireMid; em.stroke(hot); em.restore(); }
  }

  // ======================= smoke: cut-paper billows (cached sprites) drifting along a path =======================
  const _spr = new Map();
  function sprite(body, belly, v, dir, rimK) {
    const key = body + belly + v + (dir ? dir.dx + ',' + dir.dy : '') + rimK; let cv = _spr.get(key); if (cv) return cv;
    const R = 128, P = 22, n = 2 * (R + P); cv = O.makeCanvas(n, n); const g = cv.getContext('2d');
    const p = S().circle(R + P, R + P, R).path(2.6, 300 + v * 7);
    if (belly === body) { g.fillStyle = body; g.fill(p); }
    else O.silhouette(g, p, { fill: body, light: dir || { dx: -0.3, dy: 0.95 }, rimColor: belly, rimW: R * (rimK || 0.32) });
    _spr.set(key, cv); return cv;
  }
  // o.live < 1: only lobes on [0, live] drift; the rest of the plume [bake, 1] is a cached bank drawn over them (they slide in under it)
  function smokeSys(o) {
    const R = O.rng(o.seed || 'smoke'), L = [], B = [], live = o.live == null ? 1 : o.live, nl = Math.round(o.n * live);
    for (let i = 0; i < nl; i++) L.push({ ph: (i + R() * 0.8) / nl, off: R() * 2 - 1, offY: (R() * 2 - 1) * (o.offY || 0.22), rk: 0.55 + 0.25 * R(), v: i % 4, wob: R() * 6.28 });
    if (live < 1) { const b0 = o.bake == null ? live : o.bake, nb = Math.round(o.n * (1 - b0)); for (let i = 0; i < nb; i++) B.push({ u: b0 + (1 - b0) * (i + R() * 0.8) / nb, off: R() * 2 - 1, offY: (R() * 2 - 1) * (o.offY || 0.22), rk: 0.55 + 0.25 * R(), v: i % 4, wob: R() * 6.28 }); }
    return { o, L, B, live };
  }
  function drawSmokeBaked(g, Sm) { drawSmoke(g, { o: Sm.o, L: Sm.B, live: 1, baked: true }, 0, 1); }
  function drawSmoke(g, Sm, t, k) {
    const o = Sm.o, items = [], live = Sm.live == null ? 1 : Sm.live;
    for (const l of Sm.L) {
      const u = Sm.baked ? l.u : live * frac(t / (o.T * live) + l.ph), p = o.path(u);
      const r = o.r(u) * l.rk * (Sm.baked ? 1 : smooth(u / (o.born || 0.1))) * (0.75 + 0.25 * k);
      if (r < 3) continue;
      const sp = o.spread(u);
      const x = p[0] + l.off * r * sp + Math.sin(t * 0.21 + l.wob) * r * 0.08, y = p[1] + l.offY * r + Math.cos(t * 0.17 + l.wob) * r * 0.05;
      if (x + r < -260 || x - r > W + 260 || y + r < -260 || y - r > H + 260) continue;
      items.push({ x, y, r, v: l.v, a: o.fade ? 1 - smooth((u - o.fade) / (1 - o.fade)) : 1 });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const lv = clamp(o.level(it.x, it.y), 0, o.levels.length - 1), lo = Math.floor(lv), fr = sat((lv - lo - 0.3) / 0.4);
      const sz = 300 * it.r / 128, A = o.levels[lo]; if (it.a <= 0.01) continue;
      g.globalAlpha = it.a; g.drawImage(sprite(A.body, A.belly, it.v, o.dir, A.rimK), it.x - sz / 2, it.y - sz / 2, sz, sz);
      if (fr > 0 && lo + 1 < o.levels.length) { const B = o.levels[lo + 1]; g.globalAlpha = fr * it.a; g.drawImage(sprite(B.body, B.belly, it.v, o.dir, B.rimK), it.x - sz / 2, it.y - sz / 2, sz, sz); }
      g.globalAlpha = 1;
    }
  }

  // ======================= the strobes: red and blue sweeping through the slat gaps =======================
  const STROBE_HZ = 1.6;
  function strobePos(t) { const p = frac(t * STROBE_HZ); return { r: -0.3 + 1.6 * p, b: -0.3 + 1.6 * frac(p + 0.5) }; }
  function gapLight(i, n, P) {
    const u = (i + 0.5) / n, dr = Math.abs(u - P.r) * n, db = Math.abs(u - P.b) * n;
    if (dr <= 0.9) return [C.strobeRed, 1, 'r']; if (db <= 0.9) return [C.strobeBlue, 1, 'b'];
    if (dr <= 2.6) return [C.strobeRed, 0.42, 'r']; if (db <= 2.2) return [C.strobeBlue, 0.42, 'b']; return null;
  }
  function strobeBar(g, x, y, col, ang, w0, w1, alpha, len) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, p1 = [x + dx * len, y + dy * len];
    [[1, alpha], [0.42, alpha * 1.9]].forEach(([k, a]) => {
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = Math.min(1, a); g.fillStyle = col; g.beginPath();
      g.moveTo(x + nx * w0 * k, y + ny * w0 * k); g.lineTo(p1[0] + nx * w1 * k, p1[1] + ny * w1 * k);
      g.lineTo(p1[0] - nx * w1 * k, p1[1] - ny * w1 * k); g.lineTo(x - nx * w0 * k, y - ny * w0 * k); g.closePath(); g.fill(); g.restore();
    });
  }
  function strobeLive(g, em, V, t, s) {
    const gaps = V.gaps, n = gaps.length, P = strobePos(t); let hitR = -1, hitB = -1;
    for (let i = 0; i < n; i++) {
      const L = gapLight(i, n, P); if (!L) continue;
      const q = gaps[i].q; g.fillStyle = mix(V.gapBase, L[0], L[1] * s); g.fill(polyP(q));
      em.save(); em.globalAlpha = L[1] * s * 0.8; em.fillStyle = L[0]; em.fill(polyP(q)); em.restore();
      if (L[1] === 1) { if (L[2] === 'r') hitR = i; else hitB = i; }
    }
    if (V.bar) [[hitR, C.strobeRed], [hitB, C.strobeBlue]].forEach(([i, col]) => { if (i >= 0) V.bar(g, gaps[i], col, s, i / n); });
  }

  // ======================= fences =======================
  // boards in perspective from F0 (far end) to F1 (near end); either direction
  function perspFence(F0, F1, o) {
    o = o || {}; const dir = F1.x > F0.x ? 1 : -1;
    const at = x => { const t = (x - F0.x) / (F1.x - F0.x); return { top: lerp(F0.top, F1.top, t), bot: lerp(F0.bot, F1.bot, t), t }; };
    const boards = []; let x = F0.x, i = 0;
    while (i < 90) {
      const a = at(x); const bw = (o.bw0 || 18) + (o.bw1 || 74) * a.t, gap = (o.gap0 || 3) + (o.gap1 || 9) * a.t;
      const xa = x, xb = x + dir * bw, xg = xb + dir * gap, A = at(xa), B = at(xb), G1 = at(xg), peak = (A.top + B.top) / 2 - 6 - 8 * A.t;
      const pts = dir > 0 ? [[xa, A.top + 2], [(xa + xb) / 2, peak], [xb, B.top + 2], [xb, B.bot], [xa, A.bot]]
        : [[xb, B.top + 2], [(xa + xb) / 2, peak], [xa, A.top + 2], [xa, A.bot], [xb, B.bot]];
      const q = dir > 0 ? [[xb + 0.5, B.top + 7], [xg - 0.5, G1.top + 7], [xg - 0.5, G1.bot], [xb + 0.5, B.bot]] : [[xg + 0.5, G1.top + 7], [xb - 0.5, B.top + 7], [xb - 0.5, B.bot], [xg + 0.5, G1.bot]];
      boards.push({ pts, q, gx: (xb + xg) / 2, gfoot: (B.bot + G1.bot) / 2, i, t: A.t });
      x = xg; i++;
      if (dir > 0 ? x > W + 60 : x < -60) break;
    }
    return { at, boards, dir };
  }
  function drawPerspFence(g, PF, o) {
    PF.boards.forEach(b => { g.fillStyle = o.gapCol; g.fill(polyP([[b.q[0][0] - 1, b.q[0][1] - 1], [b.q[1][0] + 1, b.q[1][1] - 1], [b.q[2][0] + 1, b.q[2][1]], [b.q[3][0] - 1, b.q[3][1]]])); });
    PF.boards.forEach(b => {
      const bp = S().poly(b.pts).path(1.1, 200 + b.i), band = b.t < 0.3 ? 0 : b.t < 0.62 ? 1 : 2;
      g.fillStyle = mix(C.ink, C.fireOuter, o.face[band]); g.fill(bp);
      O.silhouette(g, bp, { fill: 'rgba(0,0,0,0)', light: o.light, rimColor: mix(C.ink, C.fireMid, o.rim[band]), rimW: 2 + 2 * b.t });
    });
    const F0 = PF.at(PF.boards[0].pts[0][0]), xe = PF.dir > 0 ? W + 30 : -30, E = PF.at(xe), x0 = PF.boards[0].pts[PF.dir > 0 ? 0 : 2][0];
    g.fillStyle = C.ink; g.fill(S().poly([[x0 - 6 * PF.dir, F0.bot - 4], [xe, E.bot - 10], [xe, E.bot + 24], [x0 - 6 * PF.dir, F0.bot + 8]]).path(2, 9));
  }

  // ======================= grass =======================
  function sparseBlades(g, o) {   // F13's mid-ground blades
    const mg = S(), r = O.rng(o.seed || 'midblades');
    for (let i = 0; i < o.n; i++) {
      const y = o.y0 + Math.pow(r(), 1.6) * (o.y1 - o.y0), x = o.x0 + r() * (o.x1 - o.x0), k = (y - o.yh) / (H - o.yh);
      const h = (5 + r() * 9) * (0.6 + 2.2 * k) * (o.hk || 1), w = 1.2 + 2.2 * k, lean = (r() - 0.5) * 0.7;
      mg.poly([[x - w, y], [x + w, y], [x + lean * h, y - h]]);
    }
    g.save(); g.globalAlpha = o.alpha == null ? 0.8 : o.alpha; g.fillStyle = o.col || mix(C.ink, C.grass, 0.4); g.fill(mg.path(0.2, 6)); g.restore();
  }
  function edgeBlades(g, o) {     // F13's foreground strip: taller toward the frame edges
    const gr = S(), r2 = O.rng(o.seed || 'blades'), b = o.base || 1084;
    for (let x = -20; x < W + 20; x += 9 + r2() * 16) {
      const edge = Math.min(1, Math.abs(x - (o.cx || 1000)) / (o.span || 900)); const h = (14 + r2() * 26 + (o.tall || 90) * edge * edge * edge * r2()) * (o.k || 1);
      const lean = (r2() - 0.5) * 0.6; gr.poly([[x - 3 - h * 0.03, b], [x + 3 + h * 0.03, b], [x + lean * h + 1, b - h]]);
    }
    gr.rect(-20, b - 18, W + 40, 30); g.fillStyle = C.ink; g.fill(gr.path(0.6, 5));
  }
  function tufts(g, list, seed) {   // F02's tufts
    const blades = S(), rb = O.rng(seed || 'blades');
    list.forEach(([x0, x1, n, hmin, hmax]) => { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * rb(), h = hmin + (hmax - hmin) * rb(), lean = (rb() - 0.35) * 0.5, w = 3 + rb() * 4; blades.poly([[x - w, H + 4], [x + lean * h, H - h], [x + w, H + 4]]); } });
    g.fillStyle = C.ink; g.fill(blades.path(0.4, 3));
  }
  // curved blades over a ground plane, perspective by y (yh = horizon); 'clear' presses them down round a point
  function bladeField(g, o) {
    const R = O.rng(o.seed), P = new Path2D();
    for (let i = 0; i < o.n; i++) {
      const y = lerp(o.y0, o.y1, Math.pow(R(), o.pow || 1)), p = sat((y - o.yh) / (H - o.yh)), x = lerp(o.x0, o.x1, R());
      let h = lerp(o.h0, o.h1, Math.pow(p, 1.3)) * (0.55 + 0.9 * R()); const w = lerp(o.w0, o.w1, p) * (0.7 + 0.6 * R()), lean = (R() - 0.5) * 0.8 + (o.lean || 0);
      if (o.clear) { const d = Math.hypot((x - o.clear[0]) / o.clear[2], (y - o.clear[1]) / o.clear[3]); if (d < 1) h *= lerp(0.18, 1, d * d); }
      const tx = x + lean * h, ty = y - h;
      P.moveTo(x - w, y); P.quadraticCurveTo(x - w * 0.2 + lean * h * 0.35, y - h * 0.55, tx, ty); P.quadraticCurveTo(x + w * 0.5 + lean * h * 0.35, y - h * 0.5, x + w, y); P.closePath();
    }
    g.fillStyle = o.col; g.fill(P);
  }

  // ======================= THE HOUSE (model coordinates: F02's house before its push) =======================
  const HM = (() => {
    const G = 750, R = O.rng('yard-11'), rr = (a, b) => a + (b - a) * R();
    // the one-storey kitchen wing at the right holds the kitchen window AND the back door (four steps down to the lawn)
    const MAIN = [[950, 410], [1640, 410], [1640, G + 6], [950, G + 6]], ROOF = [[922, 416], [1062, 252], [1528, 252], [1668, 416]];
    const ANNEX = [[1636, 520], [1904, 569], [1904, 579], [1888, 579], [1888, G + 6], [1636, G + 6]];
    const shape = S().poly(MAIN).poly(ROOF)
      .poly([[1442, 262], [1442, 178], [1494, 178], [1494, 262]]).rect(1434, 168, 68, 15)
      .poly(ANNEX);
    const wins = [
      { x: 1004, y: 452, w: 106, h: 118, up: true }, { x: 1242, y: 452, w: 106, h: 118, up: true, curtain: true }, { x: 1480, y: 452, w: 106, h: 118, up: true },
      { x: 1040, y: 608, w: 160, h: 108, big: true }, { x: 1660, y: 606, w: 84, h: 84, kitchen: true }];
    // the back door (hinged left, swings in) and its four steps; 'backdoor' is exactly this at 2x (MB below)
    const door = { x: 1783, y: 584, w: 64, h: 116 };
    const steps = [0, 1, 2, 3].map(k => ({ k, y: 699 + 12.5 * k, x0: 1769 - 18 * k, x1: 1870 + 4 * k, h: 12.5 }));
    const dw = []; { const r = O.rng('bd-doorway'); dw.push([door.x - 3, door.y + door.h + 1]); for (let k = 0; k <= 8; k++) dw.push([door.x - 4 - r() * 4, door.y + door.h - k * door.h / 8 + (k === 8 ? -r() * 8 : 0)]);
      for (let k = 1; k < 8; k++) dw.push([door.x + k * door.w / 8, door.y - 3 - r() * 11]); for (let k = 8; k >= 0; k--) dw.push([door.x + door.w + 4 + r() * 4, door.y + door.h - k * door.h / 8]); dw.push([door.x + door.w + 3, door.y + door.h + 1]); }
    wins.forEach((wd, i) => {
      wd.i = i; wd.clip = S().rect(wd.x, wd.y, wd.w, wd.h).path(1.6, 30 + i);
      const tri = [];
      for (let k = 0; k < 8; k++) {
        const side = k % 4, u = R(); let a, b, c;
        if (side === 0) { a = [wd.x + u * wd.w, wd.y]; b = [a[0] + rr(10, 22), wd.y]; c = [a[0] + rr(0, 12), wd.y + rr(12, 26)]; }
        else if (side === 1) { a = [wd.x + wd.w, wd.y + u * wd.h]; b = [wd.x + wd.w, a[1] + rr(10, 20)]; c = [wd.x + wd.w - rr(10, 22), a[1] + rr(0, 10)]; }
        else if (side === 2) { a = [wd.x + u * wd.w, wd.y + wd.h]; b = [a[0] + rr(10, 20), wd.y + wd.h]; c = [a[0] + rr(0, 12), wd.y + wd.h - rr(10, 20)]; }
        else { a = [wd.x, wd.y + u * wd.h]; b = [wd.x, a[1] + rr(10, 22)]; c = [wd.x + rr(10, 22), a[1] + rr(0, 10)]; }
        tri.push({ side, pts: [a, b, c] });
      }
      const mull = [wd.x + wd.w / 2 - 3, wd.y, 6, wd.h * rr(0.3, 0.55)];
      wd.teeth = new Path2D(); wd.teethPost = new Path2D();
      tri.forEach(tr => { wd.teeth.addPath(polyP(tr.pts)); if (tr.side !== 0) wd.teethPost.addPath(polyP(tr.pts)); });
      wd.teeth.rect(mull[0], mull[1], mull[2], mull[3]);
      wd.mull = S().rect(mull[0], mull[1], mull[2], mull[3]);
      wd.upH = rr(70, 110);
      // the collapsed opening: the lintel gone, a ragged bite up into the wall; the wall that falls is cut into chunks
      const n = 8, top = [];
      for (let k = 0; k <= n; k++) { const u = k / n; top.push([wd.x - 10 + (wd.w + 20) * u, wd.y - 8 - rr(10, 40) * Math.pow(Math.sin(Math.PI * u), 0.6)]); }
      wd.bigTop = Math.min(...top.map(p => p[1]));
      wd.bigClip = S().poly([[wd.x - 6, wd.y + wd.h], [wd.x - 10, wd.y + 4]].concat(top, [[wd.x + wd.w + 10, wd.y + 4], [wd.x + wd.w + 6, wd.y + wd.h]])).path(1.4, 70 + i);
      wd.chunks = [];
      for (let k = 0; k < n; k += 2) {
        const a = top[k], m = top[k + 1], b = top[Math.min(n, k + 2)];
        const sh = S().poly([a, m, b, [b[0], wd.y + 3], [a[0], wd.y + 3]]);
        wd.chunks.push({ sh, path: sh.path(0.8, 80 + k), cx: (a[0] + b[0]) / 2, cy: (m[1] + wd.y) / 2, spin: (R() - 0.5) * 2.2, dl: rr(0, 0.14), dx: rr(-30, 30) });
      }
      wd.chunks.push({ sh: wd.mull, path: wd.mull.path(0.5, 9), cx: mull[0] + 3, cy: mull[1] + mull[3] / 2, spin: rr(-2, 2), dl: rr(0.05, 0.2), dx: 0 });
    });
    // glass from the big downstairs window: thrown out and down onto the lawn
    const big = wins[3], ox = big.x + big.w * 0.4, oy = big.y + big.h * 0.45, glass = [];
    for (let i = 0; i < 13; i++) {
      const side = R() < 0.6 ? -1 : 1, vx = side * (60 + 300 * R()), vy = -(60 + 320 * R()), land = G + 8 + 70 * R(), gg = 1500;
      const tl = (-vy + Math.sqrt(vy * vy + 2 * gg * (land - oy))) / gg;
      glass.push({ ox: ox + (R() - 0.5) * 60, oy: oy + (R() - 0.5) * 40, vx, vy, gg, land, tl, s: rr(7, 16), rot: rr(0, 6), spin: rr(-9, 9), hot: i % 3 === 0 });
    }
    const bite = S().poly([[1163, 251], [1204, 289], [1241, 271], [1278, 316], [1321, 286], [1361, 308], [1390, 268], [1408, 251]]);
    // the union outline of the house (no chimney), for clipping smoke to the sky behind it
    const outline = [[950, G + 6], [950, 416], [922, 416], [1062, 252], [1528, 252], [1668, 416], [1640, 416], [1640, 520.7], [1904, 569], [1904, 579], [1888, 579], [1888, G + 6]];
    return { G, shape, path: shape.path(1.0, 13), wins, glass, bite: bite.path(1.4, 4), MAIN, ROOF, ANNEX, outline,
      door, steps, doorwayPts: dw, doorway: S().poly(dw).path(0.7, 98),
      doorLands: [1500, 801.5],          // the blown door lies burning on the lawn here (model); 'backdoor' [700, 905]
      kitchen: [1790, 596] };            // the second blast erupts here: between the kitchen window and the doorway
  })();
  // 'backdoor' world = HM model x2 about the back door: BD = 2 * HM - [2300, 698] (the door lands on [1266, 470, 128 x 232])
  const MB = [2, 0, 0, 2, -2300, -698];

  function houseInk(g, m) { g.save(); g.transform(m[0], m[1], m[2], m[3], m[4], m[5]); g.fillStyle = C.ink; g.fill(HM.path); g.restore(); }

  function roofLive(g, em, t, k) {
    g.save(); g.translate(0, 251); g.scale(1, Math.max(0.05, k)); g.translate(0, -251); g.fillStyle = C.fireOuter; g.fill(HM.bite); g.restore();
    const f = flick(t, 7);
    [[1289, 300, 265, 225, 31], [1223, 289, 114, 138, 47], [1364, 289, 127, 154, 59]].forEach(([x, y, w, h, s], i) =>
      O.flame(g, x, 251 + (y - 251) * k, w * (0.6 + 0.4 * k), h * k * (0.82 + 0.32 * flick(t + i * 1.3, 11 + i)), s, t * 1.2 + i));
    em.fillStyle = C.fireMid; em.beginPath(); em.ellipse(1289, 220, 160 * k + 1, 110 * k + 1, 0, 0, 7); em.fill();
    void f;
  }
  function winFire(g, em, wd, t, k, clip, top, teeth, upK, upSeed) {
    const f = flick(t * 1.1 + wd.i * 2.3, wd.i);
    g.save(); g.clip(clip); g.fillStyle = C.fireOuter; g.fillRect(wd.x - 14, top - 14, wd.w + 28, wd.y + wd.h - top + 28);
    if (k > 0.03) {
      const hh = wd.y + wd.h - top;
      O.flame(g, wd.x + wd.w * 0.5, wd.y + wd.h + 8, wd.w * 1.3, hh * 1.08 * k * (0.9 + 0.2 * f), 11 + wd.i * 7, t * 1.25 + 0.3 + wd.i);
      O.flame(g, wd.x + wd.w * 0.25, wd.y + wd.h + 8, wd.w * 0.7, hh * 0.75 * k * (0.86 + 0.28 * f), 51 + wd.i * 5, t * 1.6 + 1.7 + wd.i);
    }
    g.restore();
    g.fillStyle = C.ink; g.fill(teeth);
    em.fillStyle = C.fireMid; em.fillRect(wd.x, top, wd.w, wd.y + wd.h - top);
    if (upK > 0.03) {
      const uh = wd.upH * upK * (0.72 + 0.45 * f);
      O.flame(g, wd.x + wd.w * 0.55, top + 6, wd.w * 0.9, uh, upSeed || 90 + wd.i * 13, t * 1.4 + 0.9 + wd.i);
      em.fillStyle = C.fireOuter; em.fillRect(wd.x, top - uh, wd.w, uh);
    }
  }
  function curtainLive(g, em, t, ph) {
    if (ph >= 0.999) return;
    const w = HM.wins[1], L = smooth(ph / 0.5), B = sat((ph - 0.5) / 0.5), N = 18, spine = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, wv = Math.sin(u * 7.5 - t * 3.4) * u;
      const hang = [w.x + 74 + Math.sin(u * 4 - t * 2.3) * 4 * u, w.y + 8 + 104 * u];
      const lift = [w.x + 24 + 112 * u + 13 * Math.sin(u * 7.5) + 9 * wv, w.y + 10 - 118 * u + 8 * Math.sin(u * 5) + 5 * wv];
      spine.push([lerp(hang[0], lift[0], L), lerp(hang[1], lift[1], L)]);
    }
    const keep = 1 - B; if (keep <= 0.03) return;
    const end = keep * N, ie = Math.floor(end), fe = end - ie, sp = spine.slice(0, ie + 1);
    if (ie < N && fe > 0.01) sp.push([lerp(spine[ie][0], spine[ie + 1][0], fe), lerp(spine[ie][1], spine[ie + 1][1], fe)]);
    if (sp.length < 2) return;
    const half = u => (34 * (1 - u) + 7 * u) * lerp(0.6, 1, L), left = [], right = [];
    sp.forEach((p, i) => {
      const q = sp[Math.min(i + 1, sp.length - 1)], o = sp[Math.max(i - 1, 0)]; let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const hw = half(i / N) * (1 + 0.18 * Math.sin(i * 1.9 + t * 2.2)); left.push([p[0] - dy * hw, p[1] + dx * hw]); right.push([p[0] + dy * hw, p[1] - dx * hw]);
    });
    const cp = S().poly(left.concat(right.slice().reverse())).path(1.2, 5);
    g.fillStyle = mix(C.fireCore, C.fireMid, 0.3); g.fill(cp);
    g.save(); g.clip(cp);
    const nf = Math.max(2, Math.round(sp.length * 0.82)); g.fillStyle = mix(C.fireCore, C.fireMid, 0.66);
    g.fill(S().poly(sp.slice(0, nf).concat(left.slice(0, nf).reverse())).path(1, 6));
    if (L > 0.3) {   // the burning end: scorched, then charred
      const k0 = Math.max(0, sp.length - 4), k1 = Math.max(0, sp.length - 2);
      g.fillStyle = C.fireOuter; g.fill(S().poly(left.slice(k0).concat(right.slice(k0).reverse())).path(1.4, 8));
      if (B > 0) { g.fillStyle = CHAR; g.fill(S().poly(left.slice(k1).concat(right.slice(k1).reverse())).path(1.6, 9)); }
    }
    g.restore();
    const tip = sp[sp.length - 1], fs = smooth((L - 0.2) / 0.5) * (B > 0 ? 1.45 : 1);
    if (fs > 0.05) O.flame(g, tip[0] + 2, tip[1] + 12 * fs, 24 * fs + 6, 36 * fs + 8, 311, t * 2.1);
    em.save(); em.globalAlpha = 0.45; em.fillStyle = C.fireMid; em.fill(cp); em.restore();
    if (B > 0) {   // ash flakes lifting off the burning end
      const r = O.rng('curtain-ash'), P = new Path2D(), Q = new Path2D();
      for (let i = 0; i < 12; i++) {
        const life = 1.2 + r(), u = frac(t / life + r()), x = tip[0] + (r() - 0.3) * 40 + 30 * u * u + Math.sin(t * 3 + i) * 6 * u, y = tip[1] - 150 * u * (0.6 + r() * 0.8), s = 2 + r() * 3.5, a = r() * 6 + t * 3;
        const T = i % 3 ? P : Q; T.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); T.lineTo(x + Math.cos(a + 2.2) * s * 0.7, y + Math.sin(a + 2.2) * s * 0.7); T.lineTo(x + Math.cos(a + 4) * s * 0.9, y + Math.sin(a + 4) * s * 0.9); T.closePath();
      }
      g.fillStyle = CHAR; g.fill(P); g.fillStyle = C.fireMid; g.fill(Q);
    }
  }
  function collapseLive(g, em, wd, t, tc) {
    const u = t - tc; if (u < -0.45 || u > 3.2) return;
    if (u < 0) {   // the creak: the lintel sags a few px into the fire before it goes
      const s = (u + 0.45) / 0.45 * 3.5;
      wd.chunks.forEach(ch => { g.save(); g.translate(0, s * (0.6 + ch.dl * 4)); g.fillStyle = C.ink; g.fill(ch.path); g.restore(); });
      return;
    }
    wd.chunks.forEach(ch => {
      const v = u - ch.dl; if (v > 0.6) return;
      if (v < 0) { g.fillStyle = C.ink; g.fill(ch.path); return; }
      const fall = 0.5 * 1150 * v * v, sc = 1 - 0.55 * sat(v / 0.55), rot = ch.spin * v;
      g.save(); g.translate(ch.cx + ch.dx * v, ch.cy + fall); g.rotate(rot); g.scale(sc, sc); g.translate(-ch.cx, -ch.cy);
      g.save(); g.translate(0, 3); g.fillStyle = C.fireMid; g.fill(ch.path); g.restore();
      g.fillStyle = C.ink; g.fill(ch.path); g.restore();
    });
    const k = Math.exp(-u * 2.2);
    em.save(); em.globalAlpha = 0.55 * k; em.fillStyle = C.fireMid; em.beginPath(); em.ellipse(wd.x + wd.w / 2, wd.y + wd.h * 0.3, wd.w * 0.7, wd.h * 0.8, 0, 0, 7); em.fill(); em.restore();
    sparkBurst(g, em, [wd.x + wd.w / 2, wd.y + wd.h * 0.4], u, { n: 46, v0: 120, v1: 520, a0: -Math.PI * 0.95, a1: -Math.PI * 0.05, life: 2.2, grav: 520, seed: 'collapse' + wd.i, lw: 2.2, floor: HM.G + 40 });
  }
  function glassLive(g, em, t, tg) {
    const u = t - tg; if (u < 0 || u > 3.5) return;
    const hot = new Path2D(), mid = new Path2D();
    HM.glass.forEach(s => {
      let x, y, rot, sq = 1;
      if (u < s.tl) { x = s.ox + s.vx * u; y = s.oy + s.vy * u + 0.5 * s.gg * u * u; rot = s.rot + s.spin * u; }
      else { if (u > s.tl + 1.4 + s.s * 0.05) return; x = s.ox + s.vx * s.tl; y = s.land; rot = s.rot + s.spin * s.tl; sq = 0.35; }
      const P = s.hot ? hot : mid, k = s.s;
      const pt = a => [x + Math.cos(rot + a) * k * (a ? 0.7 : 1), y + Math.sin(rot + a) * k * sq * (a ? 0.7 : 1)];
      const a = pt(0), b = pt(2.3), c = pt(4.1); P.moveTo(a[0], a[1]); P.lineTo(b[0], b[1]); P.lineTo(c[0], c[1]); P.closePath();
    });
    g.fillStyle = C.fireMid; g.fill(mid); g.fillStyle = C.fireCore; g.fill(hot);
    em.fillStyle = C.fireMid; em.fill(hot); em.fill(mid);
  }
  // ---- the back door (model space; every view, and 'backdoor' under MB) ----
  const DOOR_PANES = [[-21, -51], [1.5, -51], [-21, -24], [1.5, -24]];   // the door's four glass panes, local to its centre (56 x 118)
  // blown: the doorway is a ragged glowing hole, flames standing in it and licking out over the lintel
  function doorwayFire(g, em, t, k, big) {
    const d = HM.door, f = flick(t * 1.2, 30);
    g.save(); g.clip(HM.doorway); g.fillStyle = C.fireOuter; g.fillRect(d.x - 10, d.y - 20, d.w + 20, d.h + 30);
    O.flame(g, d.x + d.w * 0.5, d.y + d.h + 3, d.w * 1.4, d.h * k * (0.9 + 0.2 * f), 171, t * 1.3);
    O.flame(g, d.x + d.w * 0.3, d.y + d.h + 3, d.w * 0.8, d.h * 0.7 * k * (0.86 + 0.3 * f), 181, t * 1.7 + 1);
    g.restore();
    tongue(g, d.x + d.w * 0.5, d.y + 2, d.w * 0.95, (34 + 30 * f) * k * (big || 1), 0, 191, t * 1.4, FIRE3);
    em.fillStyle = C.fireMid; em.fillRect(d.x, d.y - 50 * k, d.w, d.h + 50 * k);
  }
  // not blown (only if a sequence asks): the shut door, fire behind its four panes
  function doorShut(g, em, t, k) {
    const d = HM.door, f = flick(t * 1.3, 31), cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    g.fillStyle = C.ink; g.fill(S().rect(d.x, d.y, d.w, d.h).path(0.5, 96));
    DOOR_PANES.forEach(([px, py], i) => { const r = S().rect(cx + px, cy + py, 19.5, 24); g.fillStyle = C.fireOuter; g.fill(r.path(0.4, 97 + i)); g.fillStyle = f > 0.5 ? C.fireCore : C.fireMid; g.fill(r.scale(0.6, 0.55, cx + px + 9.75, cy + py + 24).path(0.4, 101 + i)); });
    em.fillStyle = C.fireMid; em.fillRect(cx - 22, cy - 52, 44, 54 * k);
  }
  // the door through the air (u 0 = leaving the frame .. 1 = landed), then lying flat on the lawn, burning (model space)
  function doorFly(g, em, u, t, k) {
    const p0 = [1725, 483], p1 = [1590, 424], p2 = HM.doorLands, v = sat(u), uu = 1 - v;
    const x = uu * uu * p0[0] + 2 * uu * v * p1[0] + v * v * p2[0], y = uu * uu * p0[1] + 2 * uu * v * p1[1] + v * v * p2[1];
    const rot = lerp(-0.55, -1.6, outC(v)), sq = lerp(1, 0.26, smooth((v - 0.7) / 0.3));   // it tumbles, then lies flat: its length across the frame, foreshortened
    g.save(); g.translate(x, y); g.scale(1, sq); g.rotate(rot);
    const p = S().rect(-28, -59, 56, 118).path(0.5, 96); g.fillStyle = C.ink; g.fill(p);
    O.silhouette(g, p, { fill: 'rgba(0,0,0,0)', light: { dx: 0.4, dy: -1 }, rimColor: C.fireMid, rimW: 1.5 });
    g.fillStyle = mix(C.ink, C.fireOuter, 0.55); DOOR_PANES.forEach(([px, py], i) => g.fill(S().rect(px, py, 19.5, 24).path(0.4, 97 + i)));
    g.restore();
    if (v >= 1 && k > 0.02) {
      const kk = Math.max(0.45, k);
      tongue(g, x + 20, y - 3, 65, (25 + 12 * flick(t, 44)) * kk, 0, 211, t * 1.5, FIRE3); tongue(g, x - 25, y - 1, 35, (15 + 7 * flick(t + 1, 45)) * kk, -0.1, 213, t * 1.7, FIRE3);
      em.fillStyle = C.fireMid; em.fillRect(x - 40, y - 30, 90, 30);
    }
  }
  // the treads catch the doorway's fire on its own flicker
  function stepRims(g, t, k, blown) {
    if (k < 0.05) return; const f = flick(t * 1.2, 30); g.fillStyle = blown && f > 0.55 ? C.fireCore : blown ? C.fireMid : C.fireOuter;
    HM.steps.forEach(s => g.fillRect(s.x0 + 5, s.y, s.x1 - s.x0 - 10, 1.5));
  }
  // every live part of the house in one call (under its model transform)
  function houseLive(g, em, V, t, st) {
    const m = V.m, fire = st.fire; if (fire <= 0.02) return;
    g.save(); g.transform(m[0], m[1], m[2], m[3], m[4], m[5]); em.save(); em.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    const tc = st.windowCollapse, cw = st.collapseWin == null ? 2 : st.collapseWin, tg = st.glassBreak, cur = st.curtain;
    if (st.roof > 0.02) roofLive(g, em, t, st.roof * Math.min(1, fire * 1.2));
    if (!V.noDoor) { if (st.blown !== false) doorwayFire(g, em, t, fire); else doorShut(g, em, t, fire); stepRims(g, t, fire, st.blown !== false); }
    HM.wins.forEach(wd => {
      if (V.skipWin && V.skipWin.indexOf(wd.i) >= 0) return;
      let k = fire, clip = wd.clip, teeth = wd.teeth, top = wd.y, upK = wd.up ? fire : 0;
      if (wd.curtain) upK *= smooth((cur - 0.7) / 0.3);
      if (wd.kitchen && V.kitchenUp) upK = fire * 0.75;
      if (tc != null && wd.i === cw && t >= tc) { const fl = 1 + 0.8 * Math.exp(-(t - tc) * 1.5); clip = wd.bigClip; teeth = wd.teethPost; top = wd.bigTop; k *= fl; upK = Math.max(upK, fire) * fl * 1.25; }
      if (tg != null && wd.big && t >= tg) k *= 1 + 0.6 * Math.exp(-(t - tg) * 2.5);
      winFire(g, em, wd, t, k, clip, top, teeth, upK);
    });
    curtainLive(g, em, t, cur);
    if (tc != null) collapseLive(g, em, HM.wins[cw], t, tc);
    if (tg != null) glassLive(g, em, t, tg);
    g.restore(); em.restore();
  }
  // the second explosion: out of the kitchen, a flare, a fountain of sparks into the night
  function secondBlastLive(g, em, p, t, ts, sc, floor) {
    const u = t - ts; if (u < 0 || u > 4.5) return; sc = sc || 1;
    const k = Math.exp(-u * 1.5);
    if (u < 2.6) {
      tongue(g, p[0], p[1], 220 * sc * (0.5 + 0.5 * k), (80 + 460 * k) * sc, 0, 501, t * 2.2, FIRE3);
      tongue(g, p[0] - 60 * sc, p[1] + 10 * sc, 140 * sc * (0.5 + 0.5 * k), (40 + 260 * k) * sc, -0.6, 517, t * 2.4, FIRE3);
      tongue(g, p[0] + 60 * sc, p[1] + 10 * sc, 140 * sc * (0.5 + 0.5 * k), (40 + 240 * k) * sc, 0.55, 533, t * 2.3, FIRE3);
    }
    em.save(); em.globalAlpha = 0.6 * k; em.fillStyle = C.fireMid; em.beginPath(); em.ellipse(p[0], p[1] - 120 * sc, 150 * sc, 170 * sc, 0, 0, 7); em.fill(); em.restore();
    sparkBurst(g, em, [p[0], p[1] - 40 * sc], u, { n: 220, v0: 300 * sc, v1: 1300 * sc, a0: -Math.PI * 0.74, a1: -Math.PI * 0.26, life: 4.2, grav: 260 * sc, seed: 'second', lw: 2.4, floor });
  }

  // ======================= VIEWS =======================
  const DEF = { fire: 1, curtain: null, roof: 0, strobe: 0, glassBreak: null, windowCollapse: null, collapseWin: 2, blast: 0, secondBlast: null, doorOpen: 0, kitchenFlare: 0, blown: true, handGlow: 0, dim: 0 };
  const V = {};

  // ---------------- 'scott': F02, the medium on Scott (background only) ----------------
  V.scott = (() => {
    const HG = 750, m = [0.88, 0, 0, 0.88, 1370 - 1300 * 0.88, HG - HG * 0.88];
    const FR = O.rng('yard-f02-fence'), FTOP = 610, FB = HG + 4, BW = 50, BG = 11, boards = [];
    for (let i = 0, x = -14; x < 960; i++, x += BW + BG) boards.push({ x, top: FTOP + (FR() * 10 - 5), i });
    const gaps = boards.map(b => ({ q: [[b.x + BW + 0.5, b.top + 9], [b.x + BW + BG - 0.5, b.top + 9], [b.x + BW + BG - 0.5, FB], [b.x + BW + 0.5, FB]], x: b.x + BW + BG / 2 }));
    const toH = p => apM(m, p);
    const v = {
      m, ground: HG, gaps, gapBase: inkC(0.5),
      bg(g) {
        g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 58, 14, 1);
        const far = mix(C.ink, NIGHT, 0.45), sh = S();
        const roofs = [[-30, 150, 560, 52], [120, 300, 536, 0], [300, 470, 548, 70], [470, 640, 566, 0], [640, 820, 552, 56], [820, 1060, 574, 0]];
        roofs.forEach(([x0, x1, top, peak]) => { if (peak) sh.poly([[x0, 640], [x0, top + 20], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 20], [x1, 640]]); else sh.poly([[x0, 640], [x0 + 18, top], [x1 - 18, top], [x1, 640]]); });
        [[190, 520, 18, 34], [420, 548, 14, 30], [930, 556, 16, 28]].forEach(([x, y, w, h]) => sh.rect(x, y - h, w, h + 30));
        const poplar = (x, top, w) => sh.add(O.fig.smooth([[x, top], [x + w * 0.5, top + 90], [x + w * 0.55, top + 200], [x + w * 0.3, 640], [x - w * 0.3, 640], [x - w * 0.55, top + 200], [x - w * 0.5, top + 90]], true));
        poplar(96, 400, 92); poplar(296, 462, 60);
        O.silhouette(g, sh.path(1.8, 66), { fill: far, light: { dx: 1, dy: -0.25 }, rimColor: glowC(0.2), rimW: 2.5 });
      },
      mid(g) {
        boards.forEach(b => {
          const x = b.x, top = b.top, dist = Math.abs(1300 - (x + BW / 2)), near = dist < 520 ? 2 : dist < 860 ? 1 : 0;
          const p = S().poly([[x, top + 6], [x + BW * 0.5, top - 3], [x + BW, top + 6], [x + BW, FB], [x, FB]]).path(1.1, 200 + b.i);
          g.fillStyle = [glowC(0.12), glowC(0.24), glowC(0.4)][near]; g.fill(p);
          if (near) O.silhouette(g, p, { fill: 'rgba(0,0,0,0)', light: { dx: 1, dy: -0.1 }, rimColor: near === 2 ? mix(C.fireOuter, C.fireMid, 0.5) : C.fireOuter, rimW: 3 });
        });
        g.fillStyle = C.ink; g.fill(S().poly([[-20, HG - 4], [980, HG - 6], [980, HG + 16], [-20, HG + 14]]).path(2, 9));
        houseInk(g, m);
        g.fillStyle = C.grass; g.fillRect(0, HG + 8, W, H - HG);
        g.save(); g.beginPath(); g.rect(0, HG + 8, W, H - HG); g.clip();
        bandsOf(g, [{ shape: S().ellipse(1200, HG, 1900, 420, 0), col: lawnC(0.09), rough: 2.5 }, { shape: S().ellipse(900, HG + 6, 1250, 300, 0.02), col: lawnC(0.22), rough: 2.5 }], 50);
        g.restore();
      },
      lawnLive(g, em, t, st) {
        const f = flickA(t, 1), k = st.fire;
        g.save(); g.beginPath(); g.rect(-200, HG + 8, W + 400, H); g.clip();
        const r = 620 * (0.9 + 0.14 * f) * (0.55 + 0.45 * k), p = S().ellipse(1370, HG, r, 64 * (0.85 + 0.3 * f), 0).path(2, 52);
        g.fillStyle = lawnC(0.4); g.fill(p); g.strokeStyle = O.ditherPattern(g, lawnC(0.22)); g.lineWidth = 5; g.stroke(p);
        [[HM.wins[3], 1.0, 3], [HM.wins[4], 0.7, 4]].concat(st.blown !== false ? [[HM.door, 1.15, 5]] : []).forEach(([w, kk, i]) => {
          const a = toH([w.x, HG])[0], b = toH([w.x + w.w, HG])[0], mm = (a + b) / 2, spn = (b - a) * 0.5, fi = flick(t * 1.1 + i * 2.3, i);
          let fl = k * (0.86 + 0.3 * fi); if (i === 3 && st.glassBreak != null && t >= st.glassBreak) fl *= 1 + 0.5 * Math.exp(-(t - st.glassBreak) * 2.5);
          const L1 = 84 * kk * fl, L2 = 40 * kk * fl;
          g.fillStyle = lawnC(0.34); g.fill(S().poly([[a - 4, HG + 8], [b + 4, HG + 8], [b + spn * 0.5, HG + L1], [a - spn * 0.8, HG + L1]]).path(2, 91));
          g.fillStyle = lawnC(0.5); g.fill(S().poly([[a + 6, HG + 8], [b - 6, HG + 8], [b + spn * 0.12, HG + L2], [a - spn * 0.3, HG + L2]]).path(1.5, 92));
          g.fillStyle = lawnC(0.16); g.fill(S().poly([[mm - 3, HG + 8], [mm + 3, HG + 8], [mm - 6 * kk, HG + L1], [mm - 16 * kk, HG + L1]]).path(0.8, 93));
        });
        g.restore();
        g.fillStyle = C.ink; g.fill(v.footing || (v.footing = S().rect(1370 - 0.5 * 0.88 * 950, HG - 2, 0.88 * 960, 15).path(1.5, 3)));
      },
      bar(g, gap, col, s, u) { strobeBar(g, gap.x, FB - 2, col, Math.PI / 2 - 0.5 + 0.9 * u, 3, 70, 0.12 * s, 330); },
      front: { y0: H - 230, h: 230, draw(g) { g.translate(0, -(H - 230)); tufts(g, [[0, 210, 26, 20, 70], [1150, 1520, 34, 14, 50], [1520, 1920, 70, 40, 150], [1700, 1920, 30, 90, 210], [560, 760, 10, 10, 30]], 'blades'); } },
      smoke: smokeSys({ n: 92, T: 44, seed: 'f02smoke', path: u => [1330 + 260 * u + 420 * u * u, 330 - 640 * u + 20 * Math.sin(u * 8)], r: u => 80 + 200 * u, spread: u => 1.4 - 0.8 * u,
        level: (x, y) => y > 230 ? 2 : y > 170 ? 1 + (y - 170) / 60 : y > 70 ? 1 : y > 10 ? (y - 10) / 60 : 0,
        levels: [{ body: mix(NIGHT, C.ink, 0.45), belly: mix(NIGHT, C.fireOuter, 0.08) }, { body: mix(NIGHT, C.fireOuter, 0.1), belly: mix(NIGHT, C.fireOuter, 0.2) }, { body: mix(NIGHT, C.fireOuter, 0.2), belly: mix(NIGHT, C.fireOuter, 0.36) }] }),
      embers: [emberSys({ x: 1060, y: 330, w: 700, h: 300, n: 120, rise: 640, life: 5, drift: 180, seed: 'f02e1' }), emberSys({ x: 1160, y: 260, w: 560, h: 200, n: 36, rise: 520, life: 4, drift: 140, seed: 'f02e2', hot: 1 }),
        emberSys({ x: 900, y: 420, w: 200, h: 160, n: 10, rise: 300, life: 5, drift: -220, seed: 'f02e3' })],
      kitchen: toH(HM.kitchen), light: { x: 1300, y: 470, dx: 0.84, dy: -0.55 }, def: { curtain: 0.45 },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, push: { x: 900, y: 560, zoom: 1.06 } },
      anchors: { ground: HG, lawnFront: 1059, seat: { hip: [720, 978], scale: 180, facing: -1, ground: 1059 }, fire: [1300, 470], house: toH([1295, 410]), bigWindow: toH([1120, 662]), curtainWindow: toH([1295, 511]), door: toH([1815, 642]), doorLands: toH(HM.doorLands) },
    };
    return v;
  })();

  // ---------------- 'ending': F13, behind Scott's left shoulder ----------------
  V.ending = (() => {
    const HZ = 640, s = 0.755, m = [s, 0, 0, s, -60 - 950 * s, HZ - 750 * s];
    const PF = perspFence({ x: 1150, top: 566, bot: 652 }, { x: 2000, top: 372, bot: 870 });
    const smoke = mix(C.ink, NIGHT, 0.36), SC = 136, HX = 660, HY = 930;
    const v = {
      m, ground: HZ, kitchenUp: true, gaps: PF.boards.map(b => ({ q: b.q, x: b.gx, y: b.gfoot })), gapBase: mix(C.ink, NIGHT, 0.8),
      bg(g) {
        g.fillStyle = NIGHT; g.fillRect(0, 0, W, H);
        O.lightPool(g, 250, 600, [{ r: 1180, color: glowC(0.17) }, { r: 780, color: glowC(0.36) }], { sy: 0.5, rough: 4, seed: 8 });
        g.fillStyle = smoke; g.fill(S().poly([[700, -40], [W + 40, -40], [W + 40, 170], [700, 100]]).path(3, 77));
      },
      glow: { x: 250, y: 600, r: 430, sy: 0.5, col: mix(C.fireOuter, C.fireMid, 0.08), under: glowC(0.36), seed: 10 },
      mid(g) {
        houseInk(g, m);
        g.fillStyle = C.grass; g.fillRect(0, HZ, W, H - HZ);
        g.save(); g.beginPath(); g.rect(0, HZ, W, H - HZ); g.clip();
        O.lightPool(g, 240, HZ + 4, [{ r: 1180, color: lawnC(0.16) }, { r: 760, color: lawnC(0.3) }], { sy: 0.26, rough: 2, seed: 12 });
        g.restore();
        g.fillStyle = C.ink; g.fill(S().rect(-20, HZ - 4, 690, 12).path(1.5, 3));
        const bf = S(); for (let x = 660, i = 0; x < 1160; x += 19, i++) bf.poly([[x, 618 + (i % 2)], [x + 7.5, 612], [x + 15, 618 + (i % 2)], [x + 15, 652], [x, 652]]);
        bf.rect(660, 628, 500, 5); g.fillStyle = mix(C.ink, C.fireOuter, 0.2); g.fill(bf.path(0.6, 41));
        drawPerspFence(g, PF, { gapCol: mix(C.ink, NIGHT, 0.8), face: [0.22, 0.12, 0.05], rim: [0.55, 0.36, 0.2], light: { dx: -1, dy: -0.2 } });
      },
      lawnLive(g, em, t, st) {
        const f = flickA(t, 2);
        g.save(); g.beginPath(); g.rect(-200, HZ + 4, W + 400, H); g.clip();
        const r = 420 * (0.9 + 0.14 * f) * (0.6 + 0.4 * st.fire), p = S().ellipse(240, HZ + 4, r, r * 0.26, 0).path(2, 14);
        g.fillStyle = mix(C.grass, C.fireMid, 0.36); g.fill(p); g.strokeStyle = O.ditherPattern(g, lawnC(0.3)); g.lineWidth = 5; g.stroke(p);
        if (st.handGlow > 0.01) {
          const k = smooth(st.handGlow), b = 0.94 + 0.08 * flick(t * 0.7, 5), P = v.anchors.handPool;
          O.lightPool(g, P[0], P[1], [{ r: 250 * k * b, color: mix(C.grass, C.fireOuter, 0.2) }, { r: 140 * k * b, color: mix(C.grass, C.fireOuter, 0.36) }], { sy: 0.28, rough: 3, seed: 21 });
        }
        g.restore();
      },
      bar(g, gap, col, s, u) { strobeBar(g, gap.x, gap.y - 2, col, Math.PI - 0.45 - 0.6 * u, 4 + 3 * u, 130 + 20 * u, 0.2 * s, 900 - 200 * u); },
      blades: { y0: 600, h: 480, draw(g) { g.translate(0, -600); sparseBlades(g, { n: 300, x0: 760, x1: 1960, y0: 690, y1: 1070, yh: 640, seed: 'midblades' }); } },
      front: { y0: 930, h: 150, draw(g) { g.translate(0, -930); edgeBlades(g, { seed: 'blades', cx: 1000, span: 900, tall: 90 }); } },
      smoke: smokeSys({ n: 22, T: 18, seed: 'f13live', offY: 0.3, born: 0.15, fade: 0.6,
        path: u => [196 + 560 * u, 280 - 110 * u - 70 * Math.sin(Math.PI * u)], r: u => 40 + 140 * u, spread: () => 0.7,
        level: (x, y) => { const d2 = Math.hypot((x - 240) / 420, (y - 420) / 300); return d2 < 0.85 ? 2 : d2 < 1.15 ? 2 - (d2 - 0.85) / 0.3 : 1; },
        dir: { dx: -0.42, dy: 0.9 },
        levels: [{ body: smoke, belly: smoke }, { body: smoke, belly: mix(smoke, C.fireOuter, 0.3), rimK: 0.22 }, { body: smoke, belly: mix(smoke, C.fireOuter, 0.62), rimK: 0.22 }],
        bank(g) {   // F13's plume: one heavy bank leaning right on the heat; only its belly near the fire is lit
          const R = O.rng('f13-two'), rr = (a, b) => a + (b - a) * R(), plume = S();
          for (let i = 0; i <= 36; i++) { const t = i / 36, x = 250 + 1780 * t, y = 210 - 190 * t + 34 * Math.sin(t * 9), r = 90 + 250 * t; for (let k = 0; k < 3; k++) plume.circle(x + rr(-0.5, 0.5) * r, y + rr(-0.3, 0.3) * r, r * rr(0.55, 0.8)); }
          plume.poly([[700, -40], [W + 40, -40], [W + 40, 200], [700, 120]]);
          const pp = plume.path(3, 77); g.fillStyle = smoke; g.fill(pp);
          const rimIn = (col, dx, dy, ex, ey, rx, ry) => { const tc = O.makeCanvas(W, H).getContext('2d'); tc.fillStyle = col; tc.fill(pp); tc.globalCompositeOperation = 'destination-out'; tc.translate(dx, dy); tc.fill(pp); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'destination-in'; tc.beginPath(); tc.ellipse(ex, ey, rx, ry, 0, 0, 7); tc.fill(); g.drawImage(tc.canvas, 0, 0); };
          rimIn(mix(smoke, C.fireOuter, 0.3), 14, -30, 260, 420, 980, 560); rimIn(mix(smoke, C.fireOuter, 0.62), 5, -10, 240, 420, 420, 300);
        } }),
      embers: [emberSys({ x: 0, y: 260, w: 640, h: 300, n: 100, rise: 560, life: 5, drift: 200, seed: 'f13e1' }), emberSys({ x: 120, y: 200, w: 520, h: 200, n: 34, rise: 480, life: 4, drift: 160, seed: 'f13e2', hot: 1 })],
      kitchen: apM(m, HM.kitchen), light: { x: 250, y: 420, dx: -1, dy: -0.35 }, def: { curtain: 1, roof: 1 },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, push: { x: 900, y: 600, zoom: 1.06 } },
      anchors: { ground: HZ, seat: { hip: [HX, HY - 0.3 * SC], scale: SC, facing: -1, ground: HY + 0.2 * SC },
        scott: { hx: HX, hy: HY, scale: SC },   // (older name for the same seat)
        clasp: [HX + 2.66 * SC, HY - 0.3 * SC], handLen: 1.06 * SC, handPool: [HX + 2.9 * SC, HY - 0.25 * SC],
        // the person-sized place at his RIGHT: screen-right of him on the lawn, by the strobe bars (point = its centre on the grass)
        gapRight: { x: 1040, y: 860, rect: [890, 600, 300, 360] }, fire: [250, 420], house: apM(m, [1295, 410]), door: apM(m, [1815, 642]), doorLands: apM(m, HM.doorLands) },
    };
    return v;
  })();

  // ---------------- 'house': wide on the burning house (cold-open tile) ----------------
  V.house = (() => {
    const s = 1.08, GND = 790, m = [s, 0, 0, s, 820 - 1295 * s, GND - 750 * s];
    const PF = perspFence({ x: 1446, top: 712, bot: GND + 4 }, { x: 2000, top: 470, bot: 1000 }, { bw0: 16, bw1: 70 });
    const toH = p => apM(m, p);
    const v = {
      m, ground: GND, gaps: PF.boards.map(b => ({ q: b.q, x: b.gx, y: b.gfoot })), gapBase: mix(C.ink, NIGHT, 0.8),
      bg(g) {
        g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 50, 12, 2);
        O.lightPool(g, 800, 640, [{ r: 1020, color: glowC(0.13) }], { sy: 0.42, rough: 7, seed: 18 });   // the heat low on the horizon, not a disc round the house
        const far = mix(C.ink, NIGHT, 0.45), L = S(), R = S();
        [[-30, 140, 700, 40], [120, 300, 722, 0], [280, 470, 706, 50]].forEach(([x0, x1, top, peak]) => { if (peak) L.poly([[x0, 800], [x0, top + 18], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 18], [x1, 800]]); else L.poly([[x0, 800], [x0 + 16, top], [x1 - 16, top], [x1, 800]]); });
        L.rect(178, 672, 16, 60); L.add(O.fig.smooth([[70, 560], [112, 640], [118, 720], [96, 800], [44, 800], [22, 720], [28, 640]], true));
        [[1440, 1640, 690, 46], [1620, 1800, 712, 0], [1780, 1960, 696, 40]].forEach(([x0, x1, top, peak]) => { if (peak) R.poly([[x0, 800], [x0, top + 18], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 18], [x1, 800]]); else R.poly([[x0, 800], [x0 + 16, top], [x1 - 16, top], [x1, 800]]); });
        R.rect(1700, 664, 15, 56);
        O.silhouette(g, L.path(1.8, 61), { fill: far, light: { dx: 1, dy: -0.25 }, rimColor: glowC(0.22), rimW: 2.5 });
        O.silhouette(g, R.path(1.8, 62), { fill: far, light: { dx: -1, dy: -0.25 }, rimColor: glowC(0.22), rimW: 2.5 });
      },
      glow: { x: 800, y: 470, r: 400, sy: 0.6, col: glowC(0.3), under: glowC(0.13), seed: 19 },
      mid(g) {
        const bf = S(); for (let x = -10, i = 0; x < 450; x += 23, i++) bf.poly([[x, 742 + (i % 2)], [x + 9, 735], [x + 18, 742 + (i % 2)], [x + 18, GND + 2], [x, GND + 2]]);
        bf.rect(-10, 756, 470, 5); g.fillStyle = mix(C.ink, C.fireOuter, 0.16); g.fill(bf.path(0.6, 42));
        houseInk(g, m);
        g.fillStyle = C.grass; g.fillRect(0, GND + 6, W, H - GND);
        g.save(); g.beginPath(); g.rect(0, GND + 6, W, H - GND); g.clip();
        bandsOf(g, [{ shape: S().ellipse(820, GND, 1500, 330, 0), col: lawnC(0.1), rough: 2.5 }, { shape: S().ellipse(820, GND + 4, 960, 190, 0.01), col: lawnC(0.22), rough: 2.5 }], 60);
        g.restore();
        drawPerspFence(g, PF, { gapCol: mix(C.ink, NIGHT, 0.8), face: [0.24, 0.13, 0.06], rim: [0.55, 0.36, 0.2], light: { dx: -1, dy: -0.2 } });
      },
      lawnLive(g, em, t, st) {
        const f = flickA(t, 1), k = st.fire;
        g.save(); g.beginPath(); g.rect(-200, GND + 6, W + 400, H); g.clip();
        const r = 600 * (0.9 + 0.14 * f) * (0.55 + 0.45 * k), p = S().ellipse(840, GND, r, 70 * (0.85 + 0.3 * f), 0).path(2, 52);
        g.fillStyle = lawnC(0.4); g.fill(p); g.strokeStyle = O.ditherPattern(g, lawnC(0.22)); g.lineWidth = 5; g.stroke(p);
        [[HM.wins[3], 1.0, 3], [HM.wins[4], 0.7, 4]].concat(st.blown !== false ? [[HM.door, 1.15, 5]] : []).forEach(([w, kk, i]) => {
          const a = toH([w.x, 750])[0], b = toH([w.x + w.w, 750])[0], mm = (a + b) / 2, spn = (b - a) * 0.5, fi = flick(t * 1.1 + i * 2.3, i);
          let fl = k * (0.86 + 0.3 * fi); if (i === 3 && st.glassBreak != null && t >= st.glassBreak) fl *= 1 + 0.5 * Math.exp(-(t - st.glassBreak) * 2.5);
          const L1 = 96 * kk * fl, L2 = 46 * kk * fl, G = GND + 6;
          g.fillStyle = lawnC(0.34); g.fill(S().poly([[a - 4, G], [b + 4, G], [b + spn * 0.5, G + L1], [a - spn * 0.8, G + L1]]).path(2, 91));
          g.fillStyle = lawnC(0.5); g.fill(S().poly([[a + 6, G], [b - 6, G], [b + spn * 0.12, G + L2], [a - spn * 0.3, G + L2]]).path(1.5, 92));
          g.fillStyle = lawnC(0.16); g.fill(S().poly([[mm - 3, G], [mm + 3, G], [mm - 6 * kk, G + L1], [mm - 16 * kk, G + L1]]).path(0.8, 93));
        });
        g.restore();
        g.fillStyle = C.ink; g.fill(v.footing || (v.footing = S().rect(toH([950, 0])[0] - 8, GND - 3, s * 920, 14).path(1.5, 3)));
      },
      bar(g, gap, col, s2, u) { strobeBar(g, gap.x, gap.y - 2, col, Math.PI - 0.35 - 0.7 * u, 3 + 3 * u, 110 + 30 * u, 0.18 * s2, 760 - 160 * u); },
      blades: { y0: 780, h: 300, draw(g) { g.translate(0, -780); sparseBlades(g, { n: 260, x0: -20, x1: 1940, y0: 820, y1: 1070, yh: 790, seed: 'hblades' }); } },
      front: { y0: 900, h: 180, draw(g) { g.translate(0, -900); edgeBlades(g, { seed: 'hfront', cx: 900, span: 1000, tall: 110 }); } },
      smoke: smokeSys({ n: 70, T: 46, seed: 'hsmoke', path: u => [880 + 300 * u + 640 * u * u, 290 - 700 * u + 18 * Math.sin(u * 8)], r: u => 70 + 230 * u, spread: u => 1.3 - 0.7 * u, fade: 0.55,
        level: (x, y) => y > 230 ? 2 : y > 170 ? 1 + (y - 170) / 60 : 1,
        levels: [{ body: SMOKE_INK, belly: SMOKE_INK }, { body: SMOKE_INK, belly: mix(SMOKE_INK, C.fireOuter, 0.3), rimK: 0.22 }, { body: SMOKE_INK, belly: mix(SMOKE_INK, C.fireOuter, 0.6), rimK: 0.24 }],
        dir: { dx: -0.3, dy: 0.95 },
        bank(g) {   // the bank the column feeds: leaning right on the wind, it takes the top of the sky (and breaks the glow's outline)
          smokeBank(g, { seed: 'house-bank', n: 30, col: SMOKE_INK, path: t => [960 + 1180 * t, 150 - 230 * t + 30 * Math.sin(t * 8)], r: t => 80 + 240 * t,
            slab: [[1060, -40], [W + 40, -40], [W + 40, 250], [1500, 110], [1150, 40]],
            rims: [[mix(SMOKE_INK, C.fireOuter, 0.28), 14, -30, 860, 430, 820, 470], [mix(SMOKE_INK, C.fireOuter, 0.58), 5, -10, 860, 430, 380, 280]] });
        } }),
      embers: [emberSys({ x: 480, y: 300, w: 760, h: 300, n: 120, rise: 700, life: 5, drift: 200, seed: 'he1' }), emberSys({ x: 600, y: 230, w: 540, h: 200, n: 36, rise: 560, life: 4, drift: 160, seed: 'he2', hot: 1 })],
      kitchen: toH(HM.kitchen), light: { x: 820, y: 470, dx: -1, dy: -0.3 }, def: { curtain: 0.45 },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, push: { x: 840, y: 500, zoom: 1.08 }, curtain: { x: 900, y: 430, zoom: 1.18 } },
      anchors: { ground: GND, seat: { hip: [1250, 958], scale: 64, facing: -1, ground: 975 }, fire: [820, 470], house: toH([1295, 410]), curtainWindow: toH([1295, 511]), bigWindow: toH([1120, 662]),
        windows: HM.wins.map(w => toH([w.x + w.w / 2, w.y + w.h / 2])), door: toH([1815, 642]), doorLands: toH(HM.doorLands), fenceFoot: x => PF.at(x).bot },
    };
    return v;
  })();

  // ---------------- 'fence': the far fence, the house burning across the lawn ----------------
  V.fence = (() => {
    const s = 0.95, GND = 690, m = [s, 0, 0, s, 1265 - 1295 * s, GND - 750 * s];
    const PF = perspFence({ x: 640, top: 604, bot: GND + 4 }, { x: -90, top: 140, bot: 1100 }, { bw0: 16, bw1: 84, gap1: 11 });
    const toH = p => apM(m, p);
    const v = {
      m, ground: GND, gaps: PF.boards.map(b => ({ q: b.q, x: b.gx, y: b.gfoot })), gapBase: mix(C.ink, NIGHT, 0.75),
      bg(g) {
        g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 44, 12, 5);
        O.lightPool(g, 1240, 590, [{ r: 1080, color: glowC(0.13) }], { sy: 0.42, rough: 7, seed: 28 });
        const far = mix(C.ink, NIGHT, 0.45), L = S();
        [[520, 700, 600, 44], [680, 900, 622, 0]].forEach(([x0, x1, top, peak]) => { if (peak) L.poly([[x0, 700], [x0, top + 18], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 18], [x1, 700]]); else L.poly([[x0, 700], [x0 + 16, top], [x1 - 16, top], [x1, 700]]); });
        L.add(O.fig.smooth([[1850, 380], [1900, 470], [1912, 580], [1890, 700], [1810, 700], [1790, 580], [1800, 470]], true));
        O.silhouette(g, L.path(1.8, 63), { fill: far, light: { dx: 1, dy: -0.25 }, rimColor: glowC(0.22), rimW: 2.5 });
        O.silhouette(g, S().add(O.fig.smooth([[1850, 380], [1900, 470], [1912, 580], [1890, 700], [1810, 700], [1790, 580], [1800, 470]], true)).path(1.8, 64), { fill: far, light: { dx: -1, dy: -0.25 }, rimColor: glowC(0.22), rimW: 2.5 });
      },
      glow: { x: 1250, y: 420, r: 420, sy: 0.62, col: glowC(0.3), under: glowC(0.13), seed: 29 },
      mid(g) {
        houseInk(g, m);
        g.fillStyle = C.grass; g.fillRect(0, GND + 6, W, H - GND);
        g.save(); g.beginPath(); g.rect(0, GND + 6, W, H - GND); g.clip();
        bandsOf(g, [{ shape: S().ellipse(1265, GND, 1800, 420, 0), col: lawnC(0.09), rough: 2.5 }, { shape: S().ellipse(1240, GND + 4, 1050, 220, 0.01), col: lawnC(0.2), rough: 2.5 }], 70);
        g.restore();
        drawPerspFence(g, PF, { gapCol: mix(C.ink, NIGHT, 0.75), face: [0.36, 0.26, 0.14], rim: [0.7, 0.5, 0.36], light: { dx: 1, dy: -0.3 } });
      },
      lawnLive(g, em, t, st) {
        const f = flickA(t, 4), k = st.fire;
        g.save(); g.beginPath(); g.rect(-200, GND + 6, W + 400, H); g.clip();
        const r = 620 * (0.9 + 0.14 * f) * (0.55 + 0.45 * k), p = S().ellipse(1265, GND, r, 74 * (0.85 + 0.3 * f), 0).path(2, 53);
        g.fillStyle = lawnC(0.38); g.fill(p); g.strokeStyle = O.ditherPattern(g, lawnC(0.2)); g.lineWidth = 5; g.stroke(p);
        [[HM.wins[3], 1.0, 3], [HM.wins[4], 0.7, 4]].concat(st.blown !== false ? [[HM.door, 1.15, 5]] : []).forEach(([w, kk, i]) => {
          const a = toH([w.x, 750])[0], b = toH([w.x + w.w, 750])[0], spn = (b - a) * 0.5, fl = k * (0.86 + 0.3 * flick(t * 1.1 + i * 2.3, i)), G = GND + 6, L1 = 84 * kk * fl, L2 = 40 * kk * fl;
          g.fillStyle = lawnC(0.32); g.fill(S().poly([[a - 4, G], [b + 4, G], [b + spn * 0.2, G + L1], [a - spn * 1.1, G + L1]]).path(2, 94));
          g.fillStyle = lawnC(0.48); g.fill(S().poly([[a + 6, G], [b - 6, G], [b - spn * 0.1, G + L2], [a - spn * 0.5, G + L2]]).path(1.5, 95));
        });
        g.restore();
        g.fillStyle = C.ink; g.fill(v.footing || (v.footing = S().rect(toH([950, 0])[0] - 8, GND - 3, s * 920, 14).path(1.5, 3)));
      },
      bar(g, gap, col, s2, u) { strobeBar(g, gap.x, gap.y - 2, col, 0.25 + 0.6 * u, 3 + 3 * u, 100 + 40 * u, 0.16 * s2, 700); },
      blades: { y0: 680, h: 400, draw(g) { g.translate(0, -680); sparseBlades(g, { n: 320, x0: 100, x1: 1960, y0: 712, y1: 1070, yh: 690, seed: 'fblades' }); } },
      front: { y0: 900, h: 180, draw(g) { g.translate(0, -900); edgeBlades(g, { seed: 'ffront', cx: 980, span: 900, tall: 120 }); } },
      smoke: smokeSys({ n: 56, T: 46, seed: 'fsmoke', path: u => [1340 + 260 * u + 520 * u * u, 230 - 640 * u + 20 * Math.sin(u * 7)], r: u => 60 + 220 * u, spread: u => 1.3 - 0.7 * u, fade: 0.55,
        level: (x, y) => y > 150 ? 2 : y > 90 ? 1 + (y - 90) / 60 : 1,
        levels: [{ body: SMOKE_INK, belly: SMOKE_INK }, { body: SMOKE_INK, belly: mix(SMOKE_INK, C.fireOuter, 0.3), rimK: 0.22 }, { body: SMOKE_INK, belly: mix(SMOKE_INK, C.fireOuter, 0.6), rimK: 0.24 }],
        dir: { dx: -0.3, dy: 0.95 },
        bank(g) {
          smokeBank(g, { seed: 'fence-bank', n: 26, col: SMOKE_INK, path: t => [1380 + 760 * t, 120 - 200 * t + 26 * Math.sin(t * 8)], r: t => 70 + 200 * t,
            slab: [[1000, -40], [W + 40, -40], [W + 40, 210], [1700, 70], [1250, 20]],
            rims: [[mix(SMOKE_INK, C.fireOuter, 0.28), 14, -30, 1260, 420, 760, 440], [mix(SMOKE_INK, C.fireOuter, 0.58), 5, -10, 1260, 420, 360, 260]] });
        } }),
      embers: [emberSys({ x: 920, y: 260, w: 720, h: 280, n: 120, rise: 640, life: 5, drift: 180, seed: 'fe1' }), emberSys({ x: 1020, y: 200, w: 520, h: 200, n: 36, rise: 520, life: 4, drift: 150, seed: 'fe2', hot: 1 })],
      kitchen: toH(HM.kitchen), light: { x: 1265, y: 470, dx: 1, dy: -0.3 }, def: { curtain: 1, roof: 0.35, fire: 0.9 },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, fenceFoot: { x: 560, y: 700, zoom: 1.12 } },
      anchors: { ground: GND, fire: [1265, 470], house: toH([1295, 410]),
        // [x, ground y under him, px per head]: from where the blast threw him (in front of the back steps; 'backdoor' landing) to the fence foot.
        // The scale is the lawn's perspective (horizon y 659): 13.9 px/head at the house's foot (690), 84 at the fence (846).
        crawl: { from: [1674, 739, 36], to: [470, 846, 84] }, doorLands: toH(HM.doorLands), steps: toH([1808, 750]), door: toH([1815, 642]),
        seat: { hip: [400, 846], scale: 88, facing: 1, ground: 880, back: [338, 720] },   // slumped against the boards, facing the house
        figAt: y => 84 * Math.max(0.05, (y - 659) / 187),
        fenceFoot: x => PF.at(x).bot, crawlAt: u => { const e = u * u * (3 - 2 * u), y = lerp(739, 846, e); return [lerp(1674, 470, e) - 40 * Math.sin(Math.PI * e), y, 84 * (y - 659) / 187]; } },
    };
    return v;
  })();

  // ---------------- 'hands': a low close insert on the grass ----------------
  // clumps of blades fanning from one root (cut-paper tufts), sized by depth; 'clear' presses them flat round the hands
  function tuftField(g, o) {
    const R = O.rng(o.seed), P = new Path2D();
    for (let i = 0; i < o.n; i++) {
      const y = lerp(o.y0, o.y1, Math.pow(R(), o.pow || 1)), p = sat((y - o.yh) / (H - o.yh)), x = lerp(o.x0, o.x1, R());
      let L = lerp(o.s0, o.s1, Math.pow(p, 1.2)) * (0.6 + 0.7 * R());
      if (o.clear) { const d = Math.hypot((x - o.clear[0]) / o.clear[2], (y - o.clear[1]) / o.clear[3]); if (d < 1) L *= lerp(0.16, 1, d * d * d); }
      const k = (o.k0 || 4) + Math.floor(R() * ((o.k1 || 8) - (o.k0 || 4))), spread = (o.spread || 1.1) * (0.7 + 0.6 * R()), lean = (R() - 0.5) * 0.35 + (o.lean || 0), w = L * (o.wk || 0.055) + 0.6;
      for (let j = 0; j < k; j++) {
        const a = -Math.PI / 2 + lean + spread * (j / Math.max(1, k - 1) - 0.5) + (R() - 0.5) * 0.18, l = L * (0.55 + 0.45 * R()) * (1 - 0.35 * Math.abs(j / Math.max(1, k - 1) - 0.5));
        const bx = x + (j - k / 2) * w * 0.9, tx = bx + Math.cos(a) * l, ty = y + Math.sin(a) * l, bend = (R() - 0.5) * 0.5 * l + Math.cos(a) * l * 0.25;
        const mx = (bx + tx) / 2 + bend * 0.35, my = (y + ty) / 2;
        P.moveTo(bx - w, y); P.quadraticCurveTo(mx - w * 0.4, my, tx, ty); P.quadraticCurveTo(mx + w * 0.4, my, bx + w, y); P.closePath();
      }
    }
    g.fillStyle = o.col; g.fill(P);
  }
  V.hands = (() => {
    const HZ = 330, s = 0.24, m = [s, 0, 0, s, 360 - 1295 * s, HZ - 750 * s], CL = [960, 720];
    const gaps = [], FX0 = 1130, FB = HZ;
    for (let x = FX0, i = 0; x < W + 20; i++) { const k = (x - FX0) / (W - FX0), bw = 11 + 7 * k, gp = 3 + 2 * k, top = HZ - 50 - 16 * k; gaps.push({ q: [[x + bw + 0.5, top + 5], [x + bw + gp - 0.5, top + 5], [x + bw + gp - 0.5, FB], [x + bw + 0.5, FB]], x: x + bw + gp / 2, y: FB, bx: x, bw, top }); x += bw + gp; }
    const v = {
      m, ground: HZ, kitchenUp: true, gaps, gapBase: inkC(0.55),
      bg(g) {
        g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 40, 10, 3);
        O.lightPool(g, 360, HZ, [{ r: 860, color: glowC(0.13) }, { r: 470, color: glowC(0.28) }], { sy: 0.42, rough: 3, seed: 31 });
        const far = mix(C.ink, NIGHT, 0.45), L = S();
        [[640, 760, HZ - 40, 26], [750, 900, HZ - 30, 0], [-20, 130, HZ - 36, 24]].forEach(([x0, x1, top, peak]) => { if (peak) L.poly([[x0, HZ], [x0, top + 10], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 10], [x1, HZ]]); else L.poly([[x0, HZ], [x0 + 10, top], [x1 - 10, top], [x1, HZ]]); });
        O.silhouette(g, L.path(1.2, 65), { fill: far, light: { dx: -1, dy: -0.3 }, rimColor: glowC(0.24), rimW: 2 });
      },
      glow: { x: 360, y: HZ, r: 230, sy: 0.45, col: glowC(0.5), under: glowC(0.28), seed: 32 },
      mid(g) {
        houseInk(g, m);
        gaps.forEach((gp, i) => { const x = gp.bx; g.fillStyle = mix(C.ink, C.fireOuter, 0.12); g.fill(S().poly([[x, gp.top + 4], [x + gp.bw / 2, gp.top - 2], [x + gp.bw, gp.top + 4], [x + gp.bw, FB + 2], [x, FB + 2]]).path(0.6, 400 + i)); });
        g.fillStyle = C.grass; g.fillRect(0, HZ, W, H - HZ);
        g.save(); g.beginPath(); g.rect(0, HZ, W, H - HZ); g.clip();
        bandsOf(g, [{ shape: S().ellipse(360, HZ, 1500, 210, 0), col: lawnC(0.1), rough: 2.5 }, { shape: S().ellipse(360, HZ + 2, 760, 80, 0), col: lawnC(0.22), rough: 2 }], 80);
        bandsOf(g, [{ shape: S().poly([[-40, 640], [W + 40, 600], [W + 40, H + 40], [-40, H + 40]]), col: mix(C.grass, C.ink, 0.3), rough: 3 }, { shape: S().poly([[-40, 880], [W + 40, 850], [W + 40, H + 40], [-40, H + 40]]), col: mix(C.grass, C.ink, 0.55), rough: 3 }], 82);
        g.restore();
        g.fillStyle = C.ink; g.fillRect(-20, HZ - 2, W + 40, 4);
        tuftField(g, { seed: 'hf-far', n: 1100, y0: HZ + 3, y1: 540, yh: HZ - 60, pow: 1.5, x0: -20, x1: W + 20, s0: 5, s1: 42, k0: 3, k1: 6, col: mix(C.grass, C.ink, 0.5) });
      },
      lawnLive(g, em, t, st) {
        if (st.handGlow > 0.01) {
          const k = smooth(st.handGlow), b = 0.95 + 0.07 * flick(t * 0.7, 5);
          O.lightPool(g, CL[0] + 30, CL[1] + 18, [{ r: 470 * k * b, color: lawnC(0.17) }, { r: 300 * k * b, color: lawnC(0.32) }, { r: 175 * k * b, color: mix(C.grass, C.fireMid, 0.42) }], { sy: 0.3, rough: 3, seed: 33 });
        }
      },
      bar(g, gap, col, s2, u) { strobeBar(g, gap.x, gap.y, col, Math.PI - 0.5 - 0.45 * u, 2, 240, 0.12 * s2, 1700); },
      blades: { y0: 380, h: 700, draw(g) {
        g.translate(0, -380);
        tuftField(g, { seed: 'hf-mid', n: 620, y0: 480, y1: 810, yh: HZ - 60, pow: 1.05, x0: -40, x1: W + 40, s0: 30, s1: 105, col: mix(C.ink, C.grass, 0.28), clear: [CL[0], CL[1], 330, 105] });
        tuftField(g, { seed: 'hf-near', n: 90, y0: 780, y1: 1110, yh: HZ - 60, pow: 0.9, x0: -60, x1: W + 60, s0: 120, s1: 260, k0: 5, k1: 9, col: C.ink, clear: [CL[0], CL[1] + 60, 420, 170] });
      } },
      front: { y0: 600, h: 480, draw(g) {
        g.translate(0, -600);
        tuftField(g, { seed: 'hf-front', n: 9, y0: 1080, y1: 1100, yh: HZ - 60, x0: -80, x1: 380, s0: 320, s1: 440, k0: 6, k1: 9, spread: 1.2, lean: 0.2, col: C.ink });
        tuftField(g, { seed: 'hf-front2', n: 8, y0: 1080, y1: 1100, yh: HZ - 60, x0: 1560, x1: W + 80, s0: 300, s1: 420, k0: 6, k1: 9, spread: 1.2, lean: -0.2, col: C.ink });
      } },
      smoke: smokeSys({ n: 34, T: 50, seed: 'hhsmoke', path: u => [380 + 140 * u + 420 * u * u, 190 - 260 * u], r: u => 20 + 90 * u, spread: u => 1.3 - 0.6 * u,
        level: (x, y) => y > 150 ? 2 : y > 100 ? 1 + (y - 100) / 50 : 1,
        levels: [{ body: mix(NIGHT, C.ink, 0.45), belly: mix(NIGHT, C.fireOuter, 0.08) }, { body: inkC(0.3), belly: glowC(0.22) }, { body: glowC(0.1), belly: glowC(0.36) }] }),
      embers: [emberSys({ x: 280, y: 180, w: 220, h: 100, n: 34, rise: 180, life: 5, drift: 70, seed: 'hhe1', size: 0.55 })],
      kitchen: apM(m, HM.kitchen), light: { x: 360, y: 260, dx: -0.6, dy: -0.8 }, def: { curtain: 1, roof: 1 },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, close: { x: 960, y: 690, zoom: 1.12 } },
      anchors: { ground: HZ, clasp: CL, handLen: 290, scottWrist: [600, 770], extraWrist: [1320, 700], pool: [CL[0] + 30, CL[1] + 18], fire: [360, 260], door: apM(m, [1815, 642]),
        seat: { hip: [-260, 1500], scale: 380, facing: 1, ground: 1520, offscreen: true } },   // his body is off frame, lower left: only the arm enters, to scottWrist
    };
    return v;
  })();

  // ---------------- 'backdoor': the SAME house at 2x (MB): the kitchen wing, its window, the back door and four steps (F12) ----------------
  const BD = (() => {
    const BX = 1330, BY = 590, GY = 800, toB = p => apM(MB, p);
    const d = HM.door, door = { x: d.x * 2 - 2300, y: d.y * 2 - 698, w: d.w * 2, h: d.h * 2 };   // [1266, 470, 128, 232]
    const steps = HM.steps.map(s => ({ k: s.k, y: s.y * 2 - 698, x0: s.x0 * 2 - 2300, x1: s.x1 * 2 - 2300, h: 25 }));
    // the windows that show at this distance: HM 1 (upstairs middle), 2 (upstairs right), 3 (the big one, at the left edge), 4 (the kitchen)
    const wins = HM.wins.filter(w => w.i > 0).map(w => { const [x, y] = toB([w.x, w.y]); return { x, y, w: w.w * 2, h: w.h * 2, i: w.i, kind: w.kitchen ? 'kitchen' : w.big ? 'big' : 'up', clip: S().rect(x, y, w.w * 2, w.h * 2).path(1.6, 60 + w.i) }; });
    const outline = HM.outline.map(toB), housePath = polyP(outline);
    // the sky: everything above the lawn that is not house. Smoke is clipped to it, so it always rises from BEHIND the roofs
    const sky = new Path2D(); sky.rect(-400, -400, W + 800, GY + 400); sky.addPath(housePath);
    // the side fence: from the wing's corner toward the camera (the same fence the 'house' view sees run off to the right)
    const PF = perspFence({ x: 1482, top: 646, bot: GY + 2 }, { x: 2000, top: 452, bot: 936 }, { bw0: 22, bw1: 70, gap0: 4, gap1: 10 });
    const footY = x => x < 1482 ? GY : PF.at(x).bot;
    const lawn = new Path2D(); { lawn.moveTo(-60, GY); lawn.lineTo(1482, GY); for (let x = 1482; x <= W + 60; x += 40) lawn.lineTo(x, PF.at(x).bot); lawn.lineTo(W + 60, H + 60); lawn.lineTo(-60, H + 60); lawn.closePath(); }
    // F12's plume (the ink burst about the door and the jet thrown left): the negative frames AND the first 0.3 s of the aftermath
    const R = O.rng('f12-plume'), JX = 800, JY = 632, nS = 22, bpts = [];
    for (let i = 0; i < nS * 2; i++) {
      const th = i / (nS * 2) * Math.PI * 2 + (R() - 0.5) * 0.1, c = Math.cos(th), s = Math.sin(th);
      const wgt = 1 + 0.55 * Math.max(0, -c) - 0.32 * Math.max(0, c) - 0.12 * Math.max(0, -s) - 0.6 * Math.max(0, s) + (i % 8 === 2 && s < -0.3 ? 0.55 : 0);
      const r = i % 2 === 0 ? (260 + 260 * R()) * wgt : (170 + 50 * R()) * wgt; bpts.push([BX + c * r, BY + s * r * 0.9]);
    }
    const jet = []; for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2; const q = 1 + 0.3 * (O.fbm(Math.cos(a) * 1.7 + 3, Math.sin(a) * 1.7, 9, 3) - 0.5) * 2; jet.push([JX + Math.cos(a) * 580 * q, JY + Math.sin(a) * 215 * q]); }
    const plume = S().poly(bpts).poly(jet).add(S().ellipse(BX, BY + 10, 220, 200)).poly([[BX, BY - 150], [BX, BY + 190], [JX, JY + 200], [JX, JY - 200]]);
    const plumeP = plume.path(2.4, 13);
    // glass: every window bursts outward in the blast; it lands on the lawn (this side of the side fence) and stays
    const glass = []; const gr = O.rng('bd-glass');
    wins.forEach(wd => { for (let k = 0; k < 13; k++) {
      const ox = Math.max(10, wd.x + wd.w * (0.2 + 0.6 * gr())), oy = wd.y + wd.h * (0.2 + 0.6 * gr()), a = -Math.PI * (0.05 + 0.9 * gr()), v = 200 + 600 * gr(), gg = 1700;
      let vx = Math.cos(a) * v * 1.2; const vy = Math.sin(a) * v * 0.7, land = GY + 12 + 230 * Math.pow(gr(), 1.4), tl = (-vy + Math.sqrt(vy * vy + 2 * gg * Math.max(1, land - oy))) / gg;
      if (ox + vx * tl > 1440) vx = (1440 - ox) / tl;
      glass.push({ ox, oy, vx, vy, gg, land, tl, s: 6 + 12 * gr(), grow: 1 + (land - GY) / 160, rot: gr() * 6, spin: (gr() - 0.5) * 18, hot: k % 3 === 0 }); } });
    // the annex roof slab and the main eave, in BD space
    const annexRoof = [toB([1636, 520]), toB([1904, 569]), toB([1904, 579]), toB([1636, 530])];
    return { BX, BY, GY, door, wins, steps, outline, housePath, sky, PF, footY, lawn, plume, plumeP, JX, JY, glass, annexRoof, toB,
      handle: [door.x + door.w - 14, door.y + 124], kitchen: toB(HM.kitchen), kitchenWindow: toB([1702, 648]), doorLands: toB(HM.doorLands), landing: [1150, 905] };
  })();
  const BLAST = { dur: 3.0, white: 2.5 / 72, inv: 6.5 / 72 };
  const VB = { m: MB, kitchenUp: true, noDoor: true, skipWin: [0] };   // houseLive under MB

  function bdSteps(g, face, edge) {
    BD.steps.forEach(st => { g.fillStyle = face; g.fill(S().rect(st.x0, st.y, st.x1 - st.x0, st.h).path(0.8, 90 + st.k)); g.fillStyle = edge; g.fillRect(st.x0, st.y, st.x1 - st.x0, 3); g.fillStyle = C.ink; g.fillRect(st.x0, st.y + st.h - 3, st.x1 - st.x0, 3); });
  }
  // beyond the wing's corner: the neighbours' roofs, a tree, and the side fence coming toward us
  function bdBeyond(g, burning) {
    const { GY } = BD, far = inkC(0.45), L = S();
    [[1470, 1640, 600, 40], [1620, 1800, 618, 0], [1790, 1960, 596, 46]].forEach(([x0, x1, top, peak]) => { if (peak) L.poly([[x0, GY], [x0, top + 18], [(x0 + x1) / 2, top - peak * 0.4], [x1, top + 18], [x1, GY]]); else L.poly([[x0, GY], [x0 + 16, top], [x1 - 16, top], [x1, GY]]); });
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; L.circle(1712 + Math.cos(a) * 60, 448 + Math.sin(a) * 66, 46 + (k % 3) * 10); }
    L.circle(1712, 448, 80).rect(1703, 480, 20, 300);
    if (burning) O.silhouette(g, L.path(1.6, 33), { fill: far, light: { dx: -1, dy: -0.3 }, rimColor: glowC(0.3), rimW: 3 }); else { g.fillStyle = far; g.fill(L.path(1.6, 33)); }
  }
  function bdFence(g, burning) {
    drawPerspFence(g, BD.PF, burning ? { gapCol: mix(C.ink, NIGHT, 0.8), face: [0.3, 0.2, 0.1], rim: [0.7, 0.5, 0.32], light: { dx: -1, dy: -0.2 } }
      : { gapCol: inkC(0.62), face: [0.06, 0.04, 0.02], rim: [0.1, 0.08, 0.05], light: { dx: -1, dy: -0.2 } });
  }
  function bdHouse(g, wall, roof) {
    g.save(); g.transform(MB[0], MB[1], MB[2], MB[3], MB[4], MB[5]); g.fillStyle = wall; g.fill(HM.path);
    g.fillStyle = roof; g.fill(S().poly(HM.ROOF).path(0.5, 8)); g.restore();
    g.fillStyle = roof; g.fill(S().poly(BD.annexRoof).path(1.0, 11)); g.fill(S().rect(-60, 128, 1100, 12).path(0.8, 12));
  }
  const BDV = {
    night(g) {
      const { GY, door, wins } = BD;
      g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 46, 12, 4);
      bdBeyond(g, false); bdHouse(g, inkC(0.2), C.ink);
      g.save(); g.clip(BD.housePath); g.globalAlpha = 0.45; g.fillStyle = C.ink; for (let y = 160; y < GY; y += 26) g.fillRect(-10, y, W, 2); g.restore();
      wins.forEach(wd => {
        if (wd.kind === 'kitchen') { g.fillStyle = C.hood; g.fill(wd.clip); g.fillStyle = C.hoodMid; g.fill(S().rect(wd.x, wd.y + wd.h * 0.66, wd.w, wd.h * 0.34).path(0.8, 3)); }
        else if (wd.kind === 'big') { g.fillStyle = mix(C.ink, C.tungstenLow, 0.75); g.fill(wd.clip); g.fillStyle = C.ink; g.fillRect(wd.x, wd.y, wd.w * 0.5, wd.h); g.fillStyle = mix(C.ink, C.tungstenLow, 0.4); g.fillRect(wd.x + wd.w * 0.5, wd.y + wd.h * 0.72, wd.w * 0.5, wd.h * 0.28); }
        else { g.fillStyle = inkC(0.55); g.fill(wd.clip); }
        g.fillStyle = C.ink; g.fillRect(wd.x + wd.w / 2 - 4, wd.y, 8, wd.h); g.fillRect(wd.x, wd.y + wd.h / 2 - 4, wd.w, 8); g.fill(S().rect(wd.x - 8, wd.y + wd.h, wd.w + 16, 12).path(0.6, 75 + wd.i));
      });
      g.fillStyle = C.ink; g.fill(S().rect(door.x - 9, door.y - 9, door.w + 18, door.h + 10).path(0.8, 96));
      bdSteps(g, inkC(0.42), mix(C.ink, C.hoodLow, 0.9));
      g.fillStyle = C.grass; g.fillRect(0, GY, W, H - GY);
      g.fillStyle = C.ink; g.fillRect(0, GY - 3, W, 6);
      bdFence(g, false);
      // the kitchen window lays its sick light on the grass below it
      g.fillStyle = mix(C.grass, C.hoodLow, 0.7); g.fill(S().poly([[1004, GY + 3], [1204, GY + 3], [1250, 960], [930, 960]]).path(2, 3));
      g.fillStyle = mix(C.hoodLow, C.hoodMid, 0.35); g.fill(S().poly([[1030, GY + 3], [1178, GY + 3], [1196, 880], [990, 880]]).path(1.5, 4));
      g.fillStyle = mix(C.grass, C.hoodLow, 0.35); g.fill(S().poly([[1100, GY + 3], [1108, GY + 3], [1110, 960], [1092, 960]]).path(0.8, 5));
    },
    burn(g) {
      const { GY, BX, wins } = BD;
      g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); zenith(g, 46, 12, 4);
      O.lightPool(g, 1300, 360, [{ r: 1000, color: glowC(0.12) }, { r: 600, color: glowC(0.24) }], { sy: 0.56, rough: 4, seed: 41 });
      bdBeyond(g, true); bdHouse(g, mix(C.ink, C.fireOuter, 0.05), C.ink);
      wins.forEach(wd => { g.fillStyle = C.fireOuter; g.fill(wd.clip); });
      bdSteps(g, mix(C.ink, C.fireOuter, 0.22), C.fireMid);
      g.fillStyle = C.grass; g.fillRect(0, GY, W, H - GY);
      g.save(); g.clip(BD.lawn);
      bandsOf(g, [{ shape: S().ellipse(BX, GY, 1700, 380, 0), col: lawnC(0.12), rough: 2.5 }, { shape: S().ellipse(BX - 100, GY + 4, 1050, 210, 0), col: lawnC(0.24), rough: 2.5 }], 90);
      g.restore();
      g.fillStyle = C.ink; g.fillRect(0, GY - 3, 1490, 6);
      bdFence(g, true);
    },
    // the lawn's blades (over the heat stripes and the pools, under the figures)
    blades(g) { g.translate(0, -790); g.save(); g.clip(BD.lawn); sparseBlades(g, { n: 360, x0: -20, x1: 1940, y0: 812, y1: 1075, yh: 800, seed: 'bdblades', alpha: 0.85 }); g.restore(); },
    // F12: the negative frames (no Scott, no mattes: those are the sequence's and burnMattes')
    inv(g) {
      const { BX, BY, GY, PF } = BD, R = O.rng('f12'), poly = polyP;
      g.fillStyle = C.fireOuter; g.fillRect(0, 0, W, H);
      O.lightPool(g, BX, BY, [{ r: 1650, color: '#C3350F' }, { r: 1250, color: C.fireMid }, { r: 820, color: C.ember }], { sy: 0.87, rough: 3, seed: 5 });
      // beyond the wing: the tree and the side fence, lit
      { const t = S(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; t.circle(1712 + Math.cos(a) * 60, 448 + Math.sin(a) * 66, 46 + (k % 3) * 10); } t.circle(1712, 448, 80).rect(1703, 480, 20, 300); g.fillStyle = C.ember; g.fill(t.path(1.6, 33)); }
      PF.boards.forEach((b, i) => { g.fillStyle = i % 2 ? C.ember : C.fireMid; g.fill(S().poly(b.pts).path(0.8, 40 + i)); });
      // the house: the lit paper of its walls and roof
      const sh2 = O.makeCanvas(W, H), hg = sh2.getContext('2d');
      hg.fillStyle = C.fireMid; hg.fillRect(0, 0, W, H);
      O.lightPool(hg, BX, BY, [{ r: 1600, color: C.ember }, { r: 1120, color: C.fireCore }], { sy: 0.87, rough: 3, seed: 6 });
      hg.globalCompositeOperation = 'destination-in'; hg.fill(BD.housePath); g.drawImage(sh2, 0, 0);
      g.fillStyle = C.ink; g.fill(S().rect(-60, 128, 1100, 12).path(0.8, 11)); g.fill(S().poly(BD.annexRoof).path(1.0, 12));
      g.fillStyle = C.fireMid; g.fillRect(0, GY, W, 60); g.fillStyle = '#C3350F'; g.fillRect(0, GY + 46, W, 56); g.fillStyle = C.fireOuter; g.fillRect(0, GY + 96, W, H - GY - 96);
      g.fillStyle = C.ink; g.fillRect(0, GY - 3, W, 6);
      const inkMask = O.makeCanvas(W, H).getContext('2d'); inkMask.fillStyle = '#fff';
      BD.wins.forEach(({ x, y, w, h, kind, i }) => {
        const p = S().rect(x, y, w, h).path(1.2, 60 + i); g.fillStyle = C.ink; g.fill(p); inkMask.fill(p);
        { const st = [], rs = O.rng('wstar' + i); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2 + (rs() - 0.5) * 0.25; const q = (k % 2 ? 0.6 + rs() * 0.1 : 0.85 + rs() * rs() * 1.6); st.push([x + w / 2 + Math.cos(a) * w * 0.66 * q, y + h / 2 + Math.sin(a) * h * 0.6 * q]); } const sp = S().poly(st).path(1.4, 77 + i); g.fillStyle = C.ink; g.fill(sp); inkMask.fill(sp); }
        const rr = O.rng('win' + i);
        if (kind !== 'kitchen') for (let k = 0; k < 4; k++) tongue(g, x + w * (0.16 + 0.23 * k), y + 10, w * 0.36, 90 + 130 * rr(), (rr() - 0.5) * 0.4, 80 + i * 7 + k, 0, INV3);
        g.fillStyle = C.fireCore; g.fill(S().poly([[x + w / 2 - 4, y + 6], [x + w / 2 + 4, y + 6], [x + w / 2 + 6, y + h * 0.5], [x + w / 2 - 3, y + h * 0.42]]).path(0.6, 66 + i));
        g.fill(S().poly([[x + 6, y + h / 2 - 4], [x + w * 0.4, y + h / 2 - 7], [x + w * 0.38, y + h / 2 + 3], [x + 6, y + h / 2 + 4]]).path(0.6, 70 + i));
        g.fillStyle = C.ink; g.fill(S().rect(x - 4, y + h, w + 8, 12).path(0.6, 75 + i));
      });
      const plumeP = BD.plumeP, probe = O.makeCanvas(8, 8).getContext('2d'), { JX, JY } = BD;
      const edgeTongue = (cx0, cy0, th, i, k) => {
        k = k || 1; const c = Math.cos(th), s = Math.sin(th); let r = 40; while (r < 1500 && probe.isPointInPath(plumeP, cx0 + c * r, cy0 + s * r)) r += 6;
        const ex = cx0 + c * (r - 30), ey = cy0 + s * (r - 30); if (ey > GY + 90) return; if (ey > GY - 10) k *= 0.55;
        tongue(g, ex, ey, (80 + 70 * R()) * k, (90 + 150 * R()) * k, Math.atan2(s, c) + Math.PI / 2, 200 + i, 0, INV3);
      };
      for (let i = 0; i < 40; i++) edgeTongue(BX, BY, -Math.PI * 0.5 + i / 40 * Math.PI + (R() - 0.5) * 0.05, i, 0.7);
      for (let i = 0; i < 64; i++) edgeTongue(JX, JY, Math.PI * 0.5 + i / 64 * Math.PI + (R() - 0.5) * 0.05, 60 + i);
      for (let i = 0; i < 16; i++) edgeTongue((BX + JX) / 2, BY - 40, -Math.PI * 0.95 + i / 16 * Math.PI * 0.45, 140 + i);
      g.fillStyle = C.ink; g.fill(plumeP); inkMask.fill(plumeP);
      [[-2.7, 0.012], [-1.95, 0.01], [-0.5, 0.012], [0.2, 0.01], [2.8, 0.012]].forEach(([th, wd]) => {
        const L = 2400, p = poly([[BX, BY], [BX + Math.cos(th - wd) * L, BY + Math.sin(th - wd) * L], [BX + Math.cos(th + wd) * L, BY + Math.sin(th + wd) * L]]); g.fillStyle = C.ink; g.fill(p); inkMask.fill(p);
      });
      g.fillStyle = C.ink; g.fill(S().rect(BX - 64, 470, 128, 232).path(1, 95));
      BD.steps.forEach(st => { g.fillStyle = C.fireCore; g.fill(S().rect(st.x0, st.y, st.x1 - st.x0, 25).path(0.8, 90 + st.k)); g.fillStyle = C.ink; g.fillRect(st.x0, st.y, st.x1 - st.x0, 3); });
      g.save(); g.translate(1150, 268); g.rotate(-0.55);
      g.fillStyle = C.fireCore; g.fill(S().rect(-56, -118, 112, 236).path(1.0, 96));
      g.fillStyle = C.ink; [[-42, -102], [3, -102], [-42, -48], [3, -48]].forEach(([x, y], i) => g.fill(S().rect(x, y, 39, 48).path(0.8, 97 + i))); g.fillRect(-56, 110, 112, 8); g.fillRect(48, -118, 8, 236);
      g.restore();
      const md = inkMask.getImageData(0, 0, W, H).data, onInk = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return false; return md[(y * W + x) * 4 + 3] > 128; };
      BD.wins.forEach(({ x, y, w, h }, wi) => { const cx = x + w / 2, cy = y + h / 2, rr = O.rng('shard' + wi);
        for (let k = 0; k < 12; k++) { const a = rr() * Math.PI * 2, d = 50 + rr() * 280, sx = cx + Math.cos(a) * d * 1.3, sy = cy + Math.sin(a) * d * 0.7 - rr() * 50, s = 6 + rr() * 14, rot = rr() * 6;
          g.fillStyle = onInk(sx, sy) ? C.fireCore : C.ink; g.fill(poly([[sx + Math.cos(rot) * s, sy + Math.sin(rot) * s], [sx + Math.cos(rot + 2.4) * s * 0.55, sy + Math.sin(rot + 2.4) * s * 0.55], [sx + Math.cos(rot + 3.8) * s * 0.85, sy + Math.sin(rot + 3.8) * s * 0.85]])); } });
      for (let i = 0; i < 620; i++) {
        const a = R() * Math.PI * 2, d = Math.pow(R(), 0.55) * 1250, x = BX - 200 + Math.cos(a) * d * 1.3, y = BY + Math.sin(a) * d * 0.72 - R() * 140;
        if (x < 0 || x > W || y < 0 || y > H) continue; const s = 1.2 + R() * 4.4, rot = R() * 6;
        g.fillStyle = onInk(x, y) ? (R() < 0.55 ? C.fireCore : C.ember) : C.ink;
        g.fill(poly([[x + Math.cos(rot) * s, y + Math.sin(rot) * s], [x + Math.cos(rot + 2.1) * s * 0.7, y + Math.sin(rot + 2.1) * s * 0.7], [x + Math.cos(rot + 4.0) * s * 0.8, y + Math.sin(rot + 4.0) * s * 0.8]]));
      }
      g.fillStyle = C.ink;
      for (let i = 0; i < 900; i++) {
        const x = -60 + R() * (W + 120), base = H + 10, top = 905 + R() * 90 + Math.abs(x - BX) * 0.02, lean = Math.sign(x - BX || 1) * (50 + R() * 140) * (0.35 + Math.min(1, Math.abs(x - BX) / 900)), w = 5 + R() * 9;
        g.beginPath(); g.moveTo(x - w, base); g.quadraticCurveTo(x + lean * 0.25, (base + top) / 2, x + lean, top); g.lineTo(x + w, base); g.fill();
      }
      g.fillRect(0, 1010, W, 70);
    },
    front(g) { g.translate(0, -930); edgeBlades(g, { seed: 'bdfront', cx: 1250, span: 1000, tall: 100 }); },
  };
  // the back door: hinged on its left jamb, it swings IN to the kitchen (pull the handle to shut it from outside)
  function bdDoorLeaf(a) {
    const d = BD.door, ang = sat(a) * 1.35, pw = d.w * Math.cos(ang), sh = d.h * 0.06 * Math.sin(ang);
    return { pw, sh, quad: [[d.x, d.y], [d.x + pw, d.y + sh], [d.x + pw, d.y + d.h - sh], [d.x, d.y + d.h]] };
  }
  function bilin(q, u, v) { const a = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], b = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)]; return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)]; }
  // the kitchen catching: hood yellow -> fireCore in posterised steps (kitchenFlare 0..1, over 2-4 frames before the white)
  const FLARE = [C.hood, mix(C.hood, C.fireMid, 0.55), C.fireMid, C.fireCore, C.blastWhite];
  const flareLv = kf => kf <= 0.001 ? 0 : kf < 0.34 ? 1 : kf < 0.67 ? 2 : 3;
  function bdDoor(g, em, a, kf) {
    const d = BD.door, lv = flareLv(kf), lit = FLARE[lv];
    if (a > 0.004) {   // the kitchen beyond: the hood's sick light, posterised (or the flare)
      g.fillStyle = lit; g.fillRect(d.x, d.y, d.w, d.h);
      g.fillStyle = lv ? FLARE[Math.min(3, lv + 1)] : C.hoodMid; if (lv) g.fill(S().ellipse(d.x + d.w * 0.4, d.y + d.h * 0.45, d.w * 0.3 * lv, d.h * 0.22 * lv).path(2, 4)); else g.fillRect(d.x, d.y + d.h - 64, d.w, 64);
      if (!lv) { g.fillStyle = C.hoodLow; g.fillRect(d.x, d.y + d.h - 26, d.w, 26); }
      em.save(); em.globalAlpha = 0.7; em.fillStyle = lit; em.fillRect(d.x, d.y, d.w, d.h); em.restore();
    }
    const L = bdDoorLeaf(a);
    g.fillStyle = inkC(0.26); g.fill(polyP(L.quad));
    [[0.12, 0.08, 0.46, 0.27], [0.54, 0.08, 0.88, 0.27], [0.12, 0.31, 0.46, 0.5], [0.54, 0.31, 0.88, 0.5]].forEach(([u0, v0, u1, v1]) => {
      const pq = [bilin(L.quad, u0, v0), bilin(L.quad, u1, v0), bilin(L.quad, u1, v1), bilin(L.quad, u0, v1)];
      g.fillStyle = lit; g.fill(polyP(pq)); em.fillStyle = lv ? lit : C.hoodMid; em.fill(polyP(pq));
    });
    const hp = bilin(L.quad, 0.89, 0.535); g.fillStyle = C.ink; g.beginPath(); g.ellipse(hp[0], hp[1], 5 * Math.max(0.3, L.pw / d.w), 6, 0, 0, 7); g.fill();
    g.fillStyle = lit; g.fillRect(hp[0] - 1, hp[1] - 4, 2, 3);
  }
  function bdSpill(g, a, kf) {   // the open door throws the kitchen light down the steps and onto the grass
    if (a < 0.02) return; const d = BD.door, L = bdDoorLeaf(a), x0 = d.x + L.pw, x1 = d.x + d.w, wk = (x1 - x0) / d.w, lv = flareLv(kf);
    const outer = [[x0, d.y + d.h], [x1, d.y + d.h], [x1 + 40 + 60 * wk, 960], [x0 - 160 - 200 * wk, 960]], inner = [[x0 + 6, d.y + d.h], [x1 - 4, d.y + d.h], [x1 + 4, 880], [x0 - 70 - 90 * wk, 880]];
    g.save(); g.beginPath(); g.rect(0, d.y + d.h, W, H); g.clip();
    g.fillStyle = lv ? mix(C.grass, FLARE[lv], 0.55) : mix(C.grass, C.hoodLow, 0.8); g.fill(S().poly(outer).path(2, 7));
    g.fillStyle = lv ? FLARE[lv] : mix(C.hoodLow, C.hoodMid, 0.5); g.fill(S().poly(inner).path(1.5, 8));
    BD.steps.forEach(st => { g.fillStyle = C.ink; g.fillRect(st.x0, st.y + st.h - 3, st.x1 - st.x0, 3); g.fillStyle = lv ? FLARE[lv] : C.hoodMid; g.fillRect(Math.max(st.x0, x0 - 40 - st.k * 40), st.y, Math.min(st.x1, x1 + st.k * 10) - Math.max(st.x0, x0 - 40 - st.k * 40), 3); });
    g.restore();
  }
  function bdFlare(g, em, kf) {   // the kitchen window and its patch of grass as the gas catches
    const lv = flareLv(kf); if (!lv) return; const wd = BD.wins.find(w => w.kind === 'kitchen'), cx = wd.x + wd.w * 0.45, cy = wd.y + wd.h * 0.55;
    g.fillStyle = FLARE[lv]; g.fill(wd.clip); g.save(); g.clip(wd.clip); g.fillStyle = FLARE[lv + 1]; g.fill(S().ellipse(cx, cy, wd.w * 0.15 * (1 + lv), wd.h * 0.13 * (1 + lv)).path(3, 5)); g.restore();
    g.fillStyle = C.ink; g.fillRect(wd.x + wd.w / 2 - 4, wd.y, 8, wd.h); g.fillRect(wd.x, wd.y + wd.h / 2 - 4, wd.w, 8);
    g.save(); g.clip(BD.lawn); g.fillStyle = mix(C.grass, FLARE[lv], 0.35 + 0.12 * lv); g.fill(S().poly([[1004, BD.GY + 3], [1204, BD.GY + 3], [1250 + 30 * lv, 960], [930 - 30 * lv, 960]]).path(2, 3)); g.restore();
    em.save(); em.globalAlpha = 0.45 + 0.15 * lv; em.fillStyle = FLARE[lv]; em.beginPath(); em.ellipse(cx, cy, wd.w * (0.5 + 0.22 * lv), wd.h * (0.5 + 0.2 * lv), 0, 0, 7); em.fill(); em.restore();
  }
  function bdGlass(g, em, u) {
    const hot = new Path2D(), mid = new Path2D();
    BD.glass.forEach(s => {
      let x, y, rot, sq = 1, k = s.s;
      if (u < s.tl) { x = s.ox + s.vx * u; y = s.oy + s.vy * u + 0.5 * s.gg * u * u; rot = s.rot + s.spin * u; k *= lerp(1, s.grow, sat(u / s.tl)); }
      else { x = s.ox + s.vx * s.tl; y = s.land; rot = s.rot + s.spin * s.tl; sq = 0.3; k *= s.grow * 0.5; }
      const P = s.hot ? hot : mid, pt = (a, r) => [x + Math.cos(rot + a) * k * r, y + Math.sin(rot + a) * k * r * sq];
      const a = pt(0, 1), b = pt(2.3, 0.6), c = pt(4.1, 0.85); P.moveTo(a[0], a[1]); P.lineTo(b[0], b[1]); P.lineTo(c[0], c[1]); P.closePath();
    });
    g.fillStyle = mix(C.fireOuter, C.fireMid, 0.6); g.fill(mid); g.fillStyle = C.fireCore; g.fill(hot); em.fillStyle = C.fireMid; em.fill(hot);
  }
  // HEAT washes the grass: a ragged front rolls out from the steps; behind it the grass cools through posterised stripes,
  // each stripe boundary travelling outward as the front did, the coolest giving way to the burning lawn itself (no cut)
  const HEAT = { reach: 0.45, ages: [0.035, 0.17, 0.34, 0.52, 0.72], cols: [mix(C.fireMid, C.fireCore, 0.25), C.fireMid, mix(C.fireOuter, C.fireMid, 0.4), C.fireOuter, mix(C.fireOuter, C.grass, 0.5)] };
  function heatFront(s) { if (s <= 0) return 0; const u = sat(s / HEAT.reach); return 1 - (1 - u) * (1 - u); }   // 0 at the steps .. 1 off the bottom of the frame
  function heatEdge(p, sd) {   // the front line at progress p (0..1) as a polyline left -> right
    const { GY, BX } = BD, D = (H - GY + 90) * p, pts = [];
    for (let x = -60, i = 0; x <= W + 60; x += 22 + (i % 3) * 7, i++) {
      const lag = 0.36 * Math.pow(Math.min(1, Math.abs(x - BX) / 1400), 1.25), rag = (O.vnoise(x * 0.011, sd, 57) - 0.5) * (14 + 40 * p) + (O.vnoise(x * 0.05, sd, 58) - 0.5) * 9;
      pts.push([x, GY + Math.max(0, D * (1 - lag) + rag * Math.min(1, p * 4))]);
    }
    return pts;
  }
  function heatLive(g, em, s) {
    if (s <= 0 || s > HEAT.ages[HEAT.ages.length - 1] + HEAT.reach + 0.2) return;
    const ps = [heatFront(s)].concat(HEAT.ages.map(a => heatFront(s - a)));   // front, then each cooler boundary behind it
    const edges = ps.map((p, i) => p > 0.001 ? heatEdge(p, 3 + i * 0.37 + s * 0.6) : null);
    for (let i = 0; i < HEAT.cols.length; i++) {   // stripe i lies between boundary i+1 (behind) and boundary i (ahead)
      const a = edges[i]; if (!a) continue; const b = edges[i + 1];
      const pts = a.slice(); if (b) for (let j = b.length - 1; j >= 0; j--) pts.push(b[j]); else { pts.push([W + 60, BD.GY - 4]); pts.push([-60, BD.GY - 4]); }
      const p = polyP(pts); g.fillStyle = HEAT.cols[i]; g.fill(p);
      if (b) { g.save(); g.strokeStyle = O.ditherPattern(g, HEAT.cols[i]); g.lineWidth = 6; g.stroke(lineP(b)); g.restore(); }
    }
    if (ps[0] < 0.995) {   // the front itself, burning bright while it is in frame
      const f = lineP(edges[0]); g.save(); g.lineJoin = 'round'; g.strokeStyle = C.fireCore; g.lineWidth = 4; g.stroke(f); g.restore();
      em.save(); em.lineWidth = 16; em.strokeStyle = C.fireMid; em.stroke(f); em.restore();
    }
  }
  const BDE = { smoke: smokeSys({ n: 40, T: 30, seed: 'bdsmoke', born: 0.08, path: u => [1150 + 240 * u + 260 * u * u, 430 - 900 * u], r: u => 70 + 250 * u, spread: u => 1.9 - 0.9 * u,
    level: (x, y) => y > 300 ? 2 : y > 240 ? 1 + (y - 240) / 60 : y > 80 ? 1 : y > 20 ? (y - 20) / 60 : 0,
    levels: [{ body: mix(NIGHT, C.ink, 0.45), belly: mix(NIGHT, C.fireOuter, 0.08) }, { body: mix(NIGHT, C.fireOuter, 0.1), belly: mix(NIGHT, C.fireOuter, 0.22) }, { body: mix(NIGHT, C.fireOuter, 0.18), belly: mix(NIGHT, C.fireOuter, 0.4) }] }),
    embers: [emberSys({ x: 300, y: 200, w: 1500, h: 420, n: 150, rise: 700, life: 5, drift: 160, seed: 'bde1' }), emberSys({ x: 1050, y: 340, w: 500, h: 260, n: 40, rise: 600, life: 4, drift: 120, seed: 'bde2', hot: 1 })],
    scorch: [S().ellipse(1150, 842, 360, 46, -0.04).path(7, 92), S().ellipse(1190, 838, 210, 22, -0.03).path(6, 93)] };
  // the fireball: tongues of different widths and reaches out of the doorway and the kitchen window; some without the pale core
  const FB_DOOR = [[-2.38, 0.62, 0.42, -60, 70, 2], [-1.95, 1.3, 1.15, -40, -30, 3], [-1.52, 0.78, 0.38, -6, -96, 2], [-1.14, 1.5, 0.78, 30, -112, 3], [-0.66, 0.66, 0.3, 64, -26, 2], [-0.24, 1.02, 0.95, 50, 58, 3], [0.36, 0.48, 0.5, 40, 112, 2]];
  const FB_KIT = [[-2.15, 0.6, 0.55, 2], [-1.62, 1.15, 0.95, 3], [-1.02, 0.7, 0.4, 2]];
  function fireball(g, em, after, t) {
    const { BX, BY } = BD, k = Math.pow(1 - after / 0.7, 1.6), kw = BD.kitchenWindow;
    FB_DOOR.forEach(([a, l, w, dx, dy, n], i) => tongue(g, BX + dx, BY + dy * 0.8, 240 * w * k + 26, 520 * l * k + 40, a + Math.PI / 2, 600 + i, t * 2, n === 3 ? FIRE3 : FIRE3.slice(0, 2)));
    FB_KIT.forEach(([a, l, w, n], i) => tongue(g, kw[0], kw[1], 180 * w * k + 20, 360 * l * k + 30, a + Math.PI / 2, 620 + i, t * 2.2, n === 3 ? FIRE3 : FIRE3.slice(0, 2)));
    em.save(); em.globalAlpha = 0.6 * k; em.fillStyle = C.fireMid; em.beginPath(); em.ellipse(BX - 60, BY - 60, 330 * k + 40, 260 * k + 30, 0, 0, 7); em.fill(); em.restore();
  }
  // F12's ink mass hangs on through the first 0.3 s of the aftermath, collapsing toward the doorway and breaking into lobes
  function inkPlume(g, em, s) {
    if (s < 0 || s >= 0.3) return; const u = s / 0.3, e = u * u * (3 - 2 * u), { BX, BY } = BD, ax = BX - 140, ay = BY + 10;
    [g, em].forEach(q => { q.save(); q.translate(ax, ay - 70 * e); q.scale(lerp(0.96, 0.22, e), lerp(0.94, 0.36, e)); q.translate(-ax, -ay); q.fillStyle = C.ink; if (q === em) q.globalCompositeOperation = 'destination-out'; q.fill(BD.plumeP); q.restore(); });   // solid ink: no bloom over it
    const r = O.rng('plume-lobes'), P = new Path2D();
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI * (0.05 + 0.9 * r()) + (r() < 0.35 ? Math.PI : 0), d0 = 160 + 420 * r(), x = BX - 200 + Math.cos(a) * d0 * (1.2 + 0.5 * u), y = BY + Math.sin(a) * d0 * 0.55 - 120 * u, rad = (36 + 50 * r()) * (1 - u);
      if (rad < 2) continue; P.moveTo(x + rad, y); P.ellipse(x, y, rad * 1.25, rad, r() * 3, 0, 6.2832);
    }
    g.fillStyle = C.ink; g.fill(P); em.save(); em.globalCompositeOperation = 'destination-out'; em.fill(P); em.restore();
  }

  function backdoorBack(c, t, st) {
    const g = c.g, em = c.em, b = st.blast || 0, { BX, BY, GY, door } = BD;
    lay(c, 'bd.inv', W, H, BDV.inv); lay(c, 'bd.burn', W, H, BDV.burn); lay(c, 'bd.blades', W, 290, BDV.blades);   // prewarm (and keep warm) the blast layers: the boom frame never pays for a build
    if (!BDE.warm) { BDE.warm = true; BDE.smoke.o.levels.forEach(A => { for (let v = 0; v < 4; v++) sprite(A.body, A.belly, v, BDE.smoke.o.dir, A.rimK); }); }
    if (b > 0 && b < BLAST.white) {   // WHITE: three frames of blast-white; the house is only a ghost of itself
      g.fillStyle = C.blastWhite; g.fillRect(-W, -H, 3 * W, 3 * H);
      g.fillStyle = mix(C.blastWhite, C.fireCore, 0.7); g.fill(BD.housePath);
      g.fillStyle = mix(C.blastWhite, C.fireCore, 1); g.fill(S().rect(door.x - 9, door.y - 9, door.w + 18, door.h + 10).path(1, 96));
      em.save(); em.setTransform(1, 0, 0, 1, 0, 0); em.fillStyle = C.blastWhite; em.fillRect(0, 0, W / 4, H / 4); em.restore();
      return;
    }
    if (b >= BLAST.white && b < BLAST.inv) {   // NEGATIVE: F12's inversion, swelling about the door
      const u = (b - BLAST.white) / (BLAST.inv - BLAST.white), z = 1 + 0.05 * u;
      g.fillStyle = C.fireOuter; g.fillRect(-W, -H, 3 * W, 3 * H);
      g.save(); g.translate(BX, BY); g.scale(z, z); g.translate(-BX, -BY); g.drawImage(lay(c, 'bd.inv', W, H, BDV.inv), 0, 0); g.restore();
      return;
    }
    const after = b >= BLAST.inv ? (b - BLAST.inv) / (1 - BLAST.inv) : -1, s = after >= 0 ? after * (1 - BLAST.inv) * BLAST.dur : -1;   // s: seconds since the negative
    const burning = after >= 0 || st.fire >= 0.5;
    if (!burning) {
      g.drawImage(lay(c, 'bd.night', W, H, BDV.night), 0, 0);
      const kf = st.kitchenFlare || 0, kw = BD.wins.find(w => w.kind === 'kitchen');
      em.fillStyle = C.hoodMid; em.fillRect(kw.x, kw.y, kw.w, kw.h);
      g.drawImage(lay(c, 'bd.blades', W, 290, BDV.blades), 0, 790);
      bdFlare(g, em, kf); bdDoor(g, em, st.doorOpen, kf); bdSpill(g, st.doorOpen, kf);
      return;
    }
    const fire = after >= 0 ? Math.max(st.fire, 0.75) : st.fire, fa = flickA(t, 3), blown = st.blown !== false;
    g.drawImage(lay(c, 'bd.burn', W, H, BDV.burn), 0, 0);
    // the lawn breathes with the doorway (slow noise: a big hard-edged pool must not jitter)
    g.save(); g.clip(BD.lawn);
    { const r = 620 * (0.92 + 0.1 * fa) * (0.6 + 0.4 * fire), p = S().ellipse(BX - 60, GY, r, 80 * (0.9 + 0.2 * fa), 0).path(2, 54);
      g.fillStyle = lawnC(0.4); g.fill(p); g.strokeStyle = O.ditherPattern(g, lawnC(0.24)); g.lineWidth = 5; g.stroke(p); }
    if (after >= 0 || blown) { g.fillStyle = mix(C.ink, lawnC(0.24), 0.55); g.fill(BDE.scorch[0]); g.fillStyle = mix(C.ink, lawnC(0.24), 0.25); g.fill(BDE.scorch[1]); }   // scorched where the blast came down the steps (revealed as the heat passes)
    heatLive(g, em, s);
    g.restore();
    g.drawImage(lay(c, 'bd.blades', W, 290, BDV.blades), 0, 790);
    // smoke rises from BEHIND the roofs: clipped to the sky
    g.save(); g.clip(BD.sky, 'evenodd'); drawSmoke(g, BDE.smoke, t, fire); g.restore();
    const boost = after >= 0 && after < 0.4 ? 1 + 0.9 * (1 - after / 0.4) : 1;
    houseLive(g, em, VB, t, Object.assign({}, st, { fire: fire * boost, blown }));
    g.save(); g.transform(MB[0], MB[1], MB[2], MB[3], MB[4], MB[5]); em.save(); em.transform(MB[0], MB[1], MB[2], MB[3], MB[4], MB[5]);
    if (blown) doorwayFire(g, em, t, fire * (after >= 0 && after < 0.4 ? 1 + (1 - after / 0.4) : 1), 1.6); else doorShut(g, em, t, fire);
    g.restore(); em.restore();
    // steps: the treads catch the doorway's fire on its own flicker
    const f = flick(t * 1.2, 30); BD.steps.forEach(s2 => { g.fillStyle = f > 0.55 ? C.fireCore : C.fireMid; g.fillRect(s2.x0 + 10, s2.y, s2.x1 - s2.x0 - 20, 3); });
    // FIREBALL: tongues bursting out of the doorway and the kitchen window, F12's ink mass collapsing over them
    if (after >= 0 && after < 0.7) fireball(g, em, after, t);
    inkPlume(g, em, s);
    // the door: through the air, then lying burning on the grass (the same door every other view shows lying there)
    if (blown) { g.save(); g.transform(MB[0], MB[1], MB[2], MB[3], MB[4], MB[5]); em.save(); em.transform(MB[0], MB[1], MB[2], MB[3], MB[4], MB[5]); doorFly(g, em, after >= 0 ? after / 0.4 : 1, t, fire); g.restore(); em.restore(); }
    // glass out of every window, landing and staying
    if (after >= 0 || blown) bdGlass(g, em, after >= 0 ? s : 99);
    drawEmbers(g, em, BDE.embers[0], t, fire); drawEmbers(g, em, BDE.embers[1], t, fire);
    if (after >= 0 && after < 1) sparkBurst(g, em, [BX - 40, BY], s, { n: 170, v0: 300, v1: 1300, a0: -Math.PI * 1.05, a1: -Math.PI * 0.02, life: 2.7, grav: 700, seed: 'bdburst', lw: 2.6, floor: H + 20 });
    if (st.secondBlast != null) secondBlastLive(g, em, BD.kitchen, t, st.secondBlast, 1.4, GY + 200);
  }
  function backdoorFront(c, t, st) {
    const g = c.g, b = st.blast || 0;
    if (b > 0 && b < BLAST.inv) return;
    const fr = lay(c, 'bd.front', W, 150, BDV.front);
    const after = b >= BLAST.inv ? (b - BLAST.inv) / (1 - BLAST.inv) : -1;
    if (after >= 0 && after < 0.8) {   // the grass flattens away from the blast and springs back
      const sh = 0.55 * Math.exp(-after * 5) * Math.cos(after * 26), Y0 = 930, BX = BD.BX;
      [[0, BX, -1], [BX, W, 1]].forEach(([x0, x1, sgn]) => { g.save(); g.beginPath(); g.rect(x0, Y0 - 160, x1 - x0, 400); g.clip(); g.transform(1, 0, sgn * sh, 1, -sgn * sh * H, 0); g.drawImage(fr, 0, Y0); g.restore(); });
    } else g.drawImage(fr, 0, 930);
  }

  // ======================= the generic view pipeline =======================
  function norm(st, view) {
    const o = Object.assign({}, DEF, view === 'backdoor' ? { fire: 0, curtain: 1 } : (V[view] || {}).def || {}, st || {});
    if (o.curtain == null) o.curtain = ((V[view] || {}).def || {}).curtain == null ? 1 : V[view].def.curtain;
    return o;
  }
  function glowLive(g, G, t, k) {   // big and hard-edged: driven by the low-passed noise so it breathes, never jitters
    const f = flickA(t, 3), r = G.r * (0.94 + 0.08 * f) * (0.6 + 0.4 * k), p = S().ellipse(G.x, G.y, r, r * G.sy, G.rot || 0).path(3, G.seed || 9);
    g.fillStyle = G.col; g.fill(p); g.save(); g.strokeStyle = O.ditherPattern(g, G.under); g.lineWidth = 5; g.stroke(p); g.restore();
  }
  // the blown door lying on the lawn, burning (every HM view; 'backdoor' draws its own flight and landing)
  function lyingLive(g, em, v, t, st) {
    if (st.blown === false) return; const m = v.m;
    g.save(); g.transform(m[0], m[1], m[2], m[3], m[4], m[5]); em.save(); em.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    doorFly(g, em, 1, t, st.fire); g.restore(); em.restore();
  }
  // optional profiler: set SETS.yard._prof = {} and read the accumulated ms per section
  function P(name, fn) { const pr = SETS.yard && SETS.yard._prof; if (!pr) return fn(); const t0 = performance.now(); const r = fn(); pr[name] = (pr[name] || 0) + performance.now() - t0; return r; }
  function back(c, t, st, view) {
    view = view || 'scott'; st = norm(st, view);
    if (view === 'backdoor') return backdoorBack(c, t, st);
    const v = V[view]; if (!v) { FL() && FL().warn('yard: no view ' + view); return; }
    const g = c.g, em = c.em, fire = st.fire;
    P('bg', () => g.drawImage(lay(c, view + '.bg', W, H, v.bg), 0, 0));
    if (v.glow) P('glow', () => glowLive(g, v.glow, t, fire));
    if (v.smoke) P('smoke', () => {
      const o = v.smoke.o;
      if (o.bank) { g.drawImage(lay(c, view + '.bank', W, H, o.bank), 0, 0); drawSmoke(g, v.smoke, t, fire); }   // billows over the bank, fading into it
      else { drawSmoke(g, v.smoke, t, fire); if (v.smoke.live < 1) g.drawImage(lay(c, view + '.smokeB', W, H, gg => drawSmokeBaked(gg, v.smoke)), 0, 0); }
    });
    P('mid', () => g.drawImage(lay(c, view + '.mid', W, H, v.mid), 0, 0));
    P('house', () => houseLive(g, em, v, t, st));
    if (v.lawnLive) P('lawn', () => v.lawnLive(g, em, t, st));
    if (!v.noLying) P('lying', () => lyingLive(g, em, v, t, st));
    if (st.strobe > 0.005 && v.gaps) P('strobe', () => strobeLive(g, em, v, t, st.strobe));
    if (v.blades) P('blades', () => g.drawImage(lay(c, view + '.blades', W, v.blades.h, v.blades.draw), 0, v.blades.y0));
    if (st.secondBlast != null) P('second', () => secondBlastLive(g, em, v.kitchen, t, st.secondBlast, v.m[0] / 0.95, v.ground + 30));
    P('embers', () => (v.embers || []).forEach(E => drawEmbers(g, em, E, t, fire)));
  }
  function front(c, t, st, view) {
    view = view || 'scott'; st = norm(st, view); const g = c.g, em = c.em;
    if (view === 'backdoor') backdoorFront(c, t, st);
    else { const v = V[view]; if (v && v.front) g.drawImage(lay(c, view + '.front', W, v.front.h, v.front.draw), 0, v.front.y0); }
    if (st.dim > 0.001) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = sat(st.dim); g.fillStyle = C.ink; g.fillRect(0, 0, W, H); g.restore();
      em.save(); em.setTransform(1, 0, 0, 1, 0, 0); em.globalCompositeOperation = 'destination-out'; em.globalAlpha = sat(st.dim); em.fillRect(0, 0, W / 4, H / 4); em.restore();
    }
  }

  // ======================= public helpers =======================
  // pt (optional [x, y], world): the direction is then from that point toward the light, so the rim swings as a figure moves past it
  function lightAt(view, t, st, pt) {
    st = norm(st, view); const f = flick(t, 3);
    const aim = L => { if (pt) { let dx = L.x - pt[0], dy = L.y - pt[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; if (dy > -0.15) dy = -0.15; L.dx = dx; L.dy = dy; } return L; };
    if (view === 'backdoor') {
      const b = st.blast || 0, kw = BD.kitchenWindow, kf = flareLv(st.kitchenFlare || 0);
      if (b > 0 && b < BLAST.inv) return aim({ x: BD.BX, y: BD.BY, dx: 1, dy: -0.6, color: C.blastWhite, rimW: 6, k: 1 });
      if (b >= BLAST.inv || st.fire >= 0.5) return aim({ x: BD.BX, y: 560, dx: 0, dy: -1, color: f > 0.55 ? RIM : C.fireMid, rimW: 3.5 + 1.5 * f, k: f });
      if (kf) return aim({ x: kw[0], y: kw[1], dx: -0.5, dy: -0.8, color: FLARE[kf], rimW: 2 + kf, k: 1 });
      if (st.doorOpen > 0.05) return aim({ x: BD.BX - 20, y: 600, dx: 0, dy: -1, color: C.hood, rimW: 2 + 2 * sat(st.doorOpen * 2), k: 1 });
      return aim({ x: kw[0], y: kw[1], dx: -0.5, dy: -0.8, color: C.hoodMid, rimW: 2, k: 1 });
    }
    const L = (V[view] || V.scott).light;
    return aim({ x: L.x, y: L.y, dx: L.dx, dy: L.dy, color: f > 0.58 ? RIM : C.fireMid, rimW: (3.4 + 1.6 * f) * (0.5 + 0.5 * st.fire), k: f });
  }
  function figStyle(view, t, st, pt) {
    st = norm(st, view); const b = view === 'backdoor' ? (st.blast || 0) : 0;
    if (b > 0 && b < BLAST.white) return { fill: C.ink, rimColor: null, rimW: 0, light: { dx: 1, dy: -0.6 }, phase: 'white' };
    if (b >= BLAST.white && b < BLAST.inv) return { fill: C.fireCore, rimColor: C.ink, rimW: 5, light: { dx: 1, dy: -0.6 }, phase: 'negative', echoes: [C.fireOuter, C.fireMid] };
    const L = lightAt(view, t, st, pt); return { fill: C.ink, rimColor: L.color, rimW: L.rimW, light: { dx: L.dx, dy: L.dy }, lightPt: [L.x, L.y], phase: b > 0 && b < 1 ? 'aftermath' : 'normal' };
  }
  function shakeAt(t, st) {
    st = st || {}; let a = 0; const b = st.blast || 0;
    if (b > 0 && b < 1) a = 18 * Math.pow(1 - b, 2.2);
    if (st.secondBlast != null && t >= st.secondBlast) a = Math.max(a, 6 * Math.exp(-(t - st.secondBlast) * 2.2));
    if (a < 0.05) return { dx: 0, dy: 0, a: 0 };
    const F = FL(), s = F && F.shake ? F.shake(t, a, 9, 41) : { dx: 0, dy: 0 }; return { dx: s.dx, dy: s.dy, a };
  }
  function camera(c, view, t, st, cam) {
    const cams = (Y.cams[view] || {}); let k = cam;
    if (typeof cam === 'string') k = cams[cam]; k = Object.assign({ x: W / 2, y: H / 2, zoom: 1 }, cams.wide || {}, k || {});
    const sh = shakeAt(t, st), z = Math.max(1, k.zoom || 1) * (1 + sh.a * 2.6 / H), hx = W / 2 / z, hy = H / 2 / z;   // never show past the world's edge
    c.camera({ x: clamp(k.x, hx, W - hx), y: clamp(k.y, hy, H - hy), zoom: z, rot: k.rot || 0, dx: (k.dx || 0) + sh.dx, dy: (k.dy || 0) + sh.dy });
  }
  function blastAt(t, t0) { if (t < t0) return 0; return Math.min(1, (t - t0) / BLAST.dur + 1e-6); }
  function doorHandle(a) { const L = bdDoorLeaf(a || 0); return bilin(L.quad, 0.89, 0.535); }

  // ======================= the burn-through and the burning mattes (screen space) =======================
  // A burning edge is not a neon line: along it the paper is char in places and glowing in others, and the glowing spots crawl.
  // heat level per edge point: 0 = char + outer only, 1 = + fireMid, 2 = + the fireCore line
  function hotLv(x, y, t, seed, bias) { const n = O.vnoise(x * 0.0085 + t * 0.22, y * 0.004 + seed, 77) + (bias || 0); return n > 0.64 ? 2 : n > 0.5 ? 1 : 0; }
  // polylines -> one Path2D per band, holding only the runs at or above each level
  function bandPaths(lines, closed, minLv) {
    const out = [new Path2D(), new Path2D(), new Path2D()];
    lines.forEach(L => {
      const n = L.pts.length, m = closed ? n : n - 1;
      for (let lv = 0; lv < 3; lv++) {
        let on = false; const P = out[lv];
        for (let i = 0; i < m; i++) {
          const a = L.pts[i], b = L.pts[(i + 1) % n], ok = Math.min(L.lv[i], L.lv[(i + 1) % n]) >= Math.max(lv, minLv || 0);
          if (ok) { if (!on) { P.moveTo(a[0], a[1]); on = true; } P.lineTo(b[0], b[1]); } else on = false;
        }
      }
    });
    return out;
  }
  function burnEdgeSparks(g, pts, t, n, seed, up) {
    if (!pts.length) return; const r = O.rng(seed), P = new Path2D(), Q = new Path2D();
    for (let i = 0; i < n; i++) {
      const p = pts[Math.floor(r() * pts.length)], life = 0.6 + r() * 0.9, u = frac(t / life + r()), x = p[0] + (r() - 0.5) * 30 + Math.sin(t * 4 + i) * 6 * u, y = p[1] - (20 + 90 * r()) * u * (p.up || up || 1), l = 3 + r() * 7, a = -1.2 + r() * 0.6;
      const T = r() < 0.5 ? P : Q; T.moveTo(x, y); T.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    g.save(); g.lineCap = 'round'; g.lineWidth = 2.2; g.strokeStyle = C.fireCore; g.stroke(P); g.strokeStyle = C.fireMid; g.stroke(Q); g.restore();
  }
  // an organic burn hole: two octaves of noise on the radius (periodic in the angle), small rag on top
  function blobPts(x, y, r, sx, n, sd, i) {
    const pts = []; n = Math.max(n, Math.round(r * 0.5));
    for (let j = 0; j < n; j++) {
      const a = j / n * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
      const q = r * (0.62 + 0.55 * O.vnoise(ca * 1.1 + i * 3.7, sa * 1.1, sd + 9) + 0.22 * (O.vnoise(ca * 3.2 + i, sa * 3.2, sd + 2) - 0.5)) + (O.vnoise(j * 1.9, i, sd) - 0.5) * Math.min(6, r * 0.25);
      pts.push([x + ca * q * sx, y + sa * q]);
    }
    return pts;
  }
  // the opening: a wide lens with slow lobes (top and bottom differ), satellite burns bulging (and overhanging) its edge, and pinholes
  // that open on their own, char-ringed islands, until the main burn reaches them
  function btHoles(k, cx, cy, seed, t) {
    const holes = [], kw = smooth(k / 0.42), kh = Math.pow(sat((k - 0.05) / 0.95), 1.35);
    const rx = 30 + kw * 1450 + 320 * smooth((k - 0.7) / 0.3), ry = 3 + 10 * sat(k / 0.06) + kh * 560 + 760 * smooth((k - 0.7) / 0.3);
    const top = [], bot = [], step = i => 7 + 8 * O.vnoise(i * 0.7, 3, seed), floor = lerp(0.42, 0.85, smooth((k - 0.72) / 0.24));
    const edgeY = (x, sgn) => {
      const dx = (x - cx) / rx, env = Math.sqrt(Math.max(0, 1 - dx * dx)), sd = sgn < 0 ? seed : seed + 13;
      const lobes = (O.fbm(x * 0.0017 + 3.1, sgn, sd, 3) - 0.5) * 1.15, mid = (O.fbm(x * 0.0062, 4 + sgn, sd + 5, 3) - 0.5) * 0.32, rag = (O.vnoise(x * 0.06, 6 + sgn, sd) - 0.5) * 12 * Math.min(1, env * 3);
      return cy + sgn * Math.max(1, ry * Math.pow(env, 0.62) * Math.max(floor, 1 + 0.85 * lobes + mid) * (sgn > 0 ? 0.88 : 1) + rag * env);
    };
    for (let x = cx - rx, i = 0; x <= cx + rx; x += step(i), i++) { top.push([x, edgeY(x, -1)]); bot.push([x, edgeY(x, 1)]); }
    top.push([cx + rx, cy]); bot.push([cx + rx, cy]);
    holes.push({ pts: top.concat(bot.slice().reverse()), main: true });
    // satellites riding the edge: they bulge out and fold back over themselves (the overhangs a y(x) edge cannot make)
    const r = O.rng('bt-sat' + seed);
    for (let i = 0; i < 9; i++) {
      const u = (r() - 0.5) * 1.5, sgn = r() < 0.55 ? -1 : 1, k0 = 0.08 + r() * 0.45, x = cx + u * rx * 0.85, ey = edgeY(x, sgn), g0 = smooth((k - k0) / 0.3);
      const rad = (20 + 52 * r()) * g0 * (0.45 + 0.9 * kh); if (rad < 3) continue;
      holes.push({ pts: blobPts(x + (r() - 0.5) * rad, ey + sgn * rad * (0.35 + 0.4 * r()), rad, 1.15 + 0.4 * r(), 20, seed, i), sat: true });
    }
    // islands: pinholes ahead of the burn, each with its own char ring
    const ri = O.rng('bt-pin' + seed);
    for (let i = 0; i < 6; i++) {
      const px = cx + (ri() - 0.5) * 1300, py = cy + (ri() < 0.5 ? -1 : 1) * (90 + ri() * 260), k0 = 0.1 + ri() * 0.4;
      const rad = (5 + 16 * ri()) * smooth((k - k0) / 0.25) * (1 + 2.2 * sat((k - k0 - 0.25) / 0.5)); if (rad < 1.5) continue;
      holes.push({ pts: blobPts(px, py, rad, 1.3, 16, seed + 4, i), island: true });
    }
    holes.forEach(h => { h.lv = h.pts.map(p => hotLv(p[0], p[1], t, seed, h.island ? 0.12 : h.sat ? 0.06 : 0)); });
    return holes;
  }
  // the black frame burning open (k 0 = black .. 1 = gone), cut straight into c.g: the paper is the frame minus the UNION of the holes,
  // made by intersecting even-odd clips (holes whose boxes do not touch share one clip, so a frame needs 3 or 4). No offscreen canvas.
  function holeGroups(holes) {
    const groups = [];
    holes.forEach(h => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; h.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      h.bb = [x0 - 2, y0 - 2, x1 + 2, y1 + 2]; h.path = polyP(h.pts);
      const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      let G = groups.find(G => G.every(o => !hit(o.bb, h.bb))); if (!G) groups.push(G = []); G.push(h);
    });
    return groups.map(G => { const p = new Path2D(); p.rect(-40, -40, W + 80, H + 80); G.forEach(h => p.addPath(h.path)); return p; });
  }
  function burnThrough(c, k, o) {
    o = o || {}; k = sat(k); if (k >= 1) return;
    const g = c.g, em = c.em, cx = o.x == null ? 900 : o.x, cy = o.y == null ? 470 : o.y, seed = o.seed || 5, t = o.t == null ? (c.lt || 0) : o.t;
    const holes = k > 0.001 ? btHoles(k, cx, cy, seed, t) : [], clips = holeGroups(holes), B = holes.length ? bandPaths(holes, true) : null;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); clips.forEach(p => g.clip(p, 'evenodd'));
    g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
    if (B) {   // the char and the burning bands, on the paper side only (the clip keeps them off the holes, so merged holes leave no seams)
      const all = new Path2D(); holes.forEach(h => all.addPath(h.path)); g.lineJoin = 'miter'; g.miterLimit = 2; g.lineCap = 'butt';
      g.strokeStyle = CHAR; g.lineWidth = 34; g.stroke(all);
      g.strokeStyle = C.fireOuter; g.lineWidth = 15; g.stroke(B[0]);
      g.strokeStyle = C.fireMid; g.lineWidth = 8; g.stroke(B[1]);
      g.strokeStyle = C.fireCore; g.lineWidth = 3.5; g.stroke(B[2]);
    }
    g.restore();
    if (B) { const sp = []; holes.forEach(h => { if (!h.sat) h.pts.forEach((q, i) => { if (h.lv[i] >= 1) sp.push(q); }); }); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); burnEdgeSparks(g, sp, t, 70, 'bt' + seed); g.restore(); }
    // the bloom: none through the paper; the HOT runs glow on the paper side
    em.save(); em.setTransform(0.25, 0, 0, 0.25, 0, 0); clips.forEach(p => em.clip(p, 'evenodd'));
    em.globalCompositeOperation = 'destination-out'; em.fillRect(0, 0, W, H); em.globalCompositeOperation = 'source-over';
    if (B) { em.strokeStyle = C.fireMid; em.lineWidth = 30; em.lineJoin = 'round'; em.stroke(B[1]); }
    em.restore();
  }
  // a strip of matte peeling off the burning edge and curling over: it narrows and foreshortens toward its free end, and past the
  // turn of the curl its lighter underside shows; every edge of it is burning
  const PAPER_UNDER = mix(C.matte, C.ash, 0.34), PAPER_TURN = mix(C.matte, C.ash, 0.2);
  function curlFlap(g, em, x0, y0, ang, len, w0, curl, sd, sgn) {
    const N = 14, c = [], wd = [], side = [];
    let x = x0, y = y0, a = ang;
    for (let i = 0; i <= N; i++) {
      const u = i / N, phi = Math.PI * 0.92 * smooth((u - 0.38) / 0.62), cs = Math.cos(phi);
      c.push([x, y]); wd.push(w0 * (1 - 0.4 * u) * Math.max(0.1, Math.abs(cs)) * (1 + (O.vnoise(u * 7, 2, sd) - 0.5) * 0.3)); side.push(cs >= 0 ? 0 : 1);
      const ds = len / N * (1 - 0.45 * smooth((u - 0.4) / 0.6)); a = ang + curl * Math.pow(u, 2.4); x += Math.cos(a) * ds; y += Math.sin(a) * ds;
    }
    const quad = (i, extra) => {
      const p0 = c[i], p1 = c[i + 1], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const w0q = (wd[i] + extra) * sgn, w1q = (wd[i + 1] + extra) * sgn, e = extra * sgn;   // the strip hangs off one side of its spine
      return [[p0[0] - nx * e, p0[1] - ny * e], [p1[0] - nx * e, p1[1] - ny * e], [p1[0] + nx * w1q, p1[1] + ny * w1q], [p0[0] + nx * w0q, p0[1] + ny * w0q]];
    };
    const outer = new Path2D(), mid = new Path2D(), top = new Path2D(), under = new Path2D();
    for (let i = 0; i < N; i++) {
      outer.addPath(polyP(quad(i, 3.2))); mid.addPath(polyP(quad(i, 1.6)));
      (side[i] ? under : top).addPath(polyP(quad(i, 0)));
    }
    g.fillStyle = C.fireCore; g.fill(outer); g.fillStyle = C.fireOuter; g.fill(mid);
    g.fillStyle = C.matte; g.fill(top); g.fillStyle = PAPER_UNDER; g.fill(under);
    // the turn of the curl catches a little light
    const it = side.indexOf(1); if (it > 0) { g.fillStyle = PAPER_TURN; g.fill(polyP(quad(Math.max(0, it - 1), 0))); }
    em.fillStyle = C.fireMid; em.fill(outer);
  }
  // The letterbox mattes burn away like paper (k 0 = intact matte at `aspect` .. 1 = gone). The burn STARTS at ignition points near
  // the blast (o.x, default the back door 1330) and spreads; intact paper has a clean, unlit edge. Drawn straight onto c.g with
  // even-odd paths (no offscreen canvases).
  function burnMattes(c, k, aspect, o) {
    o = o || {}; k = sat(k); aspect = aspect || 2.76; if (k >= 1) return;
    const bar = Math.round((H - W / aspect) / 2); if (bar <= 0) return;
    const g = c.g, em = c.em, seed = o.seed || 31, t = o.t == null ? (c.lt || 0) : o.t, xb = o.x == null ? BD.BX : o.x;
    const ign = [[[xb, 0], [xb - 760, 0.14], [xb + 420, 0.3]], [[xb - 70, 0.02], [xb - 1050, 0.2], [xb + 520, 0.34]]];
    const sides = [true, false].map((top, si) => {
      const sd = top ? seed : seed + 16, pts = [], lv = [], dd = [];
      for (let x = -12, i = 0; x <= W + 12; x += 5 + 4 * O.vnoise(i * 0.5, 1, sd), i++) {
        const n = O.fbm(x * 0.0042, top ? 1.3 : 7.7, sd, 4);
        let d = 0; ign[si].forEach(([xi, k0]) => { d = Math.max(d, 3.0 * (k - k0) - 0.09 - Math.abs(x - xi) / 1500 * (0.7 + 0.6 * n)); }); d = sat(d);
        const on = smooth(d / 0.04), rag = ((O.vnoise(x * 0.05, top ? 3 : 9, sd) - 0.5) * 12 + Math.max(0, O.vnoise(x * 0.018, 2, sd + 5) - 0.5) * 70 * smooth(d / 0.3)) * on;
        const e = clamp(bar * (1 - d) - rag, -14, bar);
        pts.push([x, top ? e : H - e]); dd.push(d);
        lv.push(d <= 0.002 ? -1 : d < 0.2 ? Math.max(1, hotLv(x, si * 300, t, sd, 0.12)) : hotLv(x, si * 300, t, sd, d > 0.85 ? -0.15 : 0));
      }
      return { top, pts, lv, dd, up: top ? -1 : 1 };
    });
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    // holes burning through what is left of the paper: they open first near the ignition, each with a char ring
    const hr = O.rng('mholes' + seed), blobs = [];
    for (let i = 0; i < 18; i++) {
      const si = i % 2, top = si === 0, x = 60 + hr() * (W - 120), v = 0.22 + hr() * 0.5, near = Math.min(...ign[si].map(([xi, k0]) => k0 + Math.abs(x - xi) / 1500 * 0.6));
      const k0 = near + 0.04 + hr() * 0.12, rmax = 5 + hr() * 16, r = rmax * smooth((k - k0) / 0.3) * (1 + 2.5 * sat((k - k0 - 0.3) / 0.4));
      if (r < 1) continue; const S2 = sides[si], j = S2.pts.findIndex(q => q[0] >= x), ey = top ? S2.pts[Math.max(0, j)][1] : H - S2.pts[Math.max(0, j)][1];
      const y0 = bar * v; if (y0 + r * 2.2 + 20 > ey || y0 < r * 1.5) continue;   // eaten by the front already, or off the paper
      blobs.push({ pts: blobPts(x, top ? y0 : H - y0, r, 1.5, 11, seed, i), x, y: top ? y0 : H - y0 });
    }
    // the paper, with its holes (even-odd)
    const paper = new Path2D();
    sides.forEach(S2 => { const reg = S2.top ? [[-20, -20]].concat(S2.pts, [[W + 20, -20]]) : [[-20, H + 20]].concat(S2.pts, [[W + 20, H + 20]]); paper.addPath(polyP(reg)); });
    blobs.forEach(bl => paper.addPath(polyP(bl.pts)));
    g.fillStyle = C.matte; g.fill(paper, 'evenodd');
    // char bands inside the burning front, as filled strips that taper to nothing where the paper is still whole
    [[18, CHAR, -1], [9, C.fireOuter, 0], [4.5, C.fireMid, 1]].forEach(([w, col, need]) => {
      const P = new Path2D();
      sides.forEach(S2 => {
        let run = [];
        const flush = () => { if (run.length > 1) { const inner = run.map(i => { const q = S2.pts[i], ww = w * smooth(S2.dd[i] / 0.05) * (S2.lv[i] >= need ? 1 : 0.15); return [q[0], q[1] + S2.up * ww]; }); P.addPath(polyP(run.map(i => S2.pts[i]).concat(inner.reverse()))); } run = []; };
        S2.pts.forEach((q, i) => { if (S2.dd[i] > 0.002) run.push(i); else flush(); }); flush();
      });
      g.fillStyle = col; g.fill(P);
    });
    blobs.forEach(bl => [[2.0, CHAR], [1.45, C.fireOuter], [1.2, C.fireMid], [1.08, C.fireCore]].forEach(([s, col]) => {
      const ring = new Path2D(); ring.addPath(polyP(bl.pts.map(q => [bl.x + (q[0] - bl.x) * s, bl.y + (q[1] - bl.y) * s]))); ring.addPath(polyP(bl.pts)); g.fillStyle = col; g.fill(ring, 'evenodd'); }));
    // the glowing line only where the front is hot
    const hot = bandPaths(sides, false, 2)[2];
    g.strokeStyle = C.fireCore; g.lineWidth = 2.6; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(hot);
    // a strip of each matte peeling into the frame, curling over as it burns
    sides.forEach((S2, ti) => {
      const v = smooth((k - 0.1) / 0.4) * (1 - smooth((k - 0.55) / 0.3)); if (v < 0.02) return;
      const top = S2.top, fx = top ? xb + 40 : xb - 900, j = S2.pts.findIndex(q => q[0] >= fx), q = S2.pts[Math.max(0, j)];
      if (S2.dd[Math.max(0, j)] < 0.05) return;
      const len = (top ? 300 : 250) * (0.45 + 0.55 * v) * (1 - 0.45 * sat((k - 0.42) / 0.4)), sway = 0.12 * Math.sin(t * 2.3 + ti * 2) + 0.06 * Math.sin(t * 5.1 + ti);
      curlFlap(g, em, q[0], q[1], (top ? 1 : -1) * (1.12 - 0.3 * v + sway), len, top ? 52 : 44, (top ? -1 : 1) * (1.5 + 1.2 * v), seed + ti, top ? -1 : 1);
    });
    { const sr = O.rng('scraps' + seed);
      for (let i = 0; i < 8; i++) {
        const top = i % 2 === 0, k0 = 0.1 + sr() * 0.4, u = sat((k - k0) / 0.5); if (u <= 0 || u >= 1) continue;
        const x = xb + (sr() - 0.5) * 1500 + (sr() - 0.5) * 200 * u, d = bar * (0.4 + 0.6 * sr()) + 260 * u * (0.5 + sr()), y = top ? d : H - d, s = (7 + sr() * 13) * (1 - 0.7 * u), rot = sr() * 6 + u * 5;
        const ps = []; for (let j = 0; j < 6; j++) { const a = rot + j / 6 * 6.283, qq = s * (0.5 + 0.7 * O.vnoise(j, i, 3)); ps.push([x + Math.cos(a) * qq * 1.6, y + Math.sin(a) * qq * 0.6]); }
        const sp = S().poly(ps); g.fillStyle = C.fireCore; g.fill(sp.scale(1.25, 1.4, x, y).path(1, 160 + i)); g.fillStyle = (i >> 1) % 2 ? PAPER_UNDER : C.matte; g.fill(sp.path(1, 170 + i));
      } }
    const sp = []; sides.forEach(S2 => S2.pts.forEach((q, i) => { if (S2.lv[i] >= 1) sp.push(Object.assign([q[0], q[1]], { up: S2.up })); }));
    burnEdgeSparks(g, sp, t, 90, 'bm' + seed);
    g.restore();
    // the bloom must not shine through the paper; then the hot runs glow
    em.save(); em.setTransform(0.25, 0, 0, 0.25, 0, 0); em.globalCompositeOperation = 'destination-out'; em.fill(paper, 'evenodd'); em.globalCompositeOperation = 'source-over';
    const B = bandPaths(sides, false, 1); em.strokeStyle = C.fireMid; em.lineWidth = 22; em.lineJoin = 'round'; em.stroke(B[1]); em.restore();
  }

  // ======================= the set =======================
  const Y = SETS.yard = {
    views: ['house', 'scott', 'ending', 'backdoor', 'fence', 'hands'],
    defaults: Object.fromEntries(['house', 'scott', 'ending', 'fence', 'hands', 'backdoor'].map(k => [k, norm({}, k)])),
    BLAST, STROBE_HZ,
    draw(c, t, state, view) { back(c, t, state, view); front(c, t, state, view); },
    back, front, camera, shakeAt, lightAt, figStyle, blastAt, doorHandle, burnThrough, burnMattes,
    flicker: flick,
    fx: {
      flame(c, x, y, w, h, seed, t) { O.flame(c.g, x, y, w, h, seed || 7, t || 0); c.em.fillStyle = C.fireMid; c.em.fillRect(x - w / 2, y - h, w, h); },
      tongue(c, x, y, w, h, ang, seed, t) { tongue(c.g, x, y, w, h, ang || 0, seed || 7, t || 0, FIRE3); c.em.save(); c.em.translate(x, y); c.em.rotate(ang || 0); c.em.fillStyle = C.fireMid; c.em.fillRect(-w / 2, -h, w, h); c.em.restore(); },
      sparks(c, p, u, o) { sparkBurst(c.g, c.em, p, u, Object.assign({ n: 60, v0: 120, v1: 520, life: 2, grav: 500, seed: 'fx' }, o || {})); },
    },
    phone: C.phoneWhite,
    cams: Object.assign(Object.fromEntries(Object.keys(V).map(k => [k, V[k].cams])), {
      backdoor: { wide: { x: 960, y: 540, zoom: 1 }, steps: { x: 1120, y: 630, zoom: 1.2 }, door: { x: 1258, y: 600, zoom: 1.45 }, yard: { x: 900, y: 600, zoom: 1.1 } } }),
    light: Object.assign(Object.fromEntries(Object.keys(V).map(k => [k, Object.assign({ color: C.fireMid, hot: RIM }, V[k].light)])),
      { backdoor: { x: BD.BX, y: 560, color: C.fireMid, hot: RIM, night: { x: BD.kitchenWindow[0], y: BD.kitchenWindow[1], color: C.hoodMid, open: { x: BD.BX - 20, y: 600, color: C.hood } } } }),
    anchors: Object.assign(Object.fromEntries(Object.keys(V).map(k => [k, Object.assign({ kitchen: V[k].kitchen }, V[k].anchors)])), {
      backdoor: { ground: BD.GY, door: Object.assign({ hinge: 'left', swings: 'in' }, BD.door), handle: BD.handle, blast: [BD.BX, BD.BY],
        steps: BD.steps.map(s => ({ k: s.k, y: s.y, x0: s.x0, x1: s.x1 })),   // k 0 = the top step at the door sill (y 700) .. 3 = the bottom one (y 775); each 25 high
        figScale: 27,                                                  // px per head for a figure at the house (on the steps, in the doorway)
        figAt: y => 27 * Math.max(0.2, (y - 614) / 186),                // px per head for a figure whose feet are on the lawn at y (>= 800)
        pull: { feet: [1424, 700], scale: 27, facing: -1 },           // standing on the top step right of the door, reaching back for the handle
        seat: { hip: [1150, 893], scale: 42, facing: -1, ground: 905 }, // down on the lawn where the blast throws him (the landing)
        landing: BD.landing, doorLands: BD.doorLands, kitchenWindow: BD.kitchenWindow, kitchen: BD.kitchen, fire: [BD.BX, 560] },
      phone: C.phoneWhite,
    }),
  };

  // ======================= demos (node tools/set.js yard 1) =======================
  const fig = O.fig;
  // a placeholder figure, filled and rimmed exactly as figStyle says (pt: the figure's centre, so the rim faces the light)
  function ph(c, shape, view, t, st, pt) { const s = figStyle(view, t, st, pt); const p = shape.path(0.8, 11); c.g.fillStyle = s.fill; c.g.fill(p); if (s.rimColor) O.silhouette(c.g, p, { fill: 'rgba(0,0,0,0)', light: s.light, rimColor: s.rimColor, rimW: s.rimW, rimSoft: true }); }
  function phScott(c, view, t, st) {
    const a = (Y.anchors[view] || {}).seat; if (!a) return;
    if (view === 'scott') ph(c, fig.profile('scott', { x: a.hip[0], y: a.hip[1], scale: a.scale, facing: -1, anchor: 'hip', lean: -0.12, neck: 0.3, legN: { a: 2.5, b: 2.13 }, legF: { a: 2.42, b: 2.0 }, armN: { a: 0.3, b: 2.5, hand: 'hold' }, armF: { a: -0.75, b: 0.15, hand: 'flat' } }).shape, view, t, st, a.hip);
    if (view === 'house') ph(c, fig.profile('scott', { x: a.hip[0], y: a.hip[1], scale: a.scale, facing: -1, anchor: 'hip', lean: 0.1, legN: { a: 2.0, b: 2.1 }, legF: { a: 1.85, b: 1.95 }, armN: { a: 0.62, b: 2.45, hand: 'hold' }, armF: { a: -0.55, b: 0.25, hand: 'flat' } }).shape, view, t, st, a.hip);
    if (view === 'ending') ph(c, fig.profile('scott', { x: a.hip[0], y: a.hip[1], scale: a.scale, facing: -1, anchor: 'hip', lean: 0.05, legN: { a: 2.2, b: 2.2 }, legF: { a: 2.0, b: 2.0 }, armN: { a: 0.5, b: 2.5, hand: 'hold' }, armF: { a: -0.5, b: 0.2, hand: 'flat' } }).shape, view, t, st, a.hip);
  }
  const TB = 11;   // the boom in the backdoor demos (demo-local seconds)
  const demos = [
    { name: 'house: burn-through opening (k = t/4)', draw(c, t) { const st = { curtain: 0.05, strobe: 0.2 }; back(c, t, st, 'house'); front(c, t, st, 'house'); burnThrough(c, t / 4, { t }); } },
    { name: 'house: wide, curtain lifting', t0: 2, draw(c, t) { const st = { curtain: 0.12 * t, strobe: 0.2 }; back(c, t, st, 'house'); front(c, t, st, 'house'); } },
    { name: 'house: curtain burns away, glass breaks', t0: 6, draw(c, t) { const st = { curtain: 0.5 + 0.13 * (t - 6), glassBreak: 6.9 }; camera(c, 'house', t, st, 'push'); back(c, t, st, 'house'); front(c, t, st, 'house'); } },
    { name: 'house: Q12 roof gone, strobe, window collapses', t0: 10, draw(c, t) { const st = { curtain: 1, roof: 1, strobe: 0.5, windowCollapse: 10.75 }; back(c, t, st, 'house'); phScott(c, 'house', t, st); front(c, t, st, 'house'); } },
    { name: 'scott: F02 medium (placeholder Scott)', t0: 3, draw(c, t) { const st = { curtain: 0.45, strobe: 0.2, glassBreak: 3.7 }; back(c, t, st, 'scott'); phScott(c, 'scott', t, st); front(c, t, st, 'scott'); } },
    { name: 'scott: empty plate, strobe 0.5', t0: 20, draw(c, t) { const st = { curtain: 0.45, strobe: 0.5 }; back(c, t, st, 'scott'); front(c, t, st, 'scott'); } },
    { name: 'ending: F13 (placeholder), handGlow 1', t0: 4, draw(c, t) { const st = { strobe: 0.5, handGlow: 1 }; back(c, t, st, 'ending'); phScott(c, 'ending', t, st); front(c, t, st, 'ending'); } },
    { name: 'backdoor: night, door open', t0: 1, draw(c, t) { const st = { fire: 0, doorOpen: 0.75 }; back(c, t, st, 'backdoor'); front(c, t, st, 'backdoor'); } },
    { name: 'backdoor: on the top step, pulling the door shut', t0: 1, draw(c, t) {
      const st = { fire: 0, doorOpen: 0.12 }, A = Y.anchors.backdoor.pull, h = doorHandle(st.doorOpen); camera(c, 'backdoor', t, st, 'steps'); back(c, t, st, 'backdoor');
      ph(c, fig.profile('scott', { x: A.feet[0], y: A.feet[1], scale: A.scale, facing: A.facing, anchor: 'feet', lean: 0.12, armN: { to: h, hand: 'grip' }, armF: { a: -0.3, b: 0.6 }, legN: { a: 0.12, b: 0.1 }, legF: { a: -0.14, b: 0.22 } }).shape, 'backdoor', t, st, [A.feet[0], A.feet[1] - 4 * A.scale]);
      front(c, t, st, 'backdoor'); } },
    { name: 'backdoor: kitchenFlare (the 3 frames before the white)', t0: TB - 1.1, draw(c, t) { const st = { fire: 0, kitchenFlare: FL().seg(t, TB - 0.2, TB - 0.05) }; back(c, t, st, 'backdoor'); front(c, t, st, 'backdoor'); } },
    { name: 'backdoor: blast white (frame 1)', t0: TB - 1, draw(c, t) { const st = { blast: blastAt(t, TB - 1 / 24), fire: 0 }; camera(c, 'backdoor', t, st); back(c, t, st, 'backdoor'); front(c, t, st, 'backdoor'); } },
    { name: 'backdoor: negative (frame 5) + mattes', t0: TB - 1, letterbox: 1.7778, draw(c, t) { const st = { blast: blastAt(t, TB - 4.2 / 24), fire: 0 }; camera(c, 'backdoor', t, st); back(c, t, st, 'backdoor'); ph(c, fig.profile('scott', { x: 0, y: 0, scale: 86, facing: 1, anchor: 'hip', lean: -0.7, neck: 0.25, head: 0.3, armN: { a: 2.42, b: 0.3, hand: 'splay' }, armF: { a: 1.72, b: 0.18, hand: 'open' }, legN: { a: 2.1, b: 0.6 }, legF: { a: 1.0, b: 1.5 } }).shape.rotate(-0.68).translate(745, 560), 'backdoor', t, st); front(c, t, st, 'backdoor'); burnMattes(c, 0.3, 2.76, { t }); } },
    { name: 'backdoor: aftermath +0.15 s (ink plume, heat front)', t0: TB - 1, draw(c, t) { const tb = TB - 0.15 - BLAST.inv * BLAST.dur, st = { blast: blastAt(t, tb), fire: 0.8 }; camera(c, 'backdoor', t, st); back(c, t, st, 'backdoor'); front(c, t, st, 'backdoor'); burnMattes(c, FL().seg(t, tb + 4 / 24, tb + 1.6), 2.76, { t }); } },
    { name: 'backdoor: aftermath +0.8 s (stripes cooling, door in the air)', t0: TB - 1, draw(c, t) { const tb = TB - 0.8 - BLAST.inv * BLAST.dur, st = { blast: blastAt(t, tb), fire: 0.8 }; camera(c, 'backdoor', t, st); back(c, t, st, 'backdoor'); front(c, t, st, 'backdoor'); burnMattes(c, FL().seg(t, tb + 4 / 24, tb + 1.6), 2.76, { t }); } },
    { name: 'backdoor: burning (after), seat on the lawn', t0: TB - 1, draw(c, t) { const st = { blast: 1, fire: 0.9 }, a = Y.anchors.backdoor.seat; back(c, t, st, 'backdoor'); ph(c, fig.profile('scott', { x: a.hip[0], y: a.hip[1], scale: a.scale, facing: 1, anchor: 'hip', lean: -0.2, legN: { a: 1.5, b: 0.3 }, legF: { a: 1.3, b: 0.6 }, armN: { a: -0.6, b: 0.2, hand: 'flat' }, armF: { a: -0.4, b: 0.3, hand: 'flat' } }).shape, 'backdoor', t, st, a.hip); front(c, t, st, 'backdoor'); } },
    { name: 'fence: crawl, house burning', t0: 3, draw(c, t) { const st = {}; back(c, t, st, 'fence'); const a = Y.anchors.fence.crawlAt(0.55); ph(c, fig.profile('scott', { x: a[0], y: a[1] - 1.75 * a[2], scale: a[2], facing: -1, anchor: 'hip', lean: 1.35, neck: -0.5, head: -0.4, armN: { a: 0.25, b: 0.1, hand: 'flat' }, armF: { a: -0.1, b: 0.2, hand: 'flat' }, legN: { a: 0.15, b: 1.6 }, legF: { a: -0.1, b: 1.5 } }).shape, 'fence', t, st, [a[0], a[1] - 2 * a[2]]); front(c, t, st, 'fence'); } },
    { name: 'fence: second blast +0.6 s', t0: 3, draw(c, t) { const st = { secondBlast: 3.4, fire: 0.9 }; camera(c, 'fence', t, st); back(c, t, st, 'fence'); front(c, t, st, 'fence'); } },
    { name: 'hands: the last light (placeholder clasp)', t0: 3, draw(c, t) {
      const st = { handGlow: 1, strobe: 0.5 }; back(c, t, st, 'hands');
      const a = Y.anchors.hands.clasp, L = Y.anchors.hands.handLen;
      c.g.fillStyle = C.ink; c.g.fill(S().capsule(a[0] - 520, a[1] + 90, 46, a[0] - 0.55 * L, a[1] + 10, 38).add(fig.hand('flat', { spread: 0.05 }).transform([L, 0.05 * L, -0.05 * L * 0.6, L * 0.6, a[0] - 0.6 * L, a[1]])).path(0.8, 3));
      c.f.knockout(fig.hand('flat', { spread: 0.05 }).transform([-L, 0.05 * L, 0.05 * L * 0.6, L * 0.6, a[0] + 0.62 * L, a[1] - 6]).path(0.6, 4), 1);
      front(c, t, st, 'hands'); } },
    { name: 'hands: dim 0.7', t0: 3, draw(c, t) { const st = { handGlow: 1, strobe: 0.5, dim: 0.7 }; back(c, t, st, 'hands'); front(c, t, st, 'hands'); } },
  ];
  Y.demos = demos;
  Y._int = { btHoles, bandPaths, hotLv };   // (debug)
  Y._V = V; Y._BD = BD;
})(window);
