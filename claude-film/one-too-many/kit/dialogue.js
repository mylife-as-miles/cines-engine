/* ONE TOO MANY — the dialogue system. Every speaker has a type voice: face, colour, entrance behaviour, landing.
   For style frames each treatment is drawn as one frozen frame of its motion (p = entrance progress 0..1, default settled).
   OTM.say(ctx, who, text, x, y, opts) -> {x, y, w, h, end:[x,y]}
   who: scott | deena | angelo | kay | christof | marina | dispatcher | voice
   common opts: size, align ('left'|'center'|'right'; default 'left', but 'center' for voice and dispatcher), p (0..1), alpha, seed
   scott:      caret (bool), stress (0..1), cut (guillotine a trailing '--': a clean stub, the cut piece dropping away, the caret a clear step after), ash (yard colour), color
   deena:      pointTo [x,y] (a ruler line with one hard elbow, from whichever end of the line faces the target: right, left, above or below), soft (Archivo 500 when frightened)
   angelo:     spread (0..1 word tilt), blankSlot (bool: the unacknowledged extra card), final (lighter-cream, undealt, level), big:['five']
   kay:        p (<1 = breath wipe mid-way), lip (exit state: only the final glyph remains, in lipstick)
   christof:   arc (bool), big:['twelve-quid','drink'], dead:['get','play.'] (bulbs fail), last (bool)
   marina:     stress (0..1 grid failure), ringWord (word to circle with a wine ring)
   dispatcher: timer '00:03:24', band (true: the fixed upper band, centred: x,y ignored; bandY/bandX override, letterbox picks the live area), scan
   voice:      frame (required: OTM.frame object; text is cut through the paper), face ('angelo'|'scott'|'deena'...), depth (0..1) */
