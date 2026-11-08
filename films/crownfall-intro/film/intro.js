/* Crownfall: Aethelgard, the opening film: "The Seven That Remained". A Project EON game by Osita Miles.
   Drawn entirely in code (Canvas 2D). FILM.renderAt(t) draws any instant deterministically (no Math.random, no Date).
   Order: Project EON, the seven-scene chronicle (narrated), YEAR 33, then CROWNFALL / AETHELGARD and the tagline.
   The timeline (film/timeline.js) is laid out on the narration takes, and every scene keys its pictures to its lines. */
(function () {
  'use strict';
  const K = window.KIT, TL = window.TIMELINE, W = K.W, H = K.H, FPS = K.FPS, P = K.P;
  const { clamp, lerp, smooth, ease, easeOut, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TOTAL = TL.total;
  let ctx, canvas;
  const OPTS = { subs: false, sceneOnly: 0 };

  // line and scene lookups for the scenes
  const LINES = {}; for (const s of TL.scenes) for (const l of s.lines) LINES[l.id] = l;
  K.cue = id => LINES[id];          // a narration line: { id, text, start, end }
  K.scene = n => TL.scenes[n - 1];
  K.TL = TL;

  // ---------------------------------------------------------------- PROJECT EON, drawn in ink (after the manner of a studio card where a pen draws the
  // studio's emblem under a close lens and pulls back to show it whole). The emblem is the studio's own mark: the O an orbit
  // ring with its spark, between engraved capitals E and N; here it is cut like an engraving, and its O floods vermilion.
  const ER = 132, ER2 = 117;
  const EMB = (() => {
    const ring = []; for (let k = 0; k <= 200; k++) { const a = -Math.PI / 2 + k / 200 * Math.PI * 2; ring.push([Math.cos(a) * ER, Math.sin(a) * ER]); }
    const inner = []; for (let k = 0; k <= 160; k++) { const a = -Math.PI / 2 - k / 160 * Math.PI * 2; inner.push([Math.cos(a) * ER2, Math.sin(a) * ER2]); }
    const eR = -ER - 62, eL = eR - 112, nL = ER + 62, nR = nL + 132, top = -ER, bot = ER;
    const letters = [
      { pts: [[eL + 14, top], [eL + 14, bot]], w: 13, a: 0.0 },                       // E stem (thick)
      { pts: [[eL - 4, top + 1], [eR + 2, top + 1], [eR + 6, top + 22]], w: 4.5, a: 1.5 },  // E top arm and serif
      { pts: [[eL + 14, 0], [eR - 22, 0]], w: 4.5, a: 1.5 },                            // E middle arm
      { pts: [[eL - 4, bot - 1], [eR + 4, bot - 1], [eR + 8, bot - 26]], w: 4.5, a: 1.5 },  // E foot and serif
      { pts: [[eL - 4, top], [eL + 34, top]], w: 4, a: 1.5 }, { pts: [[eL - 4, bot], [eL + 34, bot]], w: 4, a: 1.5 },
      { pts: [[nL + 6, bot], [nL + 6, top]], w: 4.5, a: 1.5 },                          // N left stem (thin)
      { pts: [[nL + 4, top], [nR - 8, bot]], w: 14, a: 0.55 },                          // N diagonal (thick)
      { pts: [[nR - 8, bot], [nR - 8, top]], w: 4.5, a: 1.5 },                          // N right stem (thin)
      { pts: [[nL - 12, bot], [nL + 24, bot]], w: 4, a: 1.5 }, { pts: [[nL - 8, top], [nL + 18, top]], w: 4, a: 1.5 }, { pts: [[nR - 26, top], [nR + 10, top]], w: 4, a: 1.5 },
    ].map(s => ({ ...s, pts: K.resample(s.pts, 3) }));
    // engraved shading: a crescent of hatching inside the ring, lit from the upper left
    const hatch = [];
    for (let k = -ER2; k <= ER2; k += 5.5) {
      const seg = []; for (let u = -ER2; u <= ER2; u += 3) { const x = (u + k) * 0.7071, y = (u - k) * 0.7071; const inR = x * x + y * y < (ER2 - 3) * (ER2 - 3), lit = (x + 26) * (x + 26) + (y + 30) * (y + 30) < 104 * 104; if (inR && !lit) seg.push([x, y]); else if (seg.length) { if (seg.length > 2) hatch.push(seg.slice()); seg.length = 0; } }
      if (seg.length > 2) hatch.push(seg);
    }
    return { ring, inner, letters, hatch, spark: [Math.cos(-0.7) * ER, Math.sin(-0.7) * ER] };
  })();
  function studioPaper() { return K.cached('studio:paper', () => K.parchment(2400, 1350, 3131, { base: [234, 229, 218], dark: [128, 116, 98], edge: 0.35, stains: 1, foxing: 18 })); }
  function studio(t) {
    const A = 1 - smooth(span(t, TL.studio[1] - 0.5, TL.studio[1] + 0.6));
    if (A <= 0) return;
    const pRing = ease(span(t, 0.5, 2.5)), pInner = span(t, 2.2, 2.9), pHatch = span(t, 2.5, 3.6), pLet = span(t, 2.7, 4.3), pRed = span(t, 4.4, 5.6);
    // the camera follows the pen around the ring, then draws back to the whole emblem
    const tipA = -Math.PI / 2 + pRing * Math.PI * 2, tip = [Math.cos(tipA) * ER, Math.sin(tipA) * ER];
    const back = ease(span(t, 2.3, 4.8)), z = lerp(3.3, 1.12, back) * (1 - 0.04 * smooth(span(t, 4.8, 9.6))), fx = lerp(tip[0] * 0.92, 0, back), fy = lerp(tip[1] * 0.92, -8, back);
    const L = K.layer('studio:frame'), x = L.getContext('2d');
    x.save(); K.cam(x, fx, fy, z);
    x.drawImage(studioPaper(), -1200, -675, 2400, 1350);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(30,20,12,0.92)';
    K.nib(x, K.wobble(EMB.ring, 0.6, 0.05, 2), { w: 8.5, angle: -0.6, min: 0.22, taper: 0.03, p: pRing, jit: 0.15, seed: 2 });
    if (pInner > 0) { x.strokeStyle = 'rgba(30,20,12,0.85)'; x.lineWidth = 1.3; K.line(x, EMB.inner, pInner); }
    if (pHatch > 0) { x.strokeStyle = 'rgba(30,20,12,0.62)'; x.lineWidth = 1; const n = EMB.hatch.length; EMB.hatch.forEach((h, i) => { const p = clamp(pHatch * 1.6 - i / n * 0.6); if (p > 0) K.line(x, h, p); }); }
    EMB.letters.forEach((s, i) => { const p = clamp(pLet * EMB.letters.length * 0.42 - i * 0.42); if (p > 0) K.nib(x, s.pts, { w: s.w, angle: s.a, min: 0.3, taper: 0.06, p, seed: 7 + i }); });
    // the O floods vermilion from its heart, under the engraving
    if (pRed > 0) {
      const rr = ER2 * easeOut(pRed) * 1.02; x.save(); x.beginPath(); x.arc(0, 0, ER2 - 1, 0, 6.283); x.clip();
      const g = x.createRadialGradient(-20, -24, 0, 0, 0, rr + 1); g.addColorStop(0, 'rgba(178,52,34,0.95)'); g.addColorStop(0.8, 'rgba(150,40,26,0.95)'); g.addColorStop(1, 'rgba(150,40,26,0)');
      x.fillStyle = g; x.beginPath(); for (let k = 0; k <= 64; k++) { const a = k / 64 * 6.283, e = rr * (0.94 + 0.08 * K.fbm(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4, 3, 5)); k ? x.lineTo(Math.cos(a) * e, Math.sin(a) * e) : x.moveTo(Math.cos(a) * e, Math.sin(a) * e); } x.fill(); x.restore();
    }
    x.globalCompositeOperation = 'source-over';
    // the spark: a small engraved star on the ring that catches the light
    const sp = smooth(span(t, 5.2, 6.2));
    if (sp > 0) { const [sx, sy] = EMB.spark; x.save(); x.translate(sx, sy); x.globalAlpha = sp; x.fillStyle = '#f4e9cf'; x.beginPath(); x.arc(0, 0, 6, 0, 6.283); x.fill(); x.strokeStyle = 'rgba(30,20,12,0.9)'; x.lineWidth = 1.2; x.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, l = k % 2 ? 9 : 15; x.beginPath(); x.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.stroke(); } x.restore(); K.glow(x, sx, sy, 40, [255, 226, 170], 0.35 * sp * (0.8 + 0.2 * Math.sin(t * 3))); }
    K.text(x, 'PROJECT', 0, -ER - 58, '600 30px Cinzel', 'rgba(30,20,12,0.9)', 22, 'center', smooth(span(t, 3.6, 4.6)));
    K.text(x, 'PRESENTS', 0, ER + 92, '500 21px Cinzel', 'rgba(30,20,12,0.78)', 16, 'center', smooth(span(t, 5.8, 6.9)));
    x.restore();
    // a close lens: the edges of the frame fall out of focus, less as the camera draws back
    const blurA = clamp((z - 1.1) / 2.0) * 0.95 + 0.15;
    const B = K.layer('studio:blur', W / 4, H / 4), bx = B.getContext('2d'); bx.filter = 'blur(5px)'; bx.drawImage(L, 0, 0, W / 4, H / 4); bx.filter = 'none';
    const M = K.layer('studio:dof'), mx = M.getContext('2d'); mx.imageSmoothingQuality = 'high'; mx.drawImage(B, 0, 0, W, H);
    mx.globalCompositeOperation = 'destination-in'; const g = mx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${blurA})`); mx.fillStyle = g; mx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = A; ctx.drawImage(L, 0, 0); ctx.drawImage(M, 0, 0); ctx.restore();
    K.vignette(ctx, 0.32 * A, '40,30,20', 0.4);
  }

  // ---------------------------------------------------------------- embers on black (YEAR 33 and the title)
  const R = rng(7101);
  const BOKEH = Array.from({ length: 56 }, () => ({ x: R() * W, y: R() * H, z: 0.25 + R() * 0.75, r: 8 + R() * 38, c: P.ember[Math.floor(R() * P.ember.length)], a: 0.03 + R() * 0.1, sp: 6 + R() * 16, sw: 10 + R() * 30, f: 0.05 + R() * 0.2, ph: R() * 6.283 }));
  function embersBg(t, heat) {
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 1.15, 40, W / 2, H * 1.15, H * 0.95), b = 0.07 + 0.03 * Math.sin(t * 0.35) + heat * 0.08;
    g.addColorStop(0, `rgba(120,34,18,${b})`); g.addColorStop(0.55, `rgba(60,16,10,${b * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of BOKEH) {
      const y = ((p.y - t * p.sp * p.z) % (H + 120) + H + 120) % (H + 120) - 60, x = p.x + Math.sin(t * p.f + p.ph) * p.sw * p.z;
      const a = p.a * (0.65 + 0.35 * Math.sin(t * (0.4 + p.f * 2) + p.ph * 3)) * (0.7 + heat * 0.6), r = p.r * (0.6 + p.z * 0.6), gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${p.c},${a * 0.55})`); gr.addColorStop(0.72, `rgba(${p.c},${a})`); gr.addColorStop(0.86, `rgba(${p.c},${a * 0.65})`); gr.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    K.embers(ctx, t, { n: 30, heat: 0.45 + heat * 0.4, seed: 71 });
    K.specks(ctx, t, { kind: 'ash', n: 40, alpha: 0.35, seed: 72 });
  }

  // ---------------------------------------------------------------- YEAR 33 • ASH & AETHER INTERREGNUM
  function year33(t) {
    const [a0, a1] = TL.year33, lt = t - a0, A = win(t, a0, a1, 1.2, 1.4);
    embersBg(t, 0.2);
    if (A <= 0) return;
    const cx = W / 2, cy = H / 2 + 6;
    const l1 = 'YEAR 33', l2 = 'ASH & AETHER INTERREGNUM', f1 = '500 30px Cinzel', f2 = '500 30px Cinzel';
    const w1 = K.measure(ctx, l1, f1, 12), w2 = K.measure(ctx, l2, f2, 9), dot = 46, total = w1 + dot * 2 + w2, x0 = cx - total / 2;
    const p1 = smooth(span(lt, 0.3, 1.6)), p2 = smooth(span(lt, 1.0, 2.4));
    ctx.save(); ctx.globalAlpha = A;
    K.text(ctx, l1, x0, cy, f1, P.goldHi, 12, 'left', p1);
    ctx.save(); ctx.globalAlpha *= p2; ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(x0 + w1 + dot, cy - 10, 3.4, 0, 6.283); ctx.fill(); ctx.restore();
    K.text(ctx, l2, x0 + w1 + dot * 2, cy, f2, P.bone, 9, 'left', p2 * 0.92);
    const rl = 220 * ease(span(lt, 1.4, 3.0));
    ctx.globalAlpha = A * 0.6; ctx.fillStyle = P.gold; ctx.fillRect(cx - rl, cy + 34, rl * 2, 1.2);
    ctx.restore();
  }

  // ---------------------------------------------------------------- CROWNFALL / AETHELGARD, from the shards of the crown
  const SH = (() => { const r = rng(3303); return Array.from({ length: 46 }, (_, i) => ({ a: r() * 6.283, d: 380 + r() * 700, rot: (r() - 0.5) * 10, s: 5 + r() * 12, k: i / 46, tw: r() * 6.283, sides: 3 + Math.floor(r() * 2) })); })();
  const CROWN = [[-1, 0.15], [-1, -0.55], [-0.62, -0.18], [-0.3, -0.82], [0, -0.3], [0.3, -0.82], [0.62, -0.18], [1, -0.55], [1, 0.15]];
  function crownGlyph(cx, cy, s, p, alpha) {
    const path = CROWN.map(q => [cx + q[0] * s, cy + q[1] * s]);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = P.gold; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    K.line(ctx, path, ease(p));
    const band = smooth(span(p, 0.7, 1));
    if (band > 0) {
      ctx.globalAlpha = alpha * band; ctx.beginPath(); ctx.moveTo(cx - s, cy + 0.15 * s); ctx.lineTo(cx + s, cy + 0.15 * s); ctx.moveTo(cx - s, cy + 0.32 * s); ctx.lineTo(cx + s, cy + 0.32 * s); ctx.stroke();
      ctx.fillStyle = P.gold; for (const q of [CROWN[1], CROWN[3], CROWN[5], CROWN[7]]) { ctx.beginPath(); ctx.arc(cx + q[0] * s, cy + q[1] * s - 5, 3.2, 0, 6.283); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cx, cy + 0.235 * s, 3, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }
  function titleCard(t) {
    const [a0, a1] = TL.title, lt = t - a0, A = win(t, a0, a1, 0.6, 2.2);
    embersBg(t, A * 0.8);
    if (A <= 0) return;
    const cx = W / 2, base = 548, size = 156, sp = 22, crownY = base - size - 66, cs = 46;
    ctx.save(); ctx.globalAlpha = A;
    const glow = smooth(span(lt, 0.8, 4.0)), g = ctx.createRadialGradient(cx, base - size * 0.35, 10, cx, base - size * 0.35, 780);
    g.addColorStop(0, `rgba(150,52,26,${0.15 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the crown's shards fly in from the dark and settle into its outline
    const conv = span(lt, 0.0, 2.4);
    if (conv < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const s of SH) {
        const u = easeOut(clamp((conv - s.k * 0.35) / 0.65)); if (u <= 0) continue;
        const seg = Math.floor(s.k * (CROWN.length - 1)), f = s.k * (CROWN.length - 1) - seg, q0 = CROWN[seg], q1 = CROWN[Math.min(CROWN.length - 1, seg + 1)];
        const tx = cx + lerp(q0[0], q1[0], f) * cs, ty = crownY + lerp(q0[1], q1[1], f) * cs;
        const x = lerp(tx + Math.cos(s.a) * s.d, tx, u), y = lerp(ty + Math.sin(s.a) * s.d * 0.6, ty, u), rot = s.rot * (1 - u), sz = s.s * (1 - u * 0.7);
        ctx.globalAlpha = A * Math.sin(u * Math.PI) * 0.9 + A * 0.1 * u;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
        for (let k = 0; k < s.sides; k++) { const a = k / s.sides * 6.283 + s.tw, rr = sz * (0.6 + 0.4 * Math.abs(Math.sin(a * 2 + s.tw))); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.6) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.6); }
        ctx.closePath(); ctx.fillStyle = 'rgba(241,205,130,0.85)'; ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
    const flash = win(lt, 1.9, 3.0, 0.15, 0.9);
    if (flash > 0) K.glow(ctx, cx, crownY - 10, 160, [255, 214, 150], 0.35 * flash);
    crownGlyph(cx, crownY, cs, span(lt, 1.7, 3.2), 0.95);
    // CROWNFALL letter by letter out of a soft blur, then one band of light
    const word = 'CROWNFALL', font = `600 ${size}px Cinzel`;
    const lay = K.layer('intro:title', W, 300), lc = lay.getContext('2d');
    lc.font = font; lc.letterSpacing = '0px'; lc.textBaseline = 'alphabetic';
    const total = K.measure(ctx, word, font, sp); let x = cx - total / 2; const yb = 220;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i], p = smooth(span(lt, 2.4 + i * 0.11, 3.6 + i * 0.11)), cw = lc.measureText(ch).width;
      if (p > 0) { lc.fillStyle = P.bone; if (p < 1) { lc.globalAlpha = p * 0.18; for (const o of [-4, -2, 2, 4]) lc.fillText(ch, x + o * (1 - p) * 2, yb + (1 - p) * 10); } lc.globalAlpha = p * p; lc.fillText(ch, x, yb + (1 - p) * 10); }
      x += cw + sp;
    }
    lc.globalAlpha = 1;
    const swp = span(lt, 4.4, 7.6);
    if (swp > 0 && swp < 1) {
      lc.globalCompositeOperation = 'source-atop'; const sx = lerp(cx - total / 2 - 300, cx + total / 2 + 300, ease(swp)), lg = lc.createLinearGradient(sx - 160, 0, sx + 160, 0);
      lg.addColorStop(0, 'rgba(255,236,196,0)'); lg.addColorStop(0.5, 'rgba(255,236,196,0.85)'); lg.addColorStop(1, 'rgba(255,236,196,0)'); lc.fillStyle = lg; lc.fillRect(0, 0, W, 300); lc.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(lay, 0, base - yb);
    // AETHELGARD between two rules
    const sa = smooth(span(lt, 4.0, 5.4)), sub = 'AETHELGARD', sf = '500 40px Cinzel', ssp = 28, sy = base + 84;
    K.text(ctx, sub, cx, sy, sf, P.gold, ssp, 'center', sa);
    const sw2 = K.measure(ctx, sub, sf, ssp), rl = 150 * ease(span(lt, 4.3, 5.8));
    ctx.save(); ctx.globalAlpha = A * sa * 0.7; ctx.fillStyle = P.gold; ctx.fillRect(cx - sw2 / 2 - 34 - rl, sy - 13, rl, 1.2); ctx.fillRect(cx + sw2 / 2 + 34, sy - 13, rl, 1.2); ctx.restore();
    // the tagline
    const tg = smooth(span(lt, 6.6, 8.2));
    K.text(ctx, '“Your Banner. Your People. Your Legacy.”', cx, sy + 104, 'italic 400 36px "EB Garamond"', P.bone, 1.5, 'center', tg * 0.92);
    ctx.restore();
  }

  // ---------------------------------------------------------------- subtitles (for review copies; the game can use cues.vtt)
  function subtitle(t) {
    let cur = null; for (const s of TL.scenes) { if (t < s.start - 1 || t > s.end + 1) continue; for (const l of s.lines) if (t >= l.start - 0.15 && t <= l.end + 0.35) cur = l; }
    if (!cur) return;
    const a = win(t, cur.start - 0.15, cur.end + 0.35, 0.18, 0.28), font = '400 34px "EB Garamond"';
    ctx.save(); ctx.font = font;
    const words = cur.text.split(' '), lines = []; let ln = '';
    for (const w of words) { const tst = ln ? ln + ' ' + w : w; if (ctx.measureText(tst).width > 1180 && ln) { lines.push(ln); ln = w; } else ln = tst; }
    lines.push(ln);
    const y0 = H - 92 - (lines.length - 1) * 42;
    lines.forEach((s, i) => {
      ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.filter = 'blur(6px)'; ctx.fillText(s, W / 2, y0 + i * 42 + 2); ctx.filter = 'none';
      ctx.fillStyle = '#f1e9d8'; ctx.fillText(s, W / 2, y0 + i * 42);
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- scenes and their joins
  function placeholder(c, t, sc) {
    c.fillStyle = '#1a1410'; c.fillRect(0, 0, W, H);
    K.text(c, `SCENE ${sc.n}`, W / 2, H / 2 - 30, '500 28px Cinzel', P.gold, 10, 'center', 0.8);
    K.text(c, sc.name, W / 2, H / 2 + 24, 'italic 400 40px "EB Garamond"', P.bone, 1, 'center', 0.8);
  }
  function drawScene(c, n, t) {
    const sc = TL.scenes[n - 1], mod = SCENES[n];
    c.save(); try { if (mod && mod.draw) mod.draw(c, t, sc); else placeholder(c, t, sc); } finally { c.restore(); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  }
  // a scene opens out of the one before it: mod.join = 'dissolve' (default, over mod.joinDur s), 'black' or 'cut';
  // a scene that draws its own way in uses 'cut' and draws the previous scene itself if it needs to
  function scenes(t) {
    const S = TL.scenes; let i = S.findIndex(s => t >= s.start && t < s.end); if (i < 0) i = t < S[0].start ? 0 : S.length - 1;
    const sc = S[i], mod = SCENES[sc.n] || {}, join = mod.join || 'dissolve', d = mod.joinDur || 1.2;
    if (i > 0 && t < sc.start + d && join !== 'cut') {
      const u = (t - sc.start) / d;
      if (join === 'black') { if (u < 0.5) { drawScene(ctx, S[i - 1].n, t); ctx.fillStyle = `rgba(0,0,0,${smooth(u * 2)})`; ctx.fillRect(0, 0, W, H); } else { drawScene(ctx, sc.n, t); ctx.fillStyle = `rgba(0,0,0,${1 - smooth((u - 0.5) * 2)})`; ctx.fillRect(0, 0, W, H); } return; }
      const A = K.layer('intro:prev'), B = K.layer('intro:next');
      drawScene(A.getContext('2d'), S[i - 1].n, t); drawScene(B.getContext('2d'), sc.n, t);
      ctx.drawImage(A, 0, 0); ctx.globalAlpha = smooth(u); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; return;
    }
    drawScene(ctx, sc.n, t);
  }

  function renderAt(t) {
    t = clamp(t, 0, TOTAL);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const S = TL.scenes, first = S[0].start, endStory = S[S.length - 1].end;
    if (OPTS.sceneOnly) { drawScene(ctx, OPTS.sceneOnly, t); }
    else {
      if (t < first + 1.4) { studio(t); }
      if (t >= first && t < endStory) {
        if (t < first + 1.4) {          // the first page of the chronicle comes up over the studio's paper
          const L = K.layer('intro:first'); drawScene(L.getContext('2d'), S[0].n, t); ctx.globalAlpha = smooth((t - first) / 1.4); ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
        } else scenes(t);
      }
      if (t >= endStory) {
        // the last scene ends in near-black; the dateline's embers rise out of it, then the title takes over
        if (t < TL.title[0]) year33(t);
        else if (t < TL.year33[1]) { year33(t); const L = K.layer('intro:title2'), keep = ctx; ctx = L.getContext('2d'); titleCard(t); ctx = keep; ctx.globalAlpha = smooth(span(t, TL.title[0], TL.year33[1])); ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1; }
        else titleCard(t);
        if (t < endStory + 0.9) { ctx.fillStyle = `rgba(0,0,0,${1 - smooth((t - endStory) / 0.9)})`; ctx.fillRect(0, 0, W, H); }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    if (OPTS.subs) subtitle(t);
    K.grain(ctx, t, 0.045);
    const fade = smooth(span(t, 0, 0.6)) * (1 - smooth(span(t, TOTAL - 2.2, TOTAL - 0.2)));
    if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
  }

  async function loadFonts(href) {
    await new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = res; document.head.appendChild(l); });
    const faces = ['500 22px "Barlow Condensed"', '400 17px "Barlow Condensed"', '500 31px Oswald', '600 40px Cinzel', '500 40px Cinzel', '400 40px Cinzel', '700 40px Cinzel', '400 34px "EB Garamond"', 'italic 400 34px "EB Garamond"', '500 34px "EB Garamond"', '600 34px "EB Garamond"', '400 20px Archivo'];
    await Promise.all(faces.map(f => document.fonts.load(f, 'AEGHKORWZaeg')));
    await document.fonts.ready;
  }
  function mount(el) {
    canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; (el || document.body).appendChild(canvas);
    ctx = canvas.getContext('2d');
    for (const n of Object.keys(SCENES)) { const m = SCENES[n]; if (m.init) m.init(K); }
  }
  window.FILM = {
    W, H, FPS, total: TOTAL, TL, renderAt, loadFonts, opts: OPTS,
    mountHeadless() { mount(document.body); },
    mount,
    seqs: [{ id: 'intro', start: 0, dur: TOTAL }],
  };
})();
