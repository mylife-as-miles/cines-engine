/* Crownfall: Aethelgard, Story mode prologue: "The Name They Buried". A Project EON game by Osita Miles.
   Drawn entirely in code (Canvas 2D). FILM.renderAt(t) draws any instant deterministically (no Math.random, no Date).
   Order: the cold open (Cael's whisper in the dark) and the prologue title (scene 0), eight scenes keyed to the voices,
   then CHAPTER ONE / THE PAWN WHO WOULD NOT DIE. film/timeline.js is laid out on the takes (tools/build_timeline.js). */
(function () {
  'use strict';
  const K = window.KIT, TL = window.TIMELINE, W = K.W, H = K.H, FPS = K.FPS, P = K.P;
  const { clamp, lerp, smooth, ease, easeOut, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TOTAL = TL.total;
  let ctx, canvas;
  const OPTS = { subs: false, sceneOnly: -1, paint: false };   // paint: the painterly finish (work in progress, off unless asked for)

  // line and scene lookups for the scenes
  const LINES = {}; for (const s of TL.scenes) for (const l of s.lines) LINES[l.id] = l;
  K.cue = id => LINES[id];                       // a line: { id, speaker, text, start, end }
  K.scene = n => TL.scenes.find(s => s.n === n);
  K.TL = TL;

  // ---------------------------------------------------------------- embers in the dark (shared by the cold open and the chapter card)
  const R = rng(7101);
  const BOKEH = Array.from({ length: 56 }, () => ({ x: R() * W, y: R() * H, z: 0.25 + R() * 0.75, r: 8 + R() * 38, c: P.ember[Math.floor(R() * P.ember.length)], a: 0.03 + R() * 0.1, sp: 6 + R() * 16, sw: 10 + R() * 30, f: 0.05 + R() * 0.2, ph: R() * 6.283 }));
  function embersBg(c, t, heat) {
    const ctx = c;
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

  K.embersBg = embersBg;

  // ---------------------------------------------------------------- scene 0: the cold open and the prologue title
  // Black. A bell far off (in the mix). Cael whispers over the dark; one ember drifts up. Then the title rises out of the
  // dark as if written in fire: PROLOGUE, THE NAME THEY BURIED, and a thin rule; it cools and fades into scene 1.
  SCENES[0] = {
    join: 'cut',
    draw(c, t, sc) {
      const [a0, a1] = sc.title, heat = 0.15 + 0.5 * win(t, a0, a1, 1.6, 1.2);
      embersBg(c, t, heat);
      // the one ember that rises while he speaks
      const C00 = K.cue('C00'), e = span(t, C00.start - 0.6, C00.end + 1.2);
      if (e > 0 && e < 1) {
        const x = W / 2 + 40 * Math.sin(e * 5.2), y = lerp(H * 0.86, H * 0.28, easeOut(e)), a = Math.sin(e * Math.PI);
        K.glow(c, x, y, 26, [255, 150, 70], 0.55 * a); K.glow(c, x, y, 5, [255, 220, 170], 0.9 * a);
      }
      const A = win(t, a0, a1, 1.4, 1.6);
      if (A <= 0) return;
      const lt = t - a0, cx = W / 2, cy = H / 2;
      c.save(); c.globalAlpha = A;
      const g = c.createRadialGradient(cx, cy, 10, cx, cy, 700); g.addColorStop(0, `rgba(150,52,26,${0.16 * smooth(span(lt, 0.4, 3))})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      K.text(c, 'CROWNFALL : AETHELGARD', cx, cy - 118, '500 24px Cinzel', P.gold, 12, 'center', smooth(span(lt, 0.2, 1.4)) * 0.8);
      K.text(c, 'PROLOGUE', cx, cy - 58, '500 30px Cinzel', P.bone, 18, 'center', smooth(span(lt, 0.6, 1.8)) * 0.9);
      // THE NAME THEY BURIED, letter by letter out of an ember glow
      const word = 'THE NAME THEY BURIED', font = '600 92px Cinzel', sp = 10, lay = K.layer('pro:title', W, 220), lc = lay.getContext('2d');
      lc.font = font; lc.letterSpacing = '0px'; lc.textBaseline = 'alphabetic';
      const total = K.measure(c, word, font, sp); let x = cx - total / 2; const yb = 150;
      for (let i = 0; i < word.length; i++) {
        const ch = word[i], p = smooth(span(lt, 1.0 + i * 0.07, 2.2 + i * 0.07)), cw = lc.measureText(ch).width;
        if (p > 0 && ch !== ' ') {
          const hot = 1 - smooth(span(lt, 2.0 + i * 0.07, 4.2 + i * 0.07));
          lc.fillStyle = `rgb(${Math.round(lerp(241, 255, hot))},${Math.round(lerp(233, 150, hot))},${Math.round(lerp(216, 80, hot))})`;
          if (p < 1) { lc.globalAlpha = p * 0.2; for (const o of [-4, -2, 2, 4]) lc.fillText(ch, x + o * (1 - p) * 2, yb + (1 - p) * 8); }
          lc.globalAlpha = p * p; lc.fillText(ch, x, yb + (1 - p) * 8);
          if (hot > 0.05) K.glow(lc, x + cw / 2, yb - 34, 60, [255, 120, 50], 0.18 * hot * p);
        }
        x += cw + sp;
      }
      lc.globalAlpha = 1;
      c.drawImage(lay, 0, cy + 60 - yb);
      const rl = 260 * ease(span(lt, 2.4, 4.0));
      c.globalAlpha = A * 0.6; c.fillStyle = P.gold; c.fillRect(cx - rl, cy + 96, rl * 2, 1.2);
      c.restore();
    },
  };

  // ---------------------------------------------------------------- CHAPTER ONE / THE PAWN WHO WOULD NOT DIE
  function chapterCard(t) {
    const [a0, a1] = TL.chapter, lt = t - a0, A = win(t, a0, a1, 1.8, 2.0);
    if (A <= 0) return;
    const cx = W / 2, cy = H / 2 - 20;
    ctx.save(); ctx.globalAlpha = A;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(cx, cy + 40, 10, cx, cy + 40, 760); g.addColorStop(0, `rgba(120,132,150,${0.10 * smooth(span(lt, 0.5, 4))})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    K.specks(ctx, t, { kind: 'dust', n: 50, alpha: 0.28, seed: 881 });
    K.text(ctx, 'CROWNFALL : AETHELGARD', cx, cy - 140, '500 22px Cinzel', P.gold, 12, 'center', smooth(span(lt, 0.4, 1.6)) * 0.7);
    K.text(ctx, 'CHAPTER ONE', cx, cy - 66, '500 34px Cinzel', P.goldHi, 20, 'center', smooth(span(lt, 0.9, 2.2)));
    const big = 'THE PAWN WHO WOULD NOT DIE', bf = '600 76px Cinzel', p = smooth(span(lt, 1.6, 3.4));
    K.text(ctx, big, cx, cy + 34, bf, P.bone, 8, 'center', p);
    const bw = K.measure(ctx, big, bf, 8), rl = (bw / 2 + 30) * ease(span(lt, 2.6, 4.2));
    ctx.save(); ctx.globalAlpha = A * 0.6; ctx.fillStyle = P.gold; ctx.fillRect(cx - rl, cy + 72, rl * 2, 1.2); ctx.restore();
    K.text(ctx, '\u201CHe reached the last rank. Death sent him back to the first.\u201D', cx, cy + 150, 'italic 400 36px "EB Garamond"', P.bone, 1.5, 'center', smooth(span(lt, 4.4, 6.0)) * 0.9);
    ctx.restore();
  }

  // ---------------------------------------------------------------- subtitles (review copies; the game can use cues.vtt)
  // The narrator in plain type; Cael and the people of Aethelgard in warm italic (their Old Aethel and High Drakonic lines
  // in English); the voice in the dark in a pale, cold italic.
  function subtitle(t) {
    let cur = null; for (const s of TL.scenes) { if (t < s.start - 1 || t > s.end + 1) continue; for (const l of s.lines) if (t >= l.start - 0.15 && t <= l.end + 0.35) cur = l; }
    if (!cur) return;
    const a = win(t, cur.start - 0.15, cur.end + 0.35, 0.18, 0.28);
    const font = cur.speaker === 'narrator' ? '400 34px "EB Garamond"' : 'italic 400 36px "EB Garamond"';
    const col = cur.speaker === 'voice' ? '#cfd8e3' : cur.speaker !== 'narrator' ? '#f6d9b0' : '#f1e9d8';
    ctx.save(); ctx.font = font;
    const words = cur.text.split(' '), lines = []; let ln = '';
    for (const w of words) { const tst = ln ? ln + ' ' + w : w; if (ctx.measureText(tst).width > 1180 && ln) { lines.push(ln); ln = w; } else ln = tst; }
    lines.push(ln);
    const y0 = H - 92 - (lines.length - 1) * 42;
    const band = ctx.createLinearGradient(0, y0 - 70, 0, H); band.addColorStop(0, 'rgba(10,6,3,0)'); band.addColorStop(0.45, `rgba(10,6,3,${0.42 * a})`); band.addColorStop(1, `rgba(10,6,3,${0.5 * a})`);
    ctx.fillStyle = band; ctx.fillRect(0, y0 - 70, W, H - y0 + 70);
    lines.forEach((s, i) => {
      ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.filter = 'blur(6px)'; ctx.fillText(s, W / 2, y0 + i * 42 + 2); ctx.filter = 'none';
      ctx.fillStyle = col; ctx.fillText(s, W / 2, y0 + i * 42);
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- scenes and their joins
  function placeholder(c, t, sc) {
    c.fillStyle = '#120d0a'; c.fillRect(0, 0, W, H);
    K.text(c, `SCENE ${sc.n}`, W / 2, H / 2 - 30, '500 28px Cinzel', P.gold, 10, 'center', 0.8);
    K.text(c, sc.name, W / 2, H / 2 + 24, 'italic 400 40px "EB Garamond"', P.bone, 1, 'center', 0.8);
  }
  function drawScene(c, n, t) {
    const sc = K.scene(n), mod = SCENES[n];
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
      const A = K.layer('pro:prev'), B = K.layer('pro:next');
      drawScene(A.getContext('2d'), S[i - 1].n, t); drawScene(B.getContext('2d'), sc.n, t);
      ctx.drawImage(A, 0, 0); ctx.globalAlpha = smooth(u); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; return;
    }
    drawScene(ctx, sc.n, t);
  }

  // Work in progress, off by default (?paint=1, or --paint in the tools): the approved film renders without it.
  // The painterly finish (film/paint.js) goes over the eight scenes, not the title, the chapter card or the subtitles:
  // it comes up as the cold open's title gives way to scene 1. A scene may set its own look: SCENES[n].look.
  function paintOver(t, only) {
    if (!OPTS.paint || !K.paint) return;
    const S = TL.scenes, first = S.find(s => s.n === 1), n = only > 0 ? only : (S.find(s => t >= s.start && t < s.end) || S[S.length - 1]).n;
    const amount = only > 0 ? 1 : smooth(span(t, first.start - 0.3, first.start + 1.4));
    if (amount <= 0) return;
    K.paint(ctx, Object.assign({}, (SCENES[n] || {}).look, { amount }));
  }

  function renderAt(t) {
    t = clamp(t, 0, TOTAL);
    if (ctx.reset) ctx.reset();          // the whole drawing state back to default each frame: no frame depends on the last
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (OPTS.sceneOnly >= 0) { drawScene(ctx, OPTS.sceneOnly, t); if (OPTS.sceneOnly > 0) paintOver(t, OPTS.sceneOnly); }
    else {
      if (t < TL.chapter[0] + 2.0) { scenes(t); paintOver(t, -1); }
      if (t >= TL.chapter[0]) chapterCard(t);
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
    seqs: [{ id: 'prologue', start: 0, dur: TOTAL }],
  };
})();