(function (global) {
  'use strict';
  const O = global.OTM; const { C, W, H, rng, rgba, layout, font } = O;

  const FACE = {
    scott: { family: 'Libre Franklin', weight: 500, size: 48, color: C.tScott },
    deena: { family: 'Archivo Black', weight: 400, size: 52, color: C.tDeena },
    angelo: { family: 'Oswald', weight: 500, size: 52, color: C.tAngelo },
    kay: { family: 'Cormorant Garamond', weight: 600, style: 'italic', size: 54, color: C.tKay },
    christof: { family: 'Abril Fatface', weight: 400, size: 54, color: C.tChristof },
    marina: { family: 'IBM Plex Mono', weight: 500, size: 44, color: C.tMarina },
    dispatcher: { family: 'Barlow Condensed', weight: 400, size: 46, color: C.tDispatcher },
  };

  function fontOf(o) { return font(o); }
  function measure(ctx, str, o) { ctx.save(); ctx.font = fontOf(o); ctx.letterSpacing = (o.tracking || 0) + 'px'; const w = ctx.measureText(str).width; ctx.restore(); return w; }
  function alignX(x, w, align) { return align === 'center' ? x - w / 2 : align === 'right' ? x - w : x; }

  function say(ctx, who, str, x, y, o) {
    o = Object.assign({ p: 1, alpha: 1, seed: 1 }, o || {});
    if (o.align == null) o.align = (who === 'voice' || who === 'dispatcher') ? 'center' : 'left';
    const F = Object.assign({}, FACE[who] || FACE.scott); if (o.size) F.size = o.size;
    ctx.save(); ctx.globalAlpha = o.alpha;
    let res;
    switch (who) {
      case 'scott': res = scott(ctx, str, x, y, F, o); break;
      case 'deena': res = deena(ctx, str, x, y, F, o); break;
      case 'angelo': res = angelo(ctx, str, x, y, F, o); break;
      case 'kay': res = kay(ctx, str, x, y, F, o); break;
      case 'christof': res = christof(ctx, str, x, y, F, o); break;
      case 'marina': res = marina(ctx, str, x, y, F, o); break;
      case 'dispatcher': res = dispatcher(ctx, str, x, y, F, o); break;
      case 'voice': res = voice(ctx, str, x, y, o); break;
    }
    ctx.restore(); return res;
  }

  // SCOTT — an everyman sans that tries to stay tidy. Types on like the text he never sent; a caret waits after him.
  function scott(ctx, str, x, y, F, o) {
    const stress = o.stress || 0; F.weight = stress > 0.5 ? 700 : 500; F.tracking = -F.size * 0.04 * stress; F.color = o.color || (o.ash ? C.ash : C.tScott);
    let cut = false; if (o.cut !== false && /--$/.test(str)) { cut = true; str = str.replace(/--$/, ''); }
    const L = layout(ctx, str, F); const w = L.width; const x0 = alignX(x, w, o.align); const r = rng('scott' + o.seed + str);
    ctx.font = fontOf(F); ctx.letterSpacing = (F.tracking || 0) + 'px'; ctx.fillStyle = F.color;
    const shown = Math.round(L.length * Math.min(1, o.p));
    L.forEach((g, i) => { if (i >= shown) return; const jy = stress > 0 ? (r() - 0.5) * 4 * stress : 0; ctx.fillText(g.ch, x0 + g.x, y + jy); });
    let endX = x0 + (shown ? L[shown - 1].x + L[shown - 1].w : 0), caretGap = F.size * 0.08;
    if (cut && o.p >= 1) {
      // guillotine (as in style frame 02): the dash is sliced clean by an invisible vertical edge, the cut-off piece drops well below
      // the line, and the caret waits a clear step after the cut so the two never read as one glyph
      const th = Math.max(4, F.size * 0.08), stub = F.size * 0.62, piece = F.size * 0.34, dx = endX + F.size * 0.08, dy = y - F.size * 0.34, cx = dx + stub;
      ctx.fillRect(dx, dy, stub, th);
      ctx.save(); ctx.globalAlpha *= 0.42; ctx.translate(cx + F.size * 0.04, dy + F.size * 0.5); ctx.rotate(0.5); ctx.fillRect(0, 0, piece, th); ctx.restore();
      endX = cx; caretGap = F.size * 0.46;
    }
    if (o.caret) { ctx.fillStyle = F.color; ctx.fillRect(endX + caretGap, y - F.size * 0.78, Math.max(2, F.size * 0.045), F.size * 0.92); }
    return { x: x0, y, w: endX - x0, h: F.size, end: [endX, y] };
  }

  // DEENA — heavy, blunt; hard cut on, hard cut off. Her type points at what she means.
  function deena(ctx, str, x, y, F, o) {
    if (o.soft) { F.family = 'Archivo'; F.weight = 500; }
    const w = measure(ctx, str, F); const x0 = alignX(x, w, o.align);
    O.text(ctx, str, x0, y, Object.assign({}, F, { color: F.color }));
    if (o.pointTo) {
      const [tx, ty] = o.pointTo; let sx = x0 + w + F.size * 0.25, sy = y - F.size * 0.32;
      if (tx < x0) sx = x0 - F.size * 0.25;                                                     // the target is to the left: leave from the first letter
      else if (tx <= x0 + w) { sx = tx; sy = ty < y - F.size * 0.5 ? y - F.size * 0.98 : y + F.size * 0.24; }   // above or below the words: drop straight from them
      ctx.strokeStyle = F.color; ctx.lineWidth = 3; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(sx, sy);
      const mx = Math.abs(tx - sx) > Math.abs(ty - sy) ? tx : sx; // one hard elbow, like a ruler
      ctx.lineTo(mx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.fillStyle = F.color; ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 7); ctx.fill();
    }
    return { x: x0, y, w, h: F.size, end: [x0 + w, y] };
  }

  // ANGELO — a poor magician's dealt hand. Words flick out and land in a row, slightly crooked.
  function angelo(ctx, str, x, y, F, o) {
    if (o.final) {
      F.family = 'Oswald'; F.weight = 300; F.color = C.lighterCream; if (!o.size) F.size = 48;
      const w = measure(ctx, str, F); const x0 = alignX(x, w, o.align); O.text(ctx, str, x0, y, F); return { x: x0, y, w, h: F.size, end: [x0 + w, y] };
    }
    const words = str.split(' '); const r = rng('deal' + o.seed + str); const spread = o.spread || 0; const big = (o.big || []).map(s => s.toLowerCase());
    const gap = F.size * 0.28; const items = words.map(wd => { const isBig = big.includes(wd.toLowerCase().replace(/[^a-z]/g, '')); const f2 = Object.assign({}, F, { size: isBig ? F.size * 1.6 : F.size }); return { wd, f2, w: measure(ctx, wd, f2) }; });
    let total = items.reduce((a, it) => a + it.w + gap, -gap); if (o.blankSlot) total += gap + F.size * 0.9;
    let cx = alignX(x, total, o.align); const dealt = Math.round(items.length * Math.min(1, o.p));
    items.forEach((it, i) => {
      if (i >= dealt) return;
      const rot = ((r() - 0.5) * 2) * (2 + 7 * spread) * Math.PI / 180, dy = (r() - 0.5) * (4 + 10 * spread);
      ctx.save(); ctx.translate(cx + it.w / 2, y + dy); ctx.rotate(rot); O.text(ctx, it.wd, -it.w / 2, 0, it.f2); ctx.restore(); cx += it.w + gap;
    });
    if (o.p < 1 && dealt < items.length) { // the next word mid-flight: tilted, smaller, trailing
      const it = items[dealt]; ctx.save(); ctx.globalAlpha *= 0.85; ctx.translate(cx + it.w * 0.3, y - F.size * 0.9); ctx.rotate(-0.42); O.text(ctx, it.wd, 0, 0, Object.assign({}, it.f2, { size: it.f2.size * 0.86 })); ctx.restore();
    }
    if (o.blankSlot) { // the extra card nobody dealt: a card-width hole in the row, with the faintest edge
      const cw = F.size * 0.7, ch = F.size * 0.98; ctx.save(); ctx.globalAlpha *= 0.16; ctx.strokeStyle = F.color; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
      ctx.translate(cx + cw / 2, y - ch * 0.4); ctx.rotate(0.05); ctx.strokeRect(-cw / 2, -ch / 2, cw, ch); ctx.restore(); cx += cw + gap;
    }
    return { x: alignX(x, total, o.align), y, w: total, h: F.size, end: [cx, y] };
  }

  // KAY — written on like breath on glass; leaves only her last glyph, in lipstick.
  function kay(ctx, str, x, y, F, o) {
    const L = layout(ctx, str, F); const w = L.width; const x0 = alignX(x, w, o.align);
    if (o.lip) { const g = L[L.length - 1]; const last = /[.?!]/.test(g.ch) && L.length > 1 ? L[L.length - 2] : g; O.text(ctx, str.slice(0, -1).length && last === g ? g.ch : (last.ch + (last === g ? '' : g.ch)), x0 + last.x, y, Object.assign({}, F, { color: C.tKayLip })); return { x: x0, y, w, h: F.size, end: [x0 + w, y] }; }
    const edge = x0 + w * Math.min(1, o.p);
    // resolved part: sharp
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, y - F.size * 1.3, edge - x0 + 10 - F.size * 0.5, F.size * 1.8); ctx.clip(); O.text(ctx, str, x0, y, F); ctx.restore();
    if (o.p < 1) {
      // the breath edge: glyphs still fogged, resolving left to right
      ctx.save(); ctx.beginPath(); ctx.rect(edge - F.size * 0.5, y - F.size * 1.3, F.size * 0.9, F.size * 1.8); ctx.clip(); ctx.filter = 'blur(2px)'; O.text(ctx, str, x0, y, Object.assign({}, F, { alpha: 0.7 })); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(edge + F.size * 0.4, y - F.size * 1.3, w, F.size * 1.8); ctx.clip(); ctx.filter = 'blur(7px)'; O.text(ctx, str, x0, y, Object.assign({}, F, { alpha: 0.3 })); ctx.restore();
    } else { O.text(ctx, str, x0, y, F); }
    if (o.lipLast) { const g = L[L.length - 1]; O.text(ctx, g.ch, x0 + g.x, y, Object.assign({}, F, { color: C.tKayLip })); }
    return { x: x0, y, w, h: F.size, end: [x0 + w, y] };
  }

  // CHRISTOF — a fat Didone marquee on a smile-shaped arc; bulbs come on letter by letter.
  function christof(ctx, str, x, y, F, o) {
    const words = str.split(' '); const big = (o.big || []).map(s => s.toLowerCase()); const dead = (o.dead || []).map(s => s.toLowerCase());
    const gap = F.size * 0.3; const items = words.map(wd => { const f2 = Object.assign({}, F, { size: big.includes(wd.toLowerCase()) ? F.size * 1.4 : F.size }); return { wd, f2, w: measure(ctx, wd, f2) }; });
    const total = items.reduce((a, it) => a + it.w + gap, -gap); let cx = alignX(x, total, o.align); const n = items.length;
    const lit = Math.min(1, o.p) * str.replace(/ /g, '').length; let k = 0;
    items.forEach((it, i) => {
      const u = n > 1 ? i / (n - 1) - 0.5 : 0; const ang = (o.arc === false ? 0 : u * 2 * 4) * Math.PI / 180; const dy = (o.arc === false ? 0 : -(1 - (u * 2) ** 2) * F.size * 0.18);
      const isDead = dead.includes(it.wd.toLowerCase());
      ctx.save(); ctx.translate(cx, y + dy); ctx.rotate(ang);
      const L = layout(ctx, it.wd, it.f2); ctx.font = fontOf(it.f2); ctx.fillStyle = it.f2.color;
      L.forEach(g => { const on = k++ < lit; ctx.globalAlpha = (isDead ? 0.32 : on ? 1 : 0.22) * (o.alpha == null ? 1 : o.alpha); ctx.fillText(g.ch, g.x, 0); if (on && !isDead && o.bulbs) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFF6E0'; ctx.beginPath(); ctx.arc(g.x + g.w / 2, -it.f2.size * 0.86, 1.6, 0, 7); ctx.fill(); ctx.restore(); } });
      ctx.restore(); cx += it.w + gap;
    });
    return { x: alignX(x, total, o.align), y, w: total, h: F.size, end: [cx, y] };
  }

  // MARINA — exacting mono on a strict grid; full stops are tiny wine rings. Under stress the grid drifts.
  function marina(ctx, str, x, y, F, o) {
    const stress = o.stress || 0; const cell = measure(ctx, 'M', F); const n = str.length; const w = cell * n; const x0 = alignX(x, w, o.align); const r = rng('grid' + str + o.seed);
    ctx.strokeStyle = rgba(F.color, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 6, y + F.size * 0.28); ctx.lineTo(x0 + w + 6, y + F.size * 0.28); ctx.stroke();
    ctx.fillStyle = rgba(F.color, 0.35); for (let i = 0; i <= n; i++) ctx.fillRect(x0 + i * cell - 0.5, y + F.size * 0.28 - 4, 1, 4);
    const shown = Math.round(n * Math.min(1, o.p)); ctx.font = fontOf(F); ctx.fillStyle = F.color;
    for (let i = 0; i < shown; i++) {
      const ch = str[i]; const jx = (r() - 0.5) * 6 * stress, jy = (r() - 0.5) * 6 * stress + stress * i * 0.6; const cx = x0 + i * cell + jx;
      if (ch === '.') { ctx.save(); ctx.strokeStyle = F.color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx + cell * 0.5, y - F.size * 0.06 + jy, F.size * 0.085, 0, 7); ctx.stroke(); ctx.restore(); }
      else ctx.fillText(ch, cx, y + jy);
    }
    if (o.ringWord) { const i = str.indexOf(o.ringWord); if (i >= 0) { const cx = x0 + (i + o.ringWord.length / 2) * cell, rw = cell * o.ringWord.length * 0.62; ctx.save(); ctx.strokeStyle = rgba(C.wine, 0.95); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, y - F.size * 0.3, rw, F.size * 0.62, -0.06, 0.2, Math.PI * 2 - 0.15); ctx.stroke(); ctx.restore(); } }
    if (shown < n) { ctx.fillStyle = rgba(F.color, 0.8); ctx.fillRect(x0 + shown * cell + 2, y - F.size * 0.75, cell - 4, F.size * 0.9); }
    return { x: x0, y, w, h: F.size, end: [x0 + w, y] };
  }

  // DISPATCHER — a fixed line, always the same band; narrowband scanline offsets; the call timer above.
  function dispatcher(ctx, str, x, y, F, o) {
    if (o.band || o.bandY != null) {
      const live = O.liveArea(o.letterbox || 1.7778); y = o.bandY != null ? o.bandY : live.top + 184;
      if (o.band) { x = o.bandX != null ? o.bandX : W / 2; o = Object.assign({}, o, { align: 'center' }); }
    }
    const w = measure(ctx, str, F); const x0 = alignX(x, w, o.align || 'center');
    if (o.timer) O.text(ctx, o.timer, x0 + w / 2, y - F.size * 1.15, { family: 'Barlow Condensed', weight: 600, size: 28, color: C.phoneWhite, tracking: 4, align: 'center', alpha: 0.85 });
    // narrowband: the line is drawn in 3px slices, a few nudged sideways
    const tmp = O.makeCanvas(Math.ceil(w) + 40, Math.ceil(F.size * 1.6)); const g = tmp.getContext('2d'); O.text(g, str, 20, F.size * 1.15, F);
    const r = rng('scan' + str); const scan = o.scan == null ? 1 : o.scan;
    for (let sy = 0; sy < tmp.height; sy += 3) { const off = r() < 0.12 * scan ? (r() - 0.5) * 6 * scan : 0; ctx.drawImage(tmp, 0, sy, tmp.width, 3, x0 - 20 + off, y - F.size * 1.15 + sy, tmp.width, 3); }
    return { x: x0, y, w, h: F.size, end: [x0 + w, y] };
  }

  // VOICE (O.S.) — no face of its own. It borrows the face of the person it echoes, and it is cut out of the world.
  function voice(ctx, str, x, y, o) {
    const F = Object.assign({}, FACE[o.face || 'angelo']); if (o.size) F.size = o.size; F.align = o.align || 'center';
    const w = o.frame.knockoutText(str, x, y, F, o.depth == null ? 1 : o.depth);
    return { x: alignX(x, w, F.align), y, w, h: F.size, end: [x + w, y] };
  }

  global.OTM.say = say; global.OTM.FACE = FACE;
})(window);
