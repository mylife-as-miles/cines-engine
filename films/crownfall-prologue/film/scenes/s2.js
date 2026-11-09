/* Scene 2: The Unsworn [L11–L17, A02].
   Sive runs the servants' passage by torchlight with the bundle; the unsworn cord at her wrist; a door onto the burning
   city; a long run through streets of fire; the lower gate, where a guard lifts the blanket, sees the swords coming down
   the stairs, and swings the gate open ("Bleanda!"); from outside, through the bars, he falls as it closes. Four nights
   north; dawn over the fells and the poor hold of Ealdholt; Edda at the hearth with the child; Sive's answer; and the
   register by candlelight, where Edda writes Cael, and beside it, parentage: unknown.
   Every shot is keyed to the cues (and the pauses inside the takes). Shared helpers come from scene 1 (SCENES[1].lib). */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;
  let L = null;   // scene 1's helpers, taken at the first draw
  const at = (id, f) => { const c = K.cue(id); return lerp(c.start, c.end, f); };

  // ================================================================ Sive: a grey hooded cloak, the bundle at her breast
  const SIVE_DARK = '#141416', WOOL = '#3c3a38';
  function sive(cc, o, fill, pass) { return L.person(cc, Object.assign({ dress: 'cloak', hat: 'hood', hold: 'bundle', fill, fill2: pass === 0 ? o.rimWool || '#e8d8c0' : WOOL }, o)); }

  // ================================================================ L11: the servants' passage by torchlight
  const PAS = { len: 4200, floor: 900 };
  function passageImg() {
    return K.cached('s2:passage', () => {
      const c = K.canvas(PAS.len, H + 200), x = c.getContext('2d'), r = rng(2101);
      x.fillStyle = '#17110d'; x.fillRect(0, 0, c.width, c.height);
      for (let row = 0; row * 58 < PAS.floor + 100; row++) for (let X = -((row % 2) * 60); X < c.width; X += 120 + r() * 40) { const v = r() * 16; x.fillStyle = `rgb(${34 + v | 0},${26 + v | 0},${20 + v | 0})`; x.fillRect(X + 3, row * 58 + 3, 114 + r() * 20, 52); }
      x.globalCompositeOperation = 'multiply'; for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(30,20,14,${0.15 + r() * 0.3})`; x.beginPath(); x.ellipse(r() * c.width, r() * PAS.floor, 8 + r() * 50, 4 + r() * 24, r() * 3, 0, TAU); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      // recessed arches along the wall, and the vault's ribs
      for (let k = 0; k < 7; k++) { const ax = 300 + k * 600; x.fillStyle = '#0c0806'; x.beginPath(); x.moveTo(ax - 120, PAS.floor); x.lineTo(ax - 120, 420); x.quadraticCurveTo(ax - 120, 280, ax, 260); x.quadraticCurveTo(ax + 120, 280, ax + 120, 420); x.lineTo(ax + 120, PAS.floor); x.closePath(); x.fill(); x.fillStyle = '#22180f'; x.fillRect(ax - 140, 240, 280, 18); }
      x.fillStyle = '#0a0705'; x.fillRect(0, 0, c.width, 120); for (let k = 0; k < 14; k++) { x.beginPath(); x.moveTo(k * 300 - 60, 120); x.quadraticCurveTo(k * 300 + 150, 230, k * 300 + 360, 120); x.lineTo(k * 300 + 360, 100); x.lineTo(k * 300 - 60, 100); x.closePath(); x.fill(); }
      // the floor: flags, worn
      const g = x.createLinearGradient(0, PAS.floor, 0, c.height); g.addColorStop(0, '#2a2018'); g.addColorStop(1, '#0c0806'); x.fillStyle = g; x.fillRect(0, PAS.floor, c.width, c.height - PAS.floor);
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; for (let k = 0; k < 5; k++) { const y = PAS.floor + 20 + k * k * 18; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke(); }
      // torch brackets between the arches
      for (let k = 0; k < 7; k++) { const tx = 600 + k * 600; x.fillStyle = '#0a0806'; x.fillRect(tx - 6, 470, 12, 90); x.fillRect(tx - 18, 556, 36, 10); }
      return c;
    });
  }
  function shotPassage(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), camX = lerp(0, 1700, u), [hx, hy] = K.shake(t * 2.2, 7, 2102);
    const c = { x: camX + hx, y: hy, z: 1.08 };
    const S = passageImg(), sx = camX + 980 + 90 * Math.sin(lt * 0.8);
    L.view(x, c, 1); x.drawImage(S, -400, -100);
    // the torches: flame, glow on the wall, pools on the floor
    for (let k = 0; k < 7; k++) {
      const tx = -400 + 600 + k * 600, fl = L.flick(t, k + 2, 11);
      if (tx < camX - 300 || tx > camX + W + 300) continue;
      L.glow(x, [255, 140, 60], tx, 450, 420 * fl, 0.32); L.fire(x, tx, 470, 34, 90 * fl, t, k + 4, { n: 5, slot: 'p' + (k % 3) });
      x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(tx, PAS.floor - 80, 10, tx, PAS.floor - 80, 360); g.addColorStop(0, 'rgba(255,150,70,0.18)'); g.addColorStop(1, 'rgba(255,150,70,0)'); x.fillStyle = g; x.fillRect(tx - 400, PAS.floor - 120, 800, 400); x.restore();
    }
    // her shadow thrown long along the wall by the torch behind her
    const near = Math.round((sx + 400 - 600) / 600) * 600 + 600 - 400 - 600, dxs = sx - near;
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.5; x.translate(sx + dxs * 0.6, PAS.floor - 10); x.transform(1, 0, -0.25 * Math.sign(dxs), 1, 0, 0); x.scale(1.3, 1.1); sive(x, { x: 0, y: 0, h: 560, face: 1, walk: lt * 9, run: 1, t }, '#2a1a10', 1); x.restore();
    // Sive running, the bundle held close
    L.rimLit(x, (cc, fill, pass) => sive(cc, { x: sx, y: PAS.floor + 40, h: 560, face: 1, walk: lt * 9, run: 1, t }, fill, pass), { rim: '#ffb070', mid: '#5a3018', dark: SIVE_DARK, dx: dxs > 0 ? -5 : 5, dy: 2 });
    // pillars close to the lens sweep past
    L.view(x, c, 1.6);
    for (let k = 0; k < 6; k++) { const px = 200 + k * 900; x.fillStyle = '#050403'; x.fillRect(px, -200, 150, H + 400); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(x, t, { kind: 'dust', n: 30, alpha: 0.3, seed: 2103 });
    L.finish(x, { bloom: 0.4, vig: 0.72, warm: '#a0602a', warmA: 0.06 });
  }
  // the unsworn cord: her hand knotted in the wool, a plain grey cord at her wrist
  function shotCord(x, t, sh) {
    const lt = t - sh.a, [hx, hy] = K.shake(t * 3, 12, 2111), u = span(t, sh.a, sh.b);
    const c = { x: hx + lerp(-190, -150, u), y: hy + lerp(30, 45, u), z: lerp(1.35, 1.5, ease(u)) };
    x.fillStyle = '#060404'; x.fillRect(0, 0, W, H);
    // torches passing behind, out of focus
    for (let k = 0; k < 4; k++) { const px = ((k * 700 - lt * 1400) % 2800 + 2800) % 2800 - 400; L.glow(x, [255, 150, 70], px, 260 + k * 30, 260, 0.35); }
    L.view(x, c, 1);
    // the bundle, filling the lower frame
    const pat = x.createPattern(L.woolTex(), 'repeat');
    x.save(); x.beginPath(); x.ellipse(1050, 900, 900, 520, -0.12, 0, TAU); x.fillStyle = pat; x.fill(); x.clip();
    for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.moveTo(300 + k * 380, 1400); x.bezierCurveTo(400 + k * 380, 900, 600 + k * 380, 600, 800 + k * 380, 380); x.lineTo(840 + k * 380, 380); x.bezierCurveTo(640 + k * 380, 600, 440 + k * 380, 900, 340 + k * 380, 1400); x.closePath(); x.fill(); }
    x.restore();
    // her forearm in the grey cloak sleeve
    x.fillStyle = '#1e1e20'; x.beginPath(); x.moveTo(-100, 420); x.bezierCurveTo(200, 400, 420, 430, 600, 470); x.lineTo(600, 700); x.bezierCurveTo(400, 700, 150, 740, -100, 780); x.closePath(); x.fill();
    // the hand, gripping the wool, fingers to the right: the back of it and its tendons, four fingers each its own, the
    // knuckles catching the torch, the thumb along the top; the fingertips sink into the cloth
    const sk = [134, 106, 90], skl = L.mix(sk, [255, 226, 196], 0.3), skd = L.mix(sk, [20, 12, 8], 0.55), gap = 'rgba(16,8,6,0.9)';
    const shade = (y0, y1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, L.rgbs(skl)); g.addColorStop(0.55, L.rgbs(sk)); g.addColorStop(1, L.rgbs(skd)); return g; };
    const KN = [[902, 476, 48, 100], [918, 540, 50, 96], [920, 604, 46, 88], [906, 664, 40, 74]];
    // the thumb, along the top of the grip
    x.fillStyle = gap; L.taper(x, [[640, 486], [760, 432], [856, 414]], 54, 42); x.fillStyle = shade(400, 500); L.taper(x, [[640, 486], [760, 432], [856, 414]], 48, 37);
    x.fillStyle = 'rgba(230,200,180,0.5)'; x.beginPath(); x.ellipse(842, 410, 13, 9, -0.2, 0, TAU); x.fill();
    // the back of the hand and the wrist
    x.fillStyle = shade(450, 700); x.beginPath(); x.moveTo(560, 486); x.bezierCurveTo(680, 470, 800, 452, 900, 452); x.bezierCurveTo(936, 500, 944, 620, 918, 690); x.bezierCurveTo(820, 704, 700, 700, 560, 690); x.closePath(); x.fill();
    x.strokeStyle = L.rgbs(L.mix(skl, [255, 240, 220], 0.3), 0.35); x.lineWidth = 3; for (const [kx, ky] of KN) { x.beginPath(); x.moveTo(680, (ky - 480) * 0.45 + 540); x.quadraticCurveTo(800, (ky - 480) * 0.8 + 500, kx - 18, ky); x.stroke(); }
    // the fingers, each outlined, curling down at their ends into the wool
    for (const [kx, ky, fw, fl] of KN) {
      const pts = [[kx - 16, ky], [kx + fl * 0.6, ky + 4], [kx + fl, ky + 16]];
      x.fillStyle = gap; L.taper(x, pts, fw + 6, fw * 0.85 + 6); x.fillStyle = shade(ky - fw / 2, ky + fw / 2); L.taper(x, pts, fw, fw * 0.85);
      x.fillStyle = L.rgbs(skd, 0.6); x.beginPath(); x.ellipse(kx + fl * 0.55, ky + 4, 4, fw * 0.32, 0, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,232,206,0.38)'; x.beginPath(); x.ellipse(kx - 2, ky - fw * 0.2, 15, 9, 0.2, 0, TAU); x.fill();
    }
    // the wool takes the fingertips
    x.save(); x.beginPath(); x.ellipse(1050, 900, 900, 520, -0.12, 0, TAU); x.clip();
    x.beginPath(); x.moveTo(1010, 300); x.bezierCurveTo(1060, 470, 1040, 600, 1000, 760); x.lineTo(1500, 860); x.lineTo(1500, 300); x.closePath(); x.fillStyle = pat; x.fill(); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 8; x.beginPath(); x.moveTo(1010, 300); x.bezierCurveTo(1060, 470, 1040, 600, 1000, 760); x.stroke(); x.restore();
    // the unsworn cord: plain grey, twice about the wrist, knotted on its back, the two ends hanging
    const cord = (pts, w) => { x.fillStyle = '#1a1816'; L.taper(x, pts, w + 5, w + 5); x.fillStyle = '#66635c'; L.taper(x, pts, w, w); x.strokeStyle = 'rgba(16,16,16,0.7)'; x.lineWidth = 2.4; for (let i = 1; i < pts.length - 1; i++) { const p0 = pts[i]; x.beginPath(); x.moveTo(p0[0] - w * 0.45, p0[1] - w * 0.25); x.lineTo(p0[0] + w * 0.45, p0[1] + w * 0.25); x.stroke(); } x.strokeStyle = 'rgba(236,230,214,0.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(pts[0][0] + w * 0.25, pts[0][1]); for (const q of pts) x.lineTo(q[0] + w * 0.25, q[1]); x.stroke(); };
    for (const x0 of [574, 616]) cord(K.resample(K.bez([[x0, 476], [x0 + 26, 540], [x0 + 26, 630], [x0 + 4, 696]], 14), 7), 22);
    // the knot: two turns of an overhand, plain
    for (const [kx, ky, rr] of [[588, 566, 26], [610, 586, 24]]) { x.fillStyle = '#1a1816'; x.beginPath(); x.ellipse(kx, ky, rr + 3, rr * 0.85 + 3, 0.5, 0, TAU); x.fill(); x.fillStyle = '#66635c'; x.beginPath(); x.ellipse(kx, ky, rr, rr * 0.85, 0.5, 0, TAU); x.fill(); x.strokeStyle = 'rgba(16,16,16,0.75)'; x.lineWidth = 3; x.beginPath(); x.arc(kx, ky, rr * 0.55, 0.6, 3.9); x.stroke(); x.strokeStyle = 'rgba(236,230,214,0.4)'; x.beginPath(); x.arc(kx - 3, ky - 3, rr * 0.8, 3.6, 4.6); x.stroke(); }
    const sw = Math.sin(lt * 7) * 0.15; cord([[596, 600], [580 + sw * 40, 680], [570 + sw * 70, 770]], 15); cord([[614, 606], [634 + sw * 30, 690], [646 + sw * 50, 762]], 14);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // torchlight passing over
    const fl = L.flick(t, 5, 10), lx = lerp(1700, 200, ((lt * 0.7) % 1));
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(lx, 200, 80, lx, 400, 1500); g.addColorStop(0, `rgb(255,${210 * fl | 0},${150 * fl | 0})`); g.addColorStop(0.5, 'rgb(150,100,72)'); g.addColorStop(1, 'rgb(20,14,10)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    L.finish(x, { bloom: 0.3, vig: 0.75 });
  }
  // a door at the passage's end: she looks back once, and goes out into the red
  function shotDoor(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), open = easeOut(span(t, sh.a + 1.0, sh.a + 1.7)), look = win(t, sh.a, sh.a + 1.1, 0.25, 0.3);
    const c = { x: lerp(0, 40, u), y: 0, z: lerp(1.05, 1.15, ease(u)) };
    L.view(x, c, 1);
    x.fillStyle = '#120c09'; x.fillRect(-100, -100, W + 200, H + 200);
    const dx0 = 820, dx1 = 1120, dtop = 260, dy = 900;
    // the doorway: the burning city beyond as it opens
    x.save(); x.beginPath(); x.moveTo(dx0, dy); x.lineTo(dx0, dtop + 120); x.quadraticCurveTo(dx0, dtop, (dx0 + dx1) / 2, dtop - 20); x.quadraticCurveTo(dx1, dtop, dx1, dtop + 120); x.lineTo(dx1, dy); x.closePath(); x.clip();
    const fl = L.flick(t, 3, 4), g = x.createLinearGradient(0, dtop, 0, dy); g.addColorStop(0, `rgb(${120 + 60 * fl | 0},40,20)`); g.addColorStop(1, `rgb(${255 * fl | 0},${150 * fl | 0},70)`); x.fillStyle = g; x.fillRect(dx0, dtop - 40, dx1 - dx0, dy - dtop + 40);
    K.smoke(x, t, { n: 6, x: dx0 - 100, y: dtop - 100, w: 500, h: 600, color: [60, 24, 14], alpha: 0.6, rise: 40, size: 200, seed: 2121 });
    // the door leaf swinging in
    const lw = (dx1 - dx0) * (1 - open * 0.85);
    x.fillStyle = '#2a1c12'; x.fillRect(dx0, dtop - 40, lw, dy - dtop + 40); x.fillStyle = '#140c08'; for (let k = 1; k < 5; k++) x.fillRect(dx0 + lw * k / 5, dtop - 40, 4, dy - dtop + 40); x.fillRect(dx0, dtop + 120, lw, 12); x.fillRect(dx0, dy - 160, lw, 12);
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = open; const fg = x.createLinearGradient(0, dy, 0, H + 100); fg.addColorStop(0, 'rgba(255,140,60,0.35)'); fg.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = fg; x.beginPath(); x.moveTo(dx0, dy); x.lineTo(dx1, dy); x.lineTo(dx1 + 300, H + 100); x.lineTo(dx0 - 300, H + 100); x.closePath(); x.fill(); x.restore();
    L.glow(x, [255, 140, 60], (dx0 + dx1) / 2, dy - 200, 700, 0.3 * (0.2 + open));
    // Sive: she stops, looks back over her shoulder, then goes
    const go = easeIn(span(t, sh.a + 1.5, sh.b + 0.3)), sx = lerp(700, 1050, go), sh2 = lerp(620, 560, go);
    L.rimLit(x, (cc, fill, pass) => sive(cc, { x: sx, y: 960 - go * 40, h: sh2, face: look > 0.5 ? -1 : 1, walk: go > 0 ? lt * 8 : undefined, run: go, tilt: look * 0.1, lean: look * 0.1, t }, fill, pass), { rim: '#ffb070', mid: '#5a3018', dark: SIVE_DARK, dx: -4, dy: 2 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    L.finish(x, { bloom: 0.45, vig: 0.75, warm: '#a0502a', warmA: 0.07 });
  }

  // ================================================================ L12: through the burning streets
  // a row of timber-framed houses along the street: steep gables at different heights, jettied upper storeys, leaning
  // chimneys, burnt-through roofs. Returns the canvas and where the fire breaks out (windows and roofs), in its pixels.
  // o: y0 (the street line), s (scale), far (a dark silhouette row, only edged by the glow)
  function streetRow(key, seed, o) {
    return K.cached('s2:srow:' + key, () => {
      const c = K.canvas(5400, 1200), x = c.getContext('2d'), r = rng(seed), s = o.s, wins = [], roofs = [], chim = [];
      const plaster = o.far ? [26, 14, 10] : [84, 52, 34], timber = o.far ? '#0e0705' : '#1a0d07', roofCol = o.far ? '#120806' : '#170b07';
      for (let X = -60; X < c.width;) {
        const w = (200 + r() * 190) * s, st = 2 + (r() < (o.far ? 0.5 : 0.25) ? 1 : 0), sh = (150 + r() * 40) * s, jet = 18 * s, gable = r() < 0.7;
        let y = o.y0, left = X, right = X + w;
        const storeyBoxes = [];
        for (let k = 0; k < st; k++) { const l = left - (k ? jet : 0) * k * 0.5, rr = right + (k ? jet : 0) * k * 0.5; storeyBoxes.push([l, y - sh, rr, y]); y -= sh; }
        const top = y, tl = storeyBoxes[st - 1][0], tr = storeyBoxes[st - 1][2], ridge = gable ? top - (tr - tl) * (0.75 + r() * 0.35) : top - (tr - tl) * 0.35;
        // the facade storey by storey, each upper one jutting out over the one below
        for (let k = 0; k < st; k++) {
          const [l, t0, rr, b0] = storeyBoxes[k], lit = o.far ? 0 : 0.6 + r() * 0.4;
          const g = x.createLinearGradient(0, b0, 0, t0); g.addColorStop(0, L.rgbs(L.mix(plaster, [140, 80, 40], lit * 0.4))); g.addColorStop(1, L.rgbs(L.mix(plaster, [10, 6, 4], 0.35))); x.fillStyle = g; x.fillRect(l, t0, rr - l, b0 - t0);
          if (!o.far) {
            x.fillStyle = timber; const bw = 9 * s;
            x.fillRect(l, t0, bw, b0 - t0); x.fillRect(rr - bw, t0, bw, b0 - t0); x.fillRect(l, b0 - bw, rr - l, bw); x.fillRect(l - 4 * s, t0, rr - l + 8 * s, bw * 1.4);
            const np = 2 + Math.floor((rr - l) / (110 * s));
            for (let p = 1; p < np; p++) { const px = lerp(l, rr, p / np); x.fillRect(px - bw / 2, t0, bw, b0 - t0); if (r() < 0.6) { x.save(); x.lineWidth = bw * 0.8; x.strokeStyle = timber; x.beginPath(); const dir = r() < 0.5; x.moveTo(px, dir ? b0 : t0); x.lineTo(lerp(l, rr, (p - 0.5) / np), dir ? t0 + (b0 - t0) * 0.4 : b0 - (b0 - t0) * 0.4); x.stroke(); x.restore(); } }
            // the jetty's shadow on the storey below
            if (k > 0) { const sg = x.createLinearGradient(0, b0, 0, b0 + 40 * s); sg.addColorStop(0, 'rgba(0,0,0,0.6)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sg; x.fillRect(l, b0, rr - l, 40 * s); }
          }
          // windows: some dark, some full of fire (the flames come out of them each frame)
          const nw = 1 + Math.floor((rr - l) / (120 * s));
          for (let q = 0; q < nw; q++) {
            const wx = lerp(l, rr, (q + 0.5) / nw), ww = (30 + r() * 14) * s, wh = (44 + r() * 16) * s, wy = t0 + (b0 - t0) * 0.32, burn = r() < (o.far ? 0.3 : 0.32);
            if (burn) { const fg = x.createLinearGradient(0, wy, 0, wy + wh); fg.addColorStop(0, '#ffcf70'); fg.addColorStop(1, '#e05a18'); x.fillStyle = fg; x.fillRect(wx - ww / 2, wy, ww, wh); if (!o.far) { const sg = x.createLinearGradient(0, wy - 80 * s, 0, wy); sg.addColorStop(0, 'rgba(10,4,2,0)'); sg.addColorStop(1, 'rgba(10,4,2,0.75)'); x.fillStyle = sg; x.fillRect(wx - ww, wy - 80 * s, ww * 2, 80 * s); } wins.push([wx, wy, ww, 0.6 + r() * 1.1]); }
            else { x.fillStyle = '#080403'; x.fillRect(wx - ww / 2, wy, ww, wh); }
            if (!o.far) { x.fillStyle = timber; x.fillRect(wx - ww / 2 - 4 * s, wy + wh, ww + 8 * s, 6 * s); x.fillRect(wx - 2 * s, wy, 4 * s, wh); }
          }
        }
        // the roof: a steep gable to the street, or a long eave; some burnt through to the rafters
        x.fillStyle = roofCol; x.beginPath();
        if (gable) { x.moveTo(tl - 14 * s, top + 4); x.lineTo((tl + tr) / 2, ridge); x.lineTo(tr + 14 * s, top + 4); }
        else { x.moveTo(tl - 20 * s, top + 4); x.lineTo(tl + (tr - tl) * 0.18, ridge); x.lineTo(tr - (tr - tl) * 0.18, ridge); x.lineTo(tr + 20 * s, top + 4); }
        x.closePath(); x.fill();
        if (!o.far) { x.strokeStyle = 'rgba(255,140,60,0.35)'; x.lineWidth = 2; x.beginPath(); if (gable) { x.moveTo(tl - 14 * s, top + 4); x.lineTo((tl + tr) / 2, ridge); x.lineTo(tr + 14 * s, top + 4); } else { x.moveTo(tl - 20 * s, top + 4); x.lineTo(tl + (tr - tl) * 0.18, ridge); x.lineTo(tr - (tr - tl) * 0.18, ridge); x.lineTo(tr + 20 * s, top + 4); } x.stroke(); }
        if (r() < 0.45) {
          // a hole burnt through: the rafters against the fire inside
          const hx = lerp(tl, tr, 0.35 + r() * 0.3), hy = lerp(top, ridge, 0.45), hw = (tr - tl) * 0.28;
          x.fillStyle = '#ff9a3a'; x.beginPath(); x.moveTo(hx - hw / 2, hy + 30 * s); x.lineTo(hx - hw * 0.3, hy - 30 * s); x.lineTo(hx + hw * 0.4, hy - 20 * s); x.lineTo(hx + hw / 2, hy + 34 * s); x.closePath(); x.fill();
          x.strokeStyle = '#120806'; x.lineWidth = 6 * s; for (let k = 0; k < 4; k++) { const rx = hx - hw / 2 + k * hw / 3; x.beginPath(); x.moveTo(rx, hy + 40 * s); x.lineTo(rx + 20 * s, hy - 40 * s); x.stroke(); }
          roofs.push([hx, hy, hw]);
        } else if (r() < 0.5) roofs.push([lerp(tl, tr, 0.3 + r() * 0.4), lerp(top, ridge, 0.3), (tr - tl) * 0.5]);
        // a chimney, often leaning
        if (r() < 0.6) { const cx = lerp(tl, tr, r() < 0.5 ? 0.25 : 0.72), cy = lerp(top, ridge, 0.55), lean = (r() - 0.5) * 0.3; x.save(); x.translate(cx, cy); x.rotate(lean); x.fillStyle = roofCol; x.fillRect(-14 * s, -130 * s, 28 * s, 140 * s); x.fillRect(-20 * s, -138 * s, 40 * s, 14 * s); x.restore(); chim.push([cx + Math.sin(lean) * 130 * s, cy - 136 * s]); }
        x.fillStyle = o.far ? '#0a0504' : '#0c0604'; x.fillRect(left - 30, o.y0, w + 60, 1200 - o.y0);
        X = right + (r() < 0.3 ? 30 * s : 4);
      }
      c.wins = wins; c.roofs = roofs; c.chim = chim; return c;
    });
  }
  // a tall tower far back in the smoke: square, buttressed, an open belfry and a spire (no sign on it)
  function farTower(x, X, Y, s) {
    x.fillStyle = '#0c0606'; x.fillRect(X - 60 * s, Y - 620 * s, 120 * s, 620 * s); x.fillRect(X - 74 * s, Y - 660 * s, 148 * s, 50 * s);
    x.beginPath(); x.moveTo(X - 80 * s, Y - 660 * s); x.lineTo(X, Y - 980 * s); x.lineTo(X + 80 * s, Y - 660 * s); x.closePath(); x.fill();
    for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(X + sd * 60 * s, Y - 300 * s); x.lineTo(X + sd * 110 * s, Y); x.lineTo(X + sd * 60 * s, Y); x.closePath(); x.fill(); }
    x.fillStyle = 'rgba(255,120,50,0.55)'; for (const ox of [-30, 12]) { x.beginPath(); x.moveTo(X + ox * s, Y - 560 * s); x.lineTo(X + ox * s, Y - 520 * s + 0); x.lineTo(X + (ox + 18) * s, Y - 520 * s); x.lineTo(X + (ox + 18) * s, Y - 560 * s); x.quadraticCurveTo(X + (ox + 9) * s, Y - 590 * s, X + ox * s, Y - 560 * s); x.fill(); }
  }
  // a beam that gives way: it swings down from the eaves, burning, and strikes the street in sparks
  function fallingBeam(x, t, t0, X, Y, len, seed) {
    if (t < t0 - 0.8) return; const k = easeIn(span(t, t0, t0 + 0.7)), ang = lerp(0.32, 1.3, k) + Math.sin(t * 9) * 0.02 * (1 - k), drop = k * k * 260, hit = t - (t0 + 0.7);
    x.save(); x.translate(X, Y + drop); x.rotate(ang); x.fillStyle = '#0a0503'; x.fillRect(0, -16, len, 32); x.restore();
    const ex = X + Math.cos(ang) * len * 0.6, ey = Y + drop + Math.sin(ang) * len * 0.6;
    L.flame(x, ex, ey, 70, t, seed, 1); L.flame(x, X + Math.cos(ang) * len * 0.25, Y + drop + Math.sin(ang) * len * 0.25, 50, t, seed + 3, 0.9);
    if (hit > 0 && hit < 1.2) { const rr = rng(seed + 9); x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const a = -Math.PI * rr(), sp = 200 + rr() * 500, px = ex + Math.cos(a) * sp * hit, py = ey + Math.sin(a) * sp * hit + 400 * hit * hit; x.fillStyle = `rgba(255,${180 + rr() * 60 | 0},90,${1 - hit / 1.2})`; x.fillRect(px, py, 3, 3); } x.restore(); }
  }
  function shotStreets(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), camX = lerp(0, 1500, u), [hx, hy] = K.shake(t * 2, 6, 2131);
    const c = { x: camX + hx, y: hy, z: 1.04 };
    const inView = (sx, d, m = 300) => sx > c.x * d - m && sx < c.x * d + W + m;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#140806'); g.addColorStop(0.55, '#6a2a12'); g.addColorStop(1, '#1a0c08'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    L.view(x, c, 0.12); K.smoke(x, t, { n: 14, x: -200, y: -300, w: W + 600, h: 800, color: [70, 30, 20], alpha: 0.5, rise: 26, size: 420, seed: 2132 });
    // far back in the smoke: the tower, and a First-Born wheeling over the fires
    L.view(x, c, 0.2); farTower(x, 1450, 640, 1.05); L.glow(x, [255, 110, 40], 1450, 380, 460, 0.2);
    L.fog(x, 2139, [110, 46, 24], 120, 420, t * 30, 0.5);
    L.view(x, c, 0.26);
    const bp = span(t, sh.a - 0.5, sh.b + 1.5); L.rimLit(x, (cc, fill) => L.beastBelow(cc, { x: lerp(2600, -400, bp), y: 120, s: 220, rot: Math.PI - 0.1, flap: Math.sin(t * 3), col: fill, t }), { rim: '#ff7030', mid: '#4a1808', dark: '#0c0505', dx: 0, dy: -4, steps: 2 });
    // the far row: silhouettes edged by the glow, fire in their roofs
    const far = streetRow('far', 2133, { y0: 640, s: 0.72, far: true });
    L.view(x, c, 0.45); x.drawImage(far, -300, 0);
    let nf = 0;
    for (const [rx, ry, rw] of far.roofs) { const sx = rx - 300; if (!inView(sx, 0.45) || nf > 5) continue; nf++; L.fire(x, sx, ry + 10, rw * 0.8, rw * 1.3, t, rx, { n: 6, slot: 'sf' + (nf % 4) }); L.glow(x, [255, 110, 40], sx, ry - 60, rw * 2, 0.3); }
    for (const [wx, wy, ww, big] of far.wins) { const sx = wx - 300; if (!inView(sx, 0.45, 60)) continue; x.save(); x.translate(sx, wy + 6); x.scale(0.55, 1); L.flame(x, 0, 0, ww * big * 1.8 * (0.7 + 0.6 * K.noise(t * 2 + wx, 1, 8)), t, wx, 0.6); x.restore(); }
    L.fog(x, 2134, [90, 40, 22], 470, 300, t * 40, 0.55);
    // the near row: timber and plaster lit by its own fires; flames lick out of the windows and up the fronts
    const near = streetRow('near', 2135, { y0: 830, s: 0.88 });
    L.view(x, c, 0.75); x.drawImage(near, -400, 0);
    for (const [cx2, cy2] of near.chim) { const sx = cx2 - 400; if (!inView(sx, 0.75)) continue; K.smoke(x, t, { n: 4, x: sx - 40, y: cy2 - 360, w: 80, h: 360, color: [40, 20, 14], alpha: 0.4, rise: 30, size: 120, seed: cx2 | 0 }); }
    for (const [wx, wy, ww, big] of near.wins) { const sx = wx - 400; if (!inView(sx, 0.75, 80)) continue; const f2 = L.flick(t, wx, 9); x.save(); x.translate(sx, wy + 6); x.transform(0.5, 0, -0.1, 1, 0, 0); for (let k = 0; k < 3; k++) L.flame(x, (k - 1) * ww * 0.7, 0, ww * big * (1.2 + 1.5 * K.noise(t * 2.5 + k, wx * 0.01, 7)) * (k === 1 ? 1.35 : 0.8), t, wx + k * 3.1, k === 1 ? 0.7 : 0.55); x.restore(); L.glow(x, [255, 140, 60], sx, wy - ww * big, ww * 5 * big, 0.22 * f2); }
    nf = 0;
    for (const [rx, ry, rw] of near.roofs) { const sx = rx - 400; if (!inView(sx, 0.75) || nf > 4) continue; nf++; L.fire(x, sx, ry + 30, rw * 0.9, rw * 1.6, t, rx + 20, { n: 7, slot: 'sn' + (nf % 4) }); L.glow(x, [255, 120, 50], sx, ry - 80, rw * 2.4, 0.3); }
    // beams giving way from the eaves
    fallingBeam(x, t, sh.a + 1.1, camX * 0.75 + 1100, 360, 380, 2140);
    fallingBeam(x, t, sh.a + 3.4, camX * 0.75 + 600, 330, 320, 2141);
    // the street: people fleeing, small and dark against the fire; Sive in front, running on
    L.view(x, c, 1);
    x.fillStyle = '#140a07'; x.fillRect(-200, 880, 4000, 400);
    const ppl = K.cached('s2:flee2', () => { const r = rng(2136), o = []; for (let i = 0; i < 24; i++) o.push({ x0: r() * 3600 - 200, v: (r() < 0.6 ? -1 : 1) * (130 + r() * 150), y: 900 + r() * 50, h: 120 + r() * 60, ph: r() * 6, dress: ['cloak', 'robe', 'gown'][Math.floor(r() * 3)], hat: ['hood', 'bare', 'hair'][Math.floor(r() * 3)], child: r() < 0.1 }); return o.sort((a, b) => a.y - b.y); });
    const sx = camX + 900 + 60 * Math.sin(lt * 0.6);
    L.rimLit(x, (cc, fill) => { for (const p of ppl) { const px = p.x0 + p.v * lt; if (px < camX - 300 || px > camX + W + 300) continue; L.person(cc, { x: px, y: p.y, h: p.child ? p.h * 0.6 : p.h, child: p.child, face: Math.sign(p.v), walk: lt * 8 + p.ph, run: 0.45, dress: p.dress, hat: p.hat, fill, t, armN: [0.5, 0.9], armF: [0.4, 1.0] }); } }, { rim: '#9a5028', mid: '#3a1a0c', dark: '#080403', dx: 0, dy: 4, steps: 3 });
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(sx, 1022, 90, 14, 0, 0, TAU); x.fill();
    L.rimLit(x, (cc, fill, pass) => sive(cc, { x: sx, y: 1020, h: 340, face: 1, walk: lt * 10, run: 1, t }, fill, pass), { rim: '#ffc080', mid: '#6a3018', dark: SIVE_DARK, dx: -4, dy: 4 });
    // wreckage close to the lens
    L.view(x, c, 1.5);
    for (let k = 0; k < 4; k++) { const bx = 500 + k * 1100; x.fillStyle = '#060303'; x.save(); x.translate(bx, 1000); x.rotate(-0.4 + k * 0.3); x.fillRect(-300, -30, 600, 60); x.restore(); L.fire(x, bx + 80, 990, 120, 200, t, k + 60, { n: 5, slot: 'sb' + k }); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(x, t, { n: 80, heat: 0.9, seed: 2137 });
    K.specks(x, t, { kind: 'ash', n: 70, alpha: 0.5, wind: 40, seed: 2138 });
    L.finish(x, { bloom: 0.5, vig: 0.7, warm: '#b05020', warmA: 0.08 });
  }

  // ================================================================ L13 and A02: the lower gate
  // world: the gate's arch at the centre, the iron gate in it; stairs down the inner wall on the left
  const GATE = { x0: 760, x1: 1160, top: 300, y: 900 };
  function gateImg() {
    return K.cached('s2:gate', () => {
      const c = K.canvas(W + 400, H + 300), x = c.getContext('2d'), r = rng(2141), O = 200;
      x.translate(O, 150);
      x.fillStyle = '#1a120e'; x.fillRect(-O, -150, c.width, c.height);
      for (let row = 0; row * 64 < 1100; row++) for (let X = -O - ((row % 2) * 80); X < W + O; X += 160 + r() * 30) { const v = r() * 14; x.fillStyle = `rgb(${38 + v | 0},${30 + v | 0},${26 + v | 0})`; x.fillRect(X + 3, row * 64 - 147, 154, 58); }
      // the stair coming down the inner wall from the upper left
      x.fillStyle = '#100a07'; x.beginPath(); x.moveTo(-O, 120); x.lineTo(GATE.x0 - 60, GATE.y - 40); x.lineTo(GATE.x0 - 60, GATE.y + 40); x.lineTo(-O, 300); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,80,50,0.4)'; x.lineWidth = 3; for (let k = 0; k < 16; k++) { const u = k / 16, sx = lerp(-O, GATE.x0 - 60, u), sy = lerp(120, GATE.y - 40, u); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 50, sy); x.lineTo(sx + 50, sy + 48); x.stroke(); }
      // the gate's arch: deep, a dark passage, the night beyond
      x.fillStyle = '#0a0706'; x.beginPath(); x.moveTo(GATE.x0 - 70, GATE.y + 60); x.lineTo(GATE.x0 - 70, GATE.top + 80); x.quadraticCurveTo(GATE.x0 - 70, GATE.top - 90, (GATE.x0 + GATE.x1) / 2, GATE.top - 100); x.quadraticCurveTo(GATE.x1 + 70, GATE.top - 90, GATE.x1 + 70, GATE.top + 80); x.lineTo(GATE.x1 + 70, GATE.y + 60); x.closePath(); x.fill();
      const ng = x.createLinearGradient(0, GATE.top, 0, GATE.y); ng.addColorStop(0, '#0e1420'); ng.addColorStop(1, '#1c2232'); x.fillStyle = ng; x.beginPath(); x.moveTo(GATE.x0, GATE.y); x.lineTo(GATE.x0, GATE.top + 80); x.quadraticCurveTo(GATE.x0, GATE.top - 40, (GATE.x0 + GATE.x1) / 2, GATE.top - 50); x.quadraticCurveTo(GATE.x1, GATE.top - 40, GATE.x1, GATE.top + 80); x.lineTo(GATE.x1, GATE.y); x.closePath(); x.fill();
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(220,226,240,${r() * 0.6})`; x.fillRect(GATE.x0 + r() * (GATE.x1 - GATE.x0), GATE.top - 30 + r() * 300, 2, 2); }
      x.fillStyle = '#121620'; x.beginPath(); x.moveTo(GATE.x0, GATE.y); x.lineTo(GATE.x0, 760); for (let X = GATE.x0; X <= GATE.x1; X += 20) x.lineTo(X, 740 + 30 * Math.sin(X * 0.02)); x.lineTo(GATE.x1, GATE.y); x.closePath(); x.fill();
      x.fillStyle = '#3a2c22'; for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; x.save(); x.translate((GATE.x0 + GATE.x1) / 2 + Math.cos(a) * 270, GATE.top + 80 + Math.sin(a) * 220); x.rotate(a + Math.PI / 2); x.fillRect(-26, -18, 52, 36); x.restore(); }
      // the ground
      const gg = x.createLinearGradient(0, GATE.y, 0, 1100); gg.addColorStop(0, '#20160f'); gg.addColorStop(1, '#0a0605'); x.fillStyle = gg; x.fillRect(-O, GATE.y, W + 2 * O, 400);
      // torch brackets either side
      x.fillStyle = '#0a0705'; for (const bx of [GATE.x0 - 150, GATE.x1 + 150]) { x.fillRect(bx - 6, 470, 12, 90); x.fillRect(bx - 18, 556, 36, 10); }
      return { c, O };
    });
  }
  // the iron gate: a grille in the arch, swinging on its left hinge (open 0..1)
  function grille(x, open, col, lit) {
    const hx = GATE.x0, w = GATE.x1 - GATE.x0, sq = Math.cos(open * 1.35), skew = Math.sin(open * 1.35) * 90;
    x.save(); x.translate(hx, 0); x.transform(sq, -skew / w * sq * 0.0 + (Math.sin(open * 1.35) * 0.08), 0, 1, 0, 0);
    x.fillStyle = col;
    for (let k = 0; k <= 8; k++) { const bx = k * w / 8; x.fillRect(bx - 7, GATE.top - 20 + (k === 0 || k === 8 ? 100 : 40 * Math.abs(k - 4) / 4 * 0), 14, GATE.y - GATE.top + 20); }
    for (const by of [GATE.top + 90, 560, 740, GATE.y - 30]) x.fillRect(-6, by, w + 12, 16);
    for (let k = 0; k <= 8; k++) { const bx = k * w / 8; x.beginPath(); x.moveTo(bx - 12, GATE.y + 2); x.lineTo(bx, GATE.y + 26); x.lineTo(bx + 12, GATE.y + 2); x.fill(); }
    if (lit) { x.fillStyle = lit; for (let k = 0; k <= 8; k++) x.fillRect(k * w / 8 - 7, GATE.top + 40, 3, GATE.y - GATE.top - 40); }
    x.restore();
  }
  function gateScene(x, t, c, o = {}) {
    const S = gateImg(), fl = L.flick(t, 7, 9);
    L.view(x, c, 1); x.drawImage(S.c, -S.O, -150);
    // fire glow from the city above the stair, the torches either side
    L.glow(x, [255, 110, 40], 0, 120, 700, 0.35 * fl);
    for (const [k, bx] of [[0, GATE.x0 - 150], [1, GATE.x1 + 150]]) { const f2 = L.flick(t, k + 9, 11); L.glow(x, [255, 150, 70], bx, 450, 400 * f2, 0.3); L.fire(x, bx, 470, 36, 100 * f2, t, k + 7, { n: 5, slot: 'g' + k }); }
    grille(x, o.open || 0, '#0c0806', 'rgba(255,170,90,0.35)');
  }
  function shotGateWide(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), c = { x: lerp(-40, 0, u), y: 0, z: lerp(1.0, 1.08, ease(u)) };
    gateScene(x, t, c, { open: 0 });
    // the guard in the arch; Sive arriving from the left
    const sx = lerp(300, 560, easeOut(u));
    L.rimLit(x, (cc, fill, pass) => { L.person(cc, { x: 1020, y: 930, h: 420, face: -1, dress: 'mail', hat: 'helm', hold: 'spear', fill, bulk: 1.1 }); sive(cc, { x: sx, y: 940, h: 380, face: 1, walk: lt * 8 * (1 - u), run: 1 - u, t }, fill, pass); }, { rim: '#ffb070', mid: '#5a3018', dark: '#0c0806', dx: 3, dy: 3 });
    x.setTransform(1, 0, 0, 1, 0, 0); K.embers(x, t, { n: 30, heat: 0.6, seed: 2142 });
    L.finish(x, { bloom: 0.4, vig: 0.72, warm: '#a0602a', warmA: 0.06 });
  }
  // insert: the guard's gloved hand lifts the blanket's corner; the child within
  function shotBlanket(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), lift = ease(span(t, sh.a + 0.25, sh.a + 1.1));
    const c = { x: lerp(20, -20, u), y: 0, z: lerp(1.05, 1.13, u) };
    x.fillStyle = '#050403'; x.fillRect(0, 0, W, H);
    L.view(x, c, 1);
    x.save(); x.translate(-120, 60); L.swaddle(x, t, 1 + 0.01 * Math.sin(t * 2.6)); x.restore();
    // the flap he lifts, folding back from the opening
    const pat = x.createPattern(L.woolTex(), 'repeat');
    x.save(); x.translate(1150, 420); x.rotate(-0.4 - lift * 1.3); x.scale(1, 1 - lift * 0.4);
    x.fillStyle = pat; x.beginPath(); x.moveTo(-130, 30); x.quadraticCurveTo(-40, -110, 120, -70); x.quadraticCurveTo(150, 10, 60, 70); x.quadraticCurveTo(-40, 80, -130, 30); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fill(); x.restore();
    // his arm from above, a dark sleeve; a leather glove pinching the flap's edge
    const fa = -0.4 - lift * 1.3, ex2 = 1150 + Math.cos(fa) * 110 - Math.sin(fa) * -40, ey2 = 420 + Math.sin(fa) * 110 + Math.cos(fa) * -40 * (1 - lift * 0.4);
    x.fillStyle = '#18120e'; x.beginPath(); x.moveTo(ex2 + 20, ey2 - 30); x.bezierCurveTo(ex2 + 200, ey2 - 120, ex2 + 420, ey2 - 300, ex2 + 640, ey2 - 420); x.lineTo(ex2 + 780, ey2 - 200); x.bezierCurveTo(ex2 + 520, ey2 - 80, ex2 + 260, ey2 + 40, ex2 + 60, ey2 + 50); x.closePath(); x.fill();
    x.fillStyle = '#3a2a1e'; x.beginPath(); x.ellipse(ex2 + 70, ey2, 70, 48, -0.6, 0, TAU); x.fill();
    L.taper(x, [[ex2 + 30, ey2 - 20], [ex2 - 20, ey2 - 10], [ex2 - 40, ey2 + 10]], 30, 22); L.taper(x, [[ex2 + 40, ey2 + 26], [ex2 - 6, ey2 + 30], [ex2 - 30, ey2 + 18]], 28, 20);
    x.strokeStyle = 'rgba(255,190,120,0.35)'; x.lineWidth = 3; x.beginPath(); x.ellipse(ex2 + 70, ey2, 70, 48, -0.6, Math.PI * 1.1, Math.PI * 1.7); x.stroke();
    x.setTransform(1, 0, 0, 1, 0, 0);
    const fl = L.flick(t, 4, 10);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(1700, 200, 60, 1400, 400, 1500); g.addColorStop(0, `rgb(255,${210 * fl | 0},${150 * fl | 0})`); g.addColorStop(0.5, 'rgb(140,100,74)'); g.addColorStop(1, 'rgb(14,10,8)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    L.finish(x, { bloom: 0.3, vig: 0.78 });
  }
  // over the guard's shoulder: swords coming down the stair, blades catching the fire
  function shotStairs(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), c = { x: lerp(-520, -480, u), y: lerp(-140, -170, u), z: lerp(1.5, 1.62, ease(u)) };
    gateScene(x, t, c, { open: 0 });
    L.view(x, c, 1);
    // the soldiers on the stair, descending
    const down = lt * 70;
    const sol = [0, 1, 2, 3, 4].map(k => { const s0 = 0.1 + k * 0.17 + down / 900, sx = lerp(-200, GATE.x0 - 60, clamp(s0)), sy = lerp(120, GATE.y - 40, clamp(s0)); return { x: sx, y: sy, k }; });
    L.rimLit(x, (cc, fill) => { for (const s of sol) L.person(cc, { x: s.x, y: s.y + 6, h: 300, face: 1, dress: 'mail', hat: s.k % 2 ? 'kettle' : 'helm', hold: 'sword', bladeAng: -0.3 + s.k * 0.1, walk: lt * 6 + s.k, fill, bulk: 1.1 }); }, { rim: '#ff9a50', mid: '#5a2410', dark: '#0a0605', dx: -3, dy: 4 });
    // the blades catch the light
    for (const s of sol) { const g0 = [s.x + 50, s.y - 190 + s.k * 3]; L.glow(x, [255, 200, 140], g0[0] + 40, g0[1] - 50, 30 + 20 * Math.sin(t * 6 + s.k), 0.55); }
    // the guard: his helmed head and shoulder close in the foreground
    L.view(x, c, 1.0);
    L.rimLit(x, (cc, fill) => L.person(cc, { x: 1080, y: 1420, h: 1000, face: -1, dress: 'mail', hat: 'helm', fill, bulk: 1.2, tilt: -0.25, lean: -0.05 }), { rim: '#ffb070', mid: '#4a2810', dark: '#060403', dx: 6, dy: 3 });
    x.setTransform(1, 0, 0, 1, 0, 0); K.embers(x, t, { n: 30, heat: 0.7, seed: 2151 });
    L.finish(x, { bloom: 0.4, vig: 0.75, warm: '#a0502a', warmA: 0.06 });
  }
  // he swings the gate open: "Bleanda! Bleanda!" and she runs out into the night
  function shotGateOpen(x, t, sh) {
    const A2 = K.cue('A02'), lt = t - sh.a, u = span(t, sh.a, sh.b), open = easeOut(span(t, sh.a + 0.1, sh.a + 1.3));
    const c = { x: lerp(-20, 30, u), y: lerp(-10, 0, u), z: lerp(1.12, 1.04, ease(u)) };
    gateScene(x, t, c, { open });
    L.view(x, c, 1);
    const go = easeIn(span(t, sh.a + 0.9, A2.end)), sx = lerp(620, 1100, go), sy = lerp(940, 800, go), sz = lerp(380, 180, go);
    const shout = [A2.start, A2.start + 0.84].map(ts => win(t, ts - 0.05, ts + 0.7, 0.1, 0.4)).reduce((a, b) => Math.max(a, b), 0);
    const solIn = span(t, A2.start - 0.4, sh.b + 0.4);
    L.rimLit(x, (cc, fill, pass) => {
      // soldiers at the foot of the stair, coming on
      for (let k = 0; k < 3; k++) L.person(cc, { x: lerp(-120, 300, solIn) - k * 140, y: 920, h: 400, face: 1, dress: 'mail', hat: k % 2 ? 'kettle' : 'helm', hold: 'sword', bladeAng: -0.6, walk: lt * 8 + k, run: 0.6, fill, bulk: 1.1 });
      if (go < 1) sive(cc, { x: sx, y: sy, h: sz, face: 1, walk: lt * 9, run: 1, t }, fill, pass);
      // the guard at the gate, hauling it, then his arm flung out after her
      L.person(cc, { x: lerp(820, 760, open), y: 930, h: 430, face: shout > 0.3 ? 1 : -1, dress: 'mail', hat: 'helm', lean: shout > 0.3 ? 0.2 : -0.25, armN: shout > 0.3 ? [lerp(1.2, 2.0, shout), 0.1] : [1.5, 0.3], armF: [1.6, 0.3], tilt: -0.2 * shout, fill, bulk: 1.1 });
    }, { rim: '#ffb070', mid: '#5a3018', dark: '#0c0806', dx: 3, dy: 3 });
    x.setTransform(1, 0, 0, 1, 0, 0); K.embers(x, t, { n: 30, heat: 0.6, seed: 2161 });
    L.finish(x, { bloom: 0.4, vig: 0.72, warm: '#a0602a', warmA: 0.06 });
  }
  // from outside, through the bars: he falls as the gate closes
  function shotBars(x, t, sh) {
    const L14 = K.cue('L14'), lt = t - sh.a, u = span(t, sh.a, sh.b), shut = easeIn(span(t, sh.a, sh.a + 0.9));
    const strike = L14.start + 0.55, fall = easeIn(span(t, strike, strike + 0.6));
    const c = { x: 0, y: 0, z: lerp(1.0, 1.06, u) };
    // inside the gate: the burning city's glow, the passage
    x.fillStyle = '#060606'; x.fillRect(0, 0, W, H);
    L.view(x, c, 0.8);
    const g = x.createRadialGradient(960, 600, 40, 960, 600, 900); g.addColorStop(0, 'rgb(255,150,70)'); g.addColorStop(0.35, 'rgb(150,60,24)'); g.addColorStop(1, 'rgb(10,6,5)'); x.fillStyle = g; x.beginPath(); x.moveTo(560, 1000); x.lineTo(560, 380); x.quadraticCurveTo(560, 160, 960, 130); x.quadraticCurveTo(1360, 160, 1360, 380); x.lineTo(1360, 1000); x.closePath(); x.fill();
    K.smoke(x, t, { n: 8, x: 560, y: 100, w: 800, h: 700, color: [80, 30, 16], alpha: 0.5, rise: 30, size: 260, seed: 2171 });
    // the guard, and the soldiers reaching him: shapes against the fire
    x.fillStyle = '#060404';
    const gx = 960, gy = 900;
    L.person(x, { x: gx + fall * 40, y: gy, h: 420, face: -1, dress: 'mail', hat: 'helm', lean: fall * -0.1, armN: [0.4 + fall, 0.3], fill: '#060404', bulk: 1.1 });
    if (fall > 0) { x.save(); x.translate(gx, gy); x.rotate(-fall * 1.35); x.translate(-gx, -gy); x.restore(); }
    const arrive = easeOut(span(t, L14.start - 0.4, strike));
    for (let k = 0; k < 3; k++) L.person(x, { x: lerp(560, 760, arrive) - k * 110, y: gy, h: 430, face: 1, dress: 'mail', hat: k % 2 ? 'kettle' : 'helm', hold: 'sword', bladeAng: k === 0 ? lerp(-2.4, -0.2, easeIn(span(t, strike - 0.1, strike + 0.1))) : -0.5, armN: k === 0 ? [lerp(2.8, 1.2, easeIn(span(t, strike - 0.1, strike + 0.1))), 0.2] : undefined, walk: lt * 7 + k, fill: '#060404', bulk: 1.1 });
    // the falling guard: drawn again, tipping as he goes down
    if (fall > 0) { x.save(); x.fillStyle = '#060404'; const pv = [gx, gy]; x.translate(pv[0], pv[1]); x.rotate(-fall * 1.3); x.translate(-pv[0], -pv[1]); L.person(x, { x: gx, y: gy, h: 420, face: -1, dress: 'mail', hat: 'helm', fill: '#060404', bulk: 1.1, armN: [2.2, 0.2] }); x.restore(); }
    // the bars, close, the gate swinging shut toward us
    L.view(x, c, 1.3);
    const close = 1 - shut, sq = Math.cos(close * 1.25);
    x.save(); x.translate(380, 0); x.transform(sq, 0, 0, 1, 0, 0); x.fillStyle = '#030202';
    for (let k = 0; k <= 8; k++) x.fillRect(k * 145 - 12, -100, 24, 1300); for (const by of [150, 560, 900]) x.fillRect(-20, by, 1200, 26);
    x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    L.finish(x, { bloom: 0.45, vig: 0.8, warm: '#a0502a', warmA: 0.06 });
  }

  // ================================================================ L15: four nights north; dawn over the fells, and Ealdholt
  function nightScene(x, t, sh, kind) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), r = rng(2180 + kind);
    const c = { x: lerp(-30, 30, u), y: 0, z: lerp(1.04, 1.1, u) };
    const sky = x.createLinearGradient(0, 0, 0, H);
    if (kind === 1) { sky.addColorStop(0, '#5a6274'); sky.addColorStop(1, '#a8b0bc'); } else { sky.addColorStop(0, '#04060c'); sky.addColorStop(1, '#1a2234'); }
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    L.view(x, c, 0.2); if (kind !== 1) { for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(220,226,240,${r() * r()})`; x.fillRect(r() * W, r() * H * 0.6, 2, 2); } L.moonDisc(x, 1450, 220, 40); }
    L.view(x, c, 1);
    const scale = [1, 0.75, 0.5, 0.36][kind], sx = lerp(760, 1100, u), walk = lt * 4;
    if (kind === 0) {
      // the forest: black pines, moonlight between
      x.fillStyle = '#0a0e14'; x.fillRect(-100, 820, W + 200, 400);
      for (let k = 0; k < 18; k++) { const px = -100 + k * 130 + r() * 60, hh = 500 + r() * 400; x.fillStyle = k % 2 ? '#05070a' : '#080b10'; x.beginPath(); x.moveTo(px, 880); for (let j = 0; j <= 8; j++) { const v = j / 8; x.lineTo(px - (1 - v) * 90 - (j % 2) * 20, 880 - hh * v); } x.lineTo(px, 880 - hh - 30); for (let j = 8; j >= 0; j--) { const v = j / 8; x.lineTo(px + (1 - v) * 90 + (j % 2) * 20, 880 - hh * v); } x.closePath(); x.fill(); }
      L.fog(x, 2185, [60, 70, 90], 700, 260, t * 20, 0.35);
    } else if (kind === 1) {
      // snow: a white slope in a blizzard
      x.fillStyle = '#d8dce2'; x.beginPath(); x.moveTo(-200, 700); x.quadraticCurveTo(900, 560, 2200, 760); x.lineTo(2200, 1200); x.lineTo(-200, 1200); x.closePath(); x.fill();
      for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(60,66,80,0.5)'; x.fillRect(200 + k * 300 + r() * 80, 640 + r() * 40, 6, 60); }
    } else if (kind === 2) {
      // a ridge against the stars
      x.fillStyle = '#05070c'; x.beginPath(); x.moveTo(-200, 1200); x.lineTo(-200, 820); for (let X = -200; X <= 2200; X += 40) x.lineTo(X, 760 - 140 * Math.exp(-Math.pow((X - 1000) / 600, 2)) + 20 * K.fbm(X * 0.005, 1, 3, 2186)); x.lineTo(2200, 1200); x.closePath(); x.fill();
    } else {
      // a frozen stream, the moon on the ice
      x.fillStyle = '#0a0e16'; x.fillRect(-100, 640, W + 200, 600);
      x.fillStyle = '#5a6a86'; x.beginPath(); x.moveTo(-100, 980); x.bezierCurveTo(500, 900, 900, 760, 2100, 720); x.lineTo(2100, 800); x.bezierCurveTo(1000, 860, 600, 1000, -100, 1100); x.closePath(); x.fill();
      L.glow(x, [200, 214, 240], 1450, 800, 160, 0.35);
      x.strokeStyle = 'rgba(220,230,250,0.4)'; x.lineWidth = 1.5; for (let k = 0; k < 12; k++) { const px = r() * 1900; x.beginPath(); x.moveTo(px, 880 - px * 0.08); x.lineTo(px + 40 + r() * 60, 870 - px * 0.08 + r() * 20); x.stroke(); }
    }
    const fy = kind === 2 ? 760 - 140 * Math.exp(-Math.pow((sx - 1000) / 600, 2)) : kind === 1 ? 660 + (sx - 900) * 0.04 : kind === 3 ? 900 - sx * 0.08 : 880;
    L.rimLit(x, (cc, fill, pass) => sive(cc, { x: sx, y: fy, h: 380 * scale, face: 1, walk, lean: kind === 1 ? 0.25 : 0.1, t, wind: kind === 1 ? 0.1 : 0 }, fill, pass), { rim: kind === 1 ? '#c8d0dc' : '#9aa8c4', mid: '#2a3040', dark: SIVE_DARK, dx: -3, dy: 2, steps: 3 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (kind === 1) K.specks(x, t, { kind: 'snow', n: 260, wind: -260, alpha: 0.9, seed: 2187 }); else if (kind === 0) K.specks(x, t, { kind: 'snow', n: 60, wind: -30, alpha: 0.5, seed: 2188 });
    L.finish(x, { bloom: 0.3, vig: 0.72, shadow: kind === 1 ? '#8a94a6' : '#26304a', shadowA: 0.3 });
  }
  const shotNorth = k => (x, t, sh) => nightScene(x, t, sh, k);
  function holdImg() {
    return K.cached('s2:hold', () => {
      const c = K.canvas(W + 400, H + 200), x = c.getContext('2d'), r = rng(2191), O = 200;
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#8a9488'); g.addColorStop(0.45, '#c8c8b6'); g.addColorStop(1, '#6a7462'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      const sun = x.createRadialGradient(1500 + O, 360, 10, 1500 + O, 360, 700); sun.addColorStop(0, 'rgba(255,246,220,0.7)'); sun.addColorStop(1, 'rgba(255,246,220,0)'); x.fillStyle = sun; x.fillRect(0, 0, c.width, c.height);
      const fell = (base, amp, col, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, c.height); for (let X = 0; X <= c.width; X += 10) x.lineTo(X, base - amp * K.fbm(X * 0.0016, 1, 4, seed) - amp * 0.5 * Math.sin(X * 0.002 + seed)); x.lineTo(c.width, c.height); x.closePath(); x.fill(); };
      fell(520, 260, '#7a8678', 2192); fell(640, 200, '#5e6a5a', 2193); fell(760, 160, '#46523e', 2194);
      // the ford: a river across the valley floor
      x.fillStyle = '#9aa8a8'; x.beginPath(); x.moveTo(0, 960); x.bezierCurveTo(600, 900, 1100, 1000, c.width, 930); x.lineTo(c.width, 980); x.bezierCurveTo(1100, 1050, 600, 950, 0, 1010); x.closePath(); x.fill();
      for (let k = 0; k < 14; k++) { x.fillStyle = '#4a5246'; x.beginPath(); x.ellipse(900 + k * 26, 968 + Math.sin(k) * 10, 12, 6, 0, 0, TAU); x.fill(); }
      // the hold on its rise: an old palisade, a longhall, a byre, smoke from the roof
      const hx = 1080, hy = 780;
      x.fillStyle = '#2e2a22'; x.beginPath(); x.moveTo(hx - 300, hy); x.lineTo(hx - 220, hy - 120); x.lineTo(hx + 220, hy - 120); x.lineTo(hx + 300, hy); x.closePath(); x.fill();
      x.fillStyle = '#3e3628'; x.fillRect(hx - 230, hy - 60, 460, 60);
      x.fillStyle = '#1e1a14'; x.fillRect(hx - 40, hy - 40, 34, 40);
      x.fillStyle = '#34302a'; x.beginPath(); x.moveTo(hx + 280, hy + 10); x.lineTo(hx + 320, hy - 50); x.lineTo(hx + 430, hy - 50); x.lineTo(hx + 460, hy + 10); x.closePath(); x.fill();
      for (let k = 0; k < 60; k++) { const a = Math.PI * (0.05 + k / 59 * 0.9), px = hx + Math.cos(a) * 520 - 20, py = hy + 40 - Math.sin(a) * 60 * 0 + Math.sin(a) * 30; x.fillStyle = '#2a2620'; x.fillRect(px - 5, py - 70 - r() * 20, 10, 80); x.beginPath(); x.moveTo(px - 5, py - 70); x.lineTo(px, py - 84); x.lineTo(px + 5, py - 70); x.fill(); }
      x.strokeStyle = '#3a3328'; x.lineWidth = 6; x.beginPath(); x.moveTo(hx - 60, hy + 40); x.bezierCurveTo(hx - 200, 880, hx - 500, 930, hx - 900, 1000); x.stroke();
      return { c, O, hx, hy };
    });
  }
  function shotHold(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b + 0.4), S = holdImg();
    const c = { x: lerp(-80, 60, ease(u)), y: lerp(-30, 20, u), z: lerp(1.0, 1.12, ease(u)) };
    L.view(x, c, 1); x.drawImage(S.c, -S.O, -100);
    K.smoke(x, t, { n: 6, x: S.hx - 260, y: S.hy - 600, w: 120, h: 480, color: [200, 200, 196], alpha: 0.3, rise: 16, size: 140, seed: 2195, drift: 20 });
    L.fog(x, 2196, [220, 222, 210], 820, 220, t * 18, 0.55); L.fog(x, 2197, [200, 204, 196], 560, 200, -t * 10, 0.35);
    // Sive, tiny on the road below
    const sx = lerp(260, 420, u), sy = 1000 - (sx - 200) * 0.04;
    x.fillStyle = '#2a2a2c'; L.person(x, { x: sx, y: sy, h: 60, face: 1, dress: 'cloak', hat: 'hood', hold: 'bundle', walk: lt * 4, fill: '#2a2a2c', fill2: '#5a5652' });
    x.setTransform(1, 0, 0, 1, 0, 0);
    L.finish(x, { bloom: 0.25, vig: 0.55, shadow: '#7a8a7a', shadowA: 0.2 });
  }

  // ================================================================ L16: Edda at the hearth, the child in her arms; Sive's answer
  function hallImg() {
    return K.cached('s2:hall', () => {
      const c = K.canvas(W + 400, H + 200), x = c.getContext('2d'), r = rng(2201);
      x.fillStyle = '#140e0a'; x.fillRect(0, 0, c.width, c.height);
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgb(${30 + r() * 12 | 0},${22 + r() * 8 | 0},${16 + r() * 6 | 0})`; x.fillRect(k * 60, 0, 56, 900); }
      for (const px of [250, 820, 1500, 2050]) { x.fillStyle = '#0c0806'; x.fillRect(px, 0, 70, 1000); }
      x.fillStyle = '#0a0705'; x.fillRect(0, 0, c.width, 110); x.beginPath(); x.moveTo(0, 110); x.lineTo(c.width / 2, -200); x.lineTo(c.width, 110); x.fill();
      const g = x.createLinearGradient(0, 880, 0, c.height); g.addColorStop(0, '#2a1e14'); g.addColorStop(1, '#0a0705'); x.fillStyle = g; x.fillRect(0, 880, c.width, c.height);
      // hangings and tools on the wall: a spear, a shield, bundles of herbs
      x.fillStyle = '#0e0a07'; x.fillRect(1700, 300, 10, 520); x.beginPath(); x.moveTo(1690, 300); x.lineTo(1705, 240); x.lineTo(1720, 300); x.fill();
      x.beginPath(); x.arc(560, 440, 70, 0, TAU); x.fill();
      for (let k = 0; k < 5; k++) { x.fillRect(1100 + k * 40, 160, 4, 60 + r() * 30); x.beginPath(); x.ellipse(1102 + k * 40, 230, 14, 26, 0, 0, TAU); x.fill(); }
      return c;
    });
  }
  function hearthScene(x, t, c) {
    L.view(x, c, 0.9); x.drawImage(hallImg(), -200, -100);
    const fl = L.flick(t, 6, 8);
    L.view(x, c, 1);
    L.glow(x, [255, 130, 50], 960, 820, 900 * fl, 0.3);
    K.smoke(x, t, { n: 8, x: 820, y: 100, w: 280, h: 700, color: [70, 50, 40], alpha: 0.35, rise: 20, size: 220, seed: 2202 });
    x.fillStyle = '#1a120c'; x.beginPath(); x.ellipse(960, 930, 260, 40, 0, 0, TAU); x.fill();
    for (let k = 0; k < 9; k++) { x.fillStyle = '#2a2420'; x.beginPath(); x.ellipse(960 + Math.cos(k / 9 * TAU) * 240, 930 + Math.sin(k / 9 * TAU) * 36, 28, 16, 0, 0, TAU); x.fill(); }
    L.fire(x, 960, 930, 220, 300 * fl, t, 21, { n: 8, slot: 'hh' });
    return fl;
  }
  function shotHearth(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), c = { x: lerp(-40, 30, u), y: lerp(10, -10, u), z: lerp(1.0, 1.1, ease(u)) };
    const fl = hearthScene(x, t, c);
    // Edda, old and stooped, the child in her arms, looking down at him; Sive standing apart by the post
    L.rimLit(x, (cc, fill, pass) => {
      const e = L.person(cc, { x: 640, y: 960, h: 560, face: 1, dress: 'gown', hat: 'hair', long: true, stoop: 0.35, tilt: 0.55 + 0.04 * Math.sin(t * 0.8), hold: 'bundle', fill, fill2: pass === 0 ? '#ffd8b0' : '#5a5652' });
      sive(cc, { x: 1320, y: 960, h: 600, face: -1, lean: 0.04, armN: [0.2, 0.4], hold: undefined, t, tilt: 0.15 }, fill, pass);
      void e;
    }, { rim: '#ffaa60', mid: '#5a2c14', dark: '#0e0907', dx: 0, dy: 0, steps: 4 });
    // light from the fire on the faces turned to it: re-drawn rims on the fire side
    L.rimLit(x, (cc, fill, pass) => { L.person(cc, { x: 640, y: 960, h: 560, face: 1, dress: 'gown', hat: 'hair', long: true, stoop: 0.35, tilt: 0.55 + 0.04 * Math.sin(t * 0.8), hold: 'bundle', fill, fill2: pass === 0 ? '#ffd8b0' : '#4a4642' }); }, { rim: '#ffb070', mid: '#5a2c14', dark: '#100a07', dx: -6, dy: 2, box: [300, 300, 700, 700], key: 'edda' });
    L.rimLit(x, (cc, fill, pass) => sive(cc, { x: 1320, y: 960, h: 600, face: -1, lean: 0.04, armN: [0.2, 0.4], hold: undefined, t, tilt: 0.15 }, fill, pass), { rim: '#ffb070', mid: '#5a2c14', dark: SIVE_DARK, dx: 6, dy: 2, box: [1050, 280, 600, 720], key: 'sive' });
    // Edda's silver hair, catching the firelight
    const hp = L.proj(c, 1, 640 + 0.03 * 560, 960 - 0.88 * 560);
    x.setTransform(1, 0, 0, 1, 0, 0); L.glow(x, [230, 220, 210], hp[0] + 10, hp[1] - 10, 50, 0.25 * fl);
    L.finish(x, { bloom: 0.45, vig: 0.72, warm: '#a0602a', warmA: 0.06 });
  }
  // a close profile under a hood, facing left; the fire before her lights only the edge of her face. s = face height
  function hoodProfile(x, cx, cy, s, o = {}) {
    const lid = o.lid || 0, rim = o.rim || '#ffb070', dk = o.dark || '#0e0c0c';
    x.save(); x.translate(cx, cy); x.scale(s, s); x.rotate(o.tilt || 0); x.lineJoin = 'round'; x.lineCap = 'round';
    const face = c => { c.beginPath(); c.moveTo(-0.06, -0.63); c.quadraticCurveTo(-0.02, -0.5, -0.02, -0.34); c.quadraticCurveTo(-0.02, -0.24, -0.06, -0.2); c.quadraticCurveTo(-0.2, 0.0, -0.2, 0.05); c.quadraticCurveTo(-0.16, 0.1, -0.08, 0.11); c.quadraticCurveTo(-0.12, 0.17, -0.1, 0.2); c.quadraticCurveTo(-0.07, 0.24, -0.05, 0.25); c.quadraticCurveTo(-0.1, 0.28, -0.09, 0.32); c.quadraticCurveTo(-0.08, 0.44, -0.04, 0.5); c.quadraticCurveTo(0.04, 0.58, 0.14, 0.6); c.lineTo(0.29, 0.68); c.quadraticCurveTo(0.38, -0.08, -0.06, -0.63); c.closePath(); };
    // the hood: over the head, falling to the shoulders; its front edge stands out before the brow
    x.fillStyle = dk; x.beginPath(); x.moveTo(-0.1, -0.68); x.quadraticCurveTo(-0.08, -1.08, 0.5, -1.12); x.quadraticCurveTo(1.25, -1.0, 1.35, -0.2); x.quadraticCurveTo(1.45, 0.6, 1.6, 1.5); x.lineTo(0.1, 1.5); x.quadraticCurveTo(0.2, 0.95, 0.3, 0.72); x.quadraticCurveTo(0.4, -0.08, -0.1, -0.68); x.closePath(); x.fill();
    // the face in shadow, warm
    face(x); x.fillStyle = '#2a1a14'; x.fill();
    x.save(); face(x); x.clip(); const g = x.createLinearGradient(-0.2, 0, 0.35, 0); g.addColorStop(0, 'rgba(255,170,100,0.55)'); g.addColorStop(0.35, 'rgba(120,60,30,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-0.3, -0.8, 1.3, 1.6); x.restore();
    // the lit edge: brow, nose, lips, chin
    x.strokeStyle = rim; x.lineWidth = 0.014; x.beginPath(); x.moveTo(0.02, -0.5); x.quadraticCurveTo(-0.02, -0.4, -0.02, -0.34); x.quadraticCurveTo(-0.02, -0.24, -0.06, -0.2); x.quadraticCurveTo(-0.2, 0.0, -0.2, 0.05); x.quadraticCurveTo(-0.16, 0.1, -0.08, 0.11); x.moveTo(-0.1, 0.2); x.quadraticCurveTo(-0.07, 0.24, -0.05, 0.25); x.moveTo(-0.09, 0.32); x.quadraticCurveTo(-0.08, 0.44, -0.04, 0.5); x.quadraticCurveTo(0.04, 0.58, 0.14, 0.6); x.stroke();
    // the hood's inner edge, lit
    x.strokeStyle = 'rgba(255,170,100,0.55)'; x.lineWidth = 0.018; x.beginPath(); x.moveTo(-0.1, -0.68); x.quadraticCurveTo(0.4, -0.08, 0.3, 0.72); x.stroke(); x.strokeStyle = 'rgba(255,170,100,0.3)'; x.lineWidth = 0.012; x.beginPath(); x.moveTo(-0.1, -0.68); x.quadraticCurveTo(-0.08, -1.08, 0.5, -1.12); x.stroke();
    // the eye: a dark almond, a glint, the lid lowering
    x.fillStyle = '#080605'; x.beginPath(); x.ellipse(0.06, -0.24, 0.05, 0.022 * (1 - lid * 0.7), 0.1, 0, TAU); x.fill();
    if (lid < 0.8) { x.fillStyle = 'rgba(255,200,140,0.8)'; x.beginPath(); x.arc(0.035, -0.245, 0.007, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(255,170,100,0.35)'; x.lineWidth = 0.008; x.beginPath(); x.moveTo(0.01, -0.27 + lid * 0.02); x.quadraticCurveTo(0.06, -0.29 + lid * 0.03, 0.11, -0.26); x.stroke();
    x.restore();
  }
  function shotSive(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), c = { x: lerp(30, 0, u), y: lerp(10, -10, u), z: lerp(1.0, 1.08, ease(u)) };
    const fl = L.flick(t, 6, 8);
    x.fillStyle = '#0a0706'; x.fillRect(0, 0, W, H);
    // the hall behind her, out of focus: the hearth's glow, a post, smoke
    L.glow(x, [255, 130, 50], 240, 760, 700 * fl, 0.35); L.glow(x, [255, 180, 90], 300, 820, 220, 0.3 * fl);
    for (let k = 0; k < 5; k++) L.glow(x, [255, 150, 70], 180 + k * 70 + Math.sin(t + k) * 20, 600 + k * 40, 30, 0.25);
    x.fillStyle = '#050403'; x.fillRect(1500, 0, 140, H);
    L.view(x, c, 1);
    const lid = smooth(span(t, at('L16', 0.7), at('L16', 0.8)));
    hoodProfile(x, 900, 440, 520, { lid, tilt: 0.04 + lid * 0.08, rim: `rgb(255,${176 * fl | 0},${110 * fl | 0})` });
    // her hand at her breast, the cord at the wrist
    x.fillStyle = '#121012'; x.beginPath(); x.moveTo(700, 1200); x.quadraticCurveTo(780, 900, 1000, 860); x.lineTo(1300, 900); x.lineTo(1400, 1200); x.closePath(); x.fill();
    x.fillStyle = '#3a2620'; x.beginPath(); x.ellipse(860, 960, 80, 54, -0.5, 0, TAU); x.fill();
    x.strokeStyle = `rgba(255,${170 * fl | 0},100,0.7)`; x.lineWidth = 6; x.beginPath(); x.ellipse(860, 960, 80, 54, -0.5, Math.PI * 0.7, Math.PI * 1.4); x.stroke();
    x.strokeStyle = '#6a6862'; x.lineWidth = 12; x.beginPath(); x.moveTo(930, 900); x.quadraticCurveTo(960, 960, 940, 1030); x.stroke(); x.fillStyle = '#6a6862'; x.beginPath(); x.arc(948, 962, 13, 0, TAU); x.fill(); x.fillRect(944, 970, 7, 40);
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(x, t, { kind: 'dust', n: 30, alpha: 0.3, seed: 2205 });
    L.finish(x, { bloom: 0.4, vig: 0.8, warm: '#a0602a', warmA: 0.06 });
  }

  // ================================================================ L17: the register: Cael, and beside it, parentage: unknown
  const REG = { w: 1700, h: 1100, rowY: 640, nameX: 210, parX: 760 };
  function registerPage() {
    return K.cached('s2:register', () => {
      const c = K.canvas(REG.w, REG.h), x = c.getContext('2d'); x.drawImage(K.parchment(REG.w, REG.h, 2211, { edge: 0.9, foxing: 26, stains: 2 }), 0, 0);
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(120,60,40,0.4)'; x.lineWidth = 1.3;
      for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(110, 160 + k * 120); x.lineTo(REG.w - 110, 160 + k * 120); x.stroke(); }
      x.beginPath(); x.moveTo(680, 90); x.lineTo(680, REG.h - 80); x.stroke(); x.restore();
      for (let k = 0; k < 4; k++) { L.drawScript(x, L.scriptLine(2220 + k, 300 + (k * 41 % 90), 22), REG.nameX, 160 + k * 120, { w: 3.6, col: '#3a2412' }); L.drawScript(x, L.scriptLine(2230 + k, 640 - (k * 53 % 160), 18), REG.parX, 160 + k * 120, { w: 3.2, col: '#3a2412' }); }
      return c;
    });
  }
  // a word written on, its wet ink drying: p (0..1 written), dry (0..1)
  function inkWord(x, s, X, Y, font, p, dry, key) {
    if (p <= 0) return null;
    x.save(); x.font = font; const w = x.measureText(s).width;
    x.beginPath(); x.rect(X - 20, Y - 120, (w + 30) * p + 20, 200); x.clip();
    const wet = 1 - dry, col = `rgb(${lerp(20, 58, dry) | 0},${lerp(12, 36, dry) | 0},${lerp(8, 18, dry) | 0})`;
    x.fillStyle = col; x.fillText(s, X, Y);
    if (wet > 0.02) { x.globalAlpha = 0.35 * wet; x.fillStyle = 'rgb(200,190,170)'; x.fillText(s, X - 1.2, Y - 1.6); x.globalAlpha = 1; x.fillStyle = col; x.fillText(s, X + 0.4, Y + 0.6); }
    x.restore();
    return [X + w * p, Y - 12, w];
  }
  function shotRegister(x, t, sh) {
    const lt = t - sh.a;
    const pC = span(t, at('L17', 0.24), at('L17', 0.34)), pP = span(t, at('L17', 0.55), at('L17', 0.68)), pU = span(t, at('L17', 0.875), at('L17', 0.985));
    const dC = smooth(span(t, at('L17', 0.36), at('L17', 0.36) + 2.5)), dP = smooth(span(t, at('L17', 0.7), at('L17', 0.7) + 2.5)), dU = smooth(span(t, at('L17', 1.0), at('L17', 1.0) + 3.2));
    // the camera: the page, then along the row to the parentage column, then in on the word
    const k1 = ease(span(t, at('L17', 0.45), at('L17', 0.56))), k2 = ease(span(t, at('L17', 0.8), K.scene(2).end + 1.5));
    const fontN = 'italic 400 74px "EB Garamond"', fontP = 'italic 400 60px "EB Garamond"';
    const cx0 = lerp(-120, 80, k1), cy0 = lerp(30, 70, k1);
    const c = { x: lerp(cx0, 335, k2), y: lerp(cy0, -62, k2), z: lerp(lerp(1.15, 1.3, clamp(lt / 6)), 2.7, k2), r: lerp(-0.02, 0, k2) };
    x.fillStyle = '#100a07'; x.fillRect(0, 0, W, H);
    L.view(x, c, 1);
    x.save(); x.translate(110, -130);
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(18, 22, REG.w, REG.h);
    x.drawImage(registerPage(), 0, 0);
    let tip = null;
    const y = 160 + 4 * 120;
    const a = inkWord(x, 'Cael', REG.nameX, y, fontN, pC, dC);
    if (pC > 0 && pC < 1) tip = a;
    x.save(); x.font = fontP; const pw = x.measureText('parentage: ').width; x.restore();
    const b = inkWord(x, 'parentage:', REG.parX, y, fontP, pP, dP); if (pP > 0 && pP < 1) tip = b;
    const d = inkWord(x, 'unknown', REG.parX + pw, y, fontP, pU, dU); if (pU > 0 && pU < 1) tip = d;
    // Edda's hand: old, a green-brown sleeve; resting between the words
    const rest = pU >= 1 ? [REG.parX + pw + 420, y + 120] : pP >= 1 ? [REG.parX + pw - 30, y + 30] : pC >= 1 ? [REG.nameX + 260, y + 40] : [REG.nameX - 40, y - 10];
    const hp = tip ? [tip[0], tip[1] + 10] : rest, away = smooth(span(t, at('L17', 1.0), at('L17', 1.0) + 1.2));
    if (away < 1) { const ox = away * 700, oy = away * 400; x.save(); x.globalAlpha = 0.2; L.quillHand(x, hp[0] + 36 + ox, hp[1] + 48 + oy, { ang: 0.45, scale: 1.05, shadow: true }); x.restore(); L.quillHand(x, hp[0] + ox, hp[1] + oy, { ang: 0.45, scale: 1.05, skin: [176, 140, 112], sleeve: [58, 62, 40], old: true, lit: 0.9 }); }
    x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    // one candle, the warm pool of its light
    const fl = L.flick(t, 8, 7);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(300, 140, 60, 800, 500, 1500 * (0.9 + 0.1 * fl)); g.addColorStop(0, 'rgb(255,236,200)'); g.addColorStop(0.5, 'rgb(190,140,96)'); g.addColorStop(1, 'rgb(24,15,10)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    L.glow(x, [255, 170, 80], 180, 60, 460, 0.25 * fl); L.glow(x, [255, 220, 160], 170, 70, 90, 0.5 * fl);
    L.finish(x, { bloom: 0.3, vig: 0.7, tooth: 0.06 });
  }

  // ================================================================ the cut
  let EDL = null, RELEASED = false;
  function edl(sc) {
    if (EDL) return EDL;
    const c = K.cue, L12 = c('L12'), L13 = c('L13'), A02 = c('A02'), L15 = c('L15'), L16 = c('L16'), L17 = c('L17');
    const D = d => ({ kind: 'dissolve', d });
    const shots = [
      { id: 'passage', a: sc.start, draw: shotPassage },
      { id: 'cord', a: at('L11', 0.42), draw: shotCord },
      { id: 'door', a: at('L11', 0.73), draw: shotDoor },
      { id: 'streets', a: L12.start - 0.1, draw: shotStreets, tin: D(0.2) },
      { id: 'gatewide', a: L13.start - 0.1, draw: shotGateWide, tin: D(0.25) },
      { id: 'blanket', a: at('L13', 0.15), draw: shotBlanket },
      { id: 'stairs', a: at('L13', 0.43), draw: shotStairs },
      { id: 'gateopen', a: at('L13', 0.83), draw: shotGateOpen },
      { id: 'bars', a: A02.end + 0.15, draw: shotBars },
      { id: 'north1', a: L15.start - 0.15, draw: shotNorth(0), tin: D(0.5) },
      { id: 'north2', a: at('L15', 0.17), draw: shotNorth(1), tin: D(0.25) },
      { id: 'north3', a: at('L15', 0.34), draw: shotNorth(2), tin: D(0.25) },
      { id: 'north4', a: at('L15', 0.5), draw: shotNorth(3), tin: D(0.25) },
      { id: 'hold', a: at('L15', 0.63), draw: shotHold, tin: D(0.5) },
      { id: 'hearth', a: L16.start - 0.1, draw: shotHearth, tin: D(0.4) },
      { id: 'sive', a: at('L16', 0.47), draw: shotSive },
      { id: 'register', a: L17.start - 0.2, draw: shotRegister, tin: D(0.5) },
    ];
    for (let i = 0; i < shots.length; i++) shots[i].b = i + 1 < shots.length ? shots[i + 1].a : sc.end + 2.5;
    EDL = shots; return EDL;
  }

  SCENES[2] = {
    join: 'dissolve', joinDur: 0.6,
    draw(ctx, t, sc) {
      if (!L) L = SCENES[1].lib;
      if (t > sc.start + 3 && !RELEASED) { K.release('s1:'); RELEASED = true; }
      if (t < sc.start) RELEASED = false;
      t = clamp(t, sc.start, sc.end + 2.5);
      L.cleanState(ctx);
      L.runEdit(ctx, t, edl(sc), 's2');
    },
  };
})();
