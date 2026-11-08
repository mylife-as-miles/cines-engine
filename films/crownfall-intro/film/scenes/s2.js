/* Scene 2, The Fall of the Crown [L06–L11].
   The Sovereign Crown, in gold leaf, cracks and shatters; its shards rain onto the map of Aethelgard and the land
   darkens with ash; the Scavenger Wars flare across it. Four roundels on a chronicle page name the powers that endured
   (Korvenia beneath a violet eclipse, Solforiz's smoking mineral deserts, Kwind's towers in steam and rain, and
   Aethelgard); the camera goes into Aethelgard's roundel and the map rises into a diorama of mountains and forests,
   where seven flames burn for the seven families. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const SCENES = window.SCENES = window.SCENES || {};
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const INKC = a => `rgba(32,21,12,${a})`;

  // ---------------------------------------------------------------- the Sovereign Crown, in leaf, and its shards
  const CW = 760, CH = 520, CS = 1.5;              // crown sheet in its own units (centred on 0,0), pixels per unit
  function crownPath(c) {
    c.beginPath();
    c.moveTo(-330, 170); c.lineTo(-330, 60); c.lineTo(-372, -150); c.quadraticCurveTo(-300, -40, -220, -20);
    c.lineTo(-170, -205); c.quadraticCurveTo(-115, -60, -60, -40); c.lineTo(0, -250); c.lineTo(60, -40); c.quadraticCurveTo(115, -60, 170, -205);
    c.lineTo(220, -20); c.quadraticCurveTo(300, -40, 372, -150); c.lineTo(330, 60); c.lineTo(330, 170); c.closePath();
  }
  function crownSheet() {
    return K.cached('s2:crown', () => {
      const c = K.canvas(CW * CS, CH * CS), x = c.getContext('2d'); x.scale(CS, CS); x.translate(CW / 2, CH / 2 + 20);
      K.gold(x, crownPath, -372, -250, 372, 170, { sheen: 0.42, outlineW: 2.4 });
      // the band, its jewels and the engraver's lines
      K.gold(x, cc => { cc.beginPath(); cc.rect(-336, 70, 672, 104); }, -336, 70, 336, 174, { sheen: 0.6, outlineW: 2 });
      x.strokeStyle = INKC(0.55); x.lineWidth = 1.2; for (const yy of [84, 160]) { x.beginPath(); x.moveTo(-330, yy); x.lineTo(330, yy); x.stroke(); }
      for (let i = -5; i <= 5; i++) { const jx = i * 58, red = i % 2 === 0; x.beginPath(); x.ellipse(jx, 122, red ? 20 : 15, red ? 26 : 20, 0, 0, 6.283); const g = x.createRadialGradient(jx - 6, 112, 2, jx, 122, 26); g.addColorStop(0, red ? '#f08a70' : '#8fa8f0'); g.addColorStop(0.5, red ? '#9b2f1f' : '#2c3f78'); g.addColorStop(1, red ? '#4a120c' : '#141d3e'); x.fillStyle = g; x.fill(); x.strokeStyle = INKC(0.85); x.lineWidth = 1.6; x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(jx - 6, 112, 4, 6, -0.5, 0, 6.283); x.fill(); }
      for (const [px, py, r] of [[0, -250, 20], [-170, -205, 16], [170, -205, 16], [-372, -150, 14], [372, -150, 14]]) { x.beginPath(); x.arc(px, py - r * 0.6, r, 0, 6.283); const g = x.createRadialGradient(px - r * 0.3, py - r, 1, px, py - r * 0.6, r); g.addColorStop(0, '#fff3c8'); g.addColorStop(0.4, '#e0b860'); g.addColorStop(1, '#6e4f1d'); x.fillStyle = g; x.fill(); x.strokeStyle = INKC(0.85); x.lineWidth = 1.5; x.stroke(); }
      x.save(); crownPath(x); x.clip(); x.strokeStyle = 'rgba(90,60,20,0.35)'; x.lineWidth = 1; for (let k = -400; k < 400; k += 9) { x.beginPath(); x.moveTo(k, -260); x.lineTo(k + 140, 70); x.stroke(); } x.restore();
      return c;
    });
  }
  // shards: a jittered triangulation of the crown's box; each shard is clipped from the sheet and flies on its own path
  const SHARDS = (() => {
    const r = rng(2026), cols = 9, rows = 6, pts = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const edge = i === 0 || j === 0 || i === cols || j === rows; pts.push([-380 + i * 760 / cols + (edge ? 0 : (r() - 0.5) * 60), -260 + j * 440 / rows + (edge ? 0 : (r() - 0.5) * 50)]); }
    const tris = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; if ((i + j) % 2) { tris.push([pts[a], pts[b], pts[d]], [pts[a], pts[d], pts[c]]); } else { tris.push([pts[a], pts[b], pts[c]], [pts[b], pts[d], pts[c]]); } }
    // where each lands on the map (one at Heofon-ban, the shard site), and how it travels
    return tris.map((tr, k) => {
      const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3, cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3;
      const land = k === 7 ? [825, 248] : [100 + r() * 1800, 80 + r() * 1500];
      return { tr, cx, cy, vx: cx * (1.2 + r()) + (r() - 0.5) * 300, vy: cy * (1 + r()) - 200 - r() * 300, rot: (r() - 0.5) * 8, land, delay: r() * 0.5, spin: (r() - 0.5) * 3 };
    });
  })();
  // cracks run along shard edges before the break
  const CRACKS = SHARDS.flatMap(s => [[s.tr[0], s.tr[1]], [s.tr[1], s.tr[2]]]).filter((e, i) => i % 3 !== 1);

  // ---------------------------------------------------------------- the four roundels
  const RD = { aeth: { x: 0, y: -250, r: 240 }, korv: { x: -600, y: 140, r: 200 }, solf: { x: 0, y: 360, r: 200 }, kwind: { x: 600, y: 140, r: 200 } };
  function roundelFrame(c, R, lit, t, name) {
    K.gold(c, cc => { cc.beginPath(); cc.arc(R.x, R.y, R.r + 16, 0, 6.283); cc.arc(R.x, R.y, R.r, 0, 6.283); }, R.x - R.r, R.y - R.r, R.x + R.r, R.y + R.r, { sheen: 0.3 + 0.5 * lit, outlineW: 1.6, rule: 'evenodd' });
    c.save(); c.strokeStyle = 'rgba(155,47,31,0.7)'; c.lineWidth = 2; c.setLineDash([4, 6]); c.beginPath(); c.arc(R.x, R.y, R.r + 26, 0, 6.283); c.stroke(); c.restore();
    K.text(c, name, R.x, R.y + R.r + 66, '600 34px Cinzel', lit > 0.5 ? '#7a5418' : INKC(0.6), 12, 'center', 0.55 + 0.45 * lit);
  }
  function inRoundel(c, R, fn) { c.save(); c.beginPath(); c.arc(R.x, R.y, R.r, 0, 6.283); c.clip(); c.translate(R.x, R.y); fn(c, R.r); c.restore(); }
  function korvenia(c, r, t, lit) {
    let g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#1d1230'); g.addColorStop(0.6, '#5a3d6e'); g.addColorStop(1, '#8a6a86'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    // the eclipse: a black sun with a violet corona
    const ex = r * 0.18, ey = -r * 0.36, er = r * 0.26;
    c.save(); c.globalCompositeOperation = 'lighter'; const cg = c.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 2.6); cg.addColorStop(0, `rgba(220,200,255,${0.75 * (0.85 + 0.15 * Math.sin(t * 2))})`); cg.addColorStop(0.25, 'rgba(160,110,230,0.35)'); cg.addColorStop(1, 'rgba(80,40,140,0)'); c.fillStyle = cg; c.beginPath(); c.arc(ex, ey, er * 2.6, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(220,200,255,0.25)'; c.lineWidth = 1.2; for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283 + t * 0.05, l = er * (1.4 + 0.8 * K.noise(k * 1.7, t * 0.6, 3)); c.beginPath(); c.moveTo(ex + Math.cos(a) * er, ey + Math.sin(a) * er); c.lineTo(ex + Math.cos(a) * l, ey + Math.sin(a) * l); c.stroke(); } c.restore();
    c.fillStyle = '#07040b'; c.beginPath(); c.arc(ex, ey, er, 0, 6.283); c.fill();
    // a city of spires
    const rr = rng(71); c.fillStyle = '#140b1c';
    for (let i = 0; i < 26; i++) { const x0 = -r + i * (2 * r / 26) + (rr() - 0.5) * 8, w = 10 + rr() * 22, h = r * (0.25 + rr() * 0.55) * (1 - Math.abs(x0) / r * 0.5); c.beginPath(); c.moveTo(x0, r); c.lineTo(x0, r * 0.95 - h); c.lineTo(x0 + w / 2, r * 0.95 - h - w * 1.6); c.lineTo(x0 + w, r * 0.95 - h); c.lineTo(x0 + w, r); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(230,210,255,0.85)'; for (let i = 0; i < 60; i++) { const wx = (rr() - 0.5) * 1.8 * r, wy = r * (0.45 + rr() * 0.45); if ((Math.floor(t * 0.7 + i) % 7) !== 0) c.fillRect(wx, wy, 2.2, 3.2); }
    c.fillStyle = `rgba(200,170,230,${0.12 + 0.04 * Math.sin(t)})`; c.fillRect(-r, r * 0.55, 2 * r, r * 0.12);
  }
  function solforiz(c, r, t, lit) {
    let g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#c98f4a'); g.addColorStop(0.55, '#ecc888'); g.addColorStop(1, '#d8a868'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    c.save(); c.globalCompositeOperation = 'lighter'; const sg = c.createRadialGradient(-r * 0.3, -r * 0.45, 0, -r * 0.3, -r * 0.45, r * 0.5); sg.addColorStop(0, 'rgba(255,240,200,0.8)'); sg.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = sg; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
    // mesas
    c.fillStyle = '#9a5f32'; c.beginPath(); c.moveTo(-r * 0.9, r * 0.2); c.lineTo(-r * 0.75, -r * 0.08); c.lineTo(-r * 0.35, -r * 0.08); c.lineTo(-r * 0.22, r * 0.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(r * 0.25, r * 0.22); c.lineTo(r * 0.36, r * 0.02); c.lineTo(r * 0.7, r * 0.02); c.lineTo(r * 0.85, r * 0.22); c.closePath(); c.fill();
    // smoke from the mineral vents
    K.smoke(c, t, { n: 16, x: -r * 0.7, y: -r * 0.9, w: r * 1.4, h: r * 1.05, color: [92, 70, 52], alpha: 0.4, size: r * 0.42, rise: 22, seed: 33 });
    // dunes, back to front, with ink ridges
    const cols = ['#d29a58', '#c2833f', '#a96a30', '#8a5124'];
    cols.forEach((col, k) => { const y0 = r * (0.15 + k * 0.2); c.fillStyle = col; c.beginPath(); c.moveTo(-r, r); for (let i = 0; i <= 40; i++) { const u = i / 40, x = -r + u * 2 * r, y = y0 + Math.sin(u * 6 + k * 1.7) * r * 0.05 + Math.sin(u * 13 + k) * r * 0.015; c.lineTo(x, y); } c.lineTo(r, r); c.closePath(); c.fill(); c.strokeStyle = INKC(0.4); c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, x = -r + u * 2 * r, y = y0 + Math.sin(u * 6 + k * 1.7) * r * 0.05 + Math.sin(u * 13 + k) * r * 0.015; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); });
    c.fillStyle = 'rgba(230,240,235,0.55)'; for (let i = 0; i < 18; i++) { const rr = rng(400 + i); c.beginPath(); c.ellipse((rr() - 0.5) * 1.6 * r, r * (0.4 + rr() * 0.5), 6 + rr() * 10, 2 + rr() * 2, 0, 0, 6.283); c.fill(); }
  }
  function kwind(c, r, t, lit) {
    let g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#2c3540'); g.addColorStop(0.7, '#5d6a76'); g.addColorStop(1, '#3a434c'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    const rr = rng(909);
    const towers = Array.from({ length: 14 }, (_, i) => ({ x: -r + i * (2 * r / 14) + (rr() - 0.5) * 10, w: 18 + rr() * 26, h: r * (0.5 + rr() * 0.9), chim: rr() < 0.45 }));
    for (const tw of towers) {
      c.fillStyle = '#161b21'; c.fillRect(tw.x, r - tw.h, tw.w, tw.h);
      c.fillStyle = 'rgba(240,190,90,0.85)'; for (let k = 0; k < tw.h / 9; k++) for (let j = 0; j < tw.w / 7; j++) if (rr() < 0.22) c.fillRect(tw.x + 2 + j * 7, r - tw.h + 4 + k * 9, 3, 4);
      c.strokeStyle = 'rgba(20,24,30,0.9)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tw.x + tw.w / 2, r - tw.h); c.lineTo(tw.x + tw.w / 2, r - tw.h - 22); c.stroke();
      if (tw.chim) { c.fillStyle = '#10141a'; c.fillRect(tw.x + tw.w * 0.6, r - tw.h - 50, 9, 50); }
    }
    // a gantry crane
    c.strokeStyle = '#0e1216'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * 0.2, r); c.lineTo(-r * 0.2, -r * 0.55); c.lineTo(r * 0.45, -r * 0.55); c.stroke(); c.lineWidth = 1.2; for (let k = 0; k < 10; k++) { c.beginPath(); c.moveTo(-r * 0.2 + k * r * 0.065, -r * 0.55); c.lineTo(-r * 0.2 + (k + 1) * r * 0.065, -r * 0.5); c.stroke(); }
    // steam and rain
    for (const tw of towers.filter(q => q.chim)) K.smoke(c, t, { n: 6, x: tw.x + tw.w * 0.6 - 30, y: r - tw.h - 260, w: 60, h: 220, color: [210, 216, 222], alpha: 0.45, size: 90, rise: 26, seed: Math.floor(tw.x) + 500 });
    c.save(); c.strokeStyle = 'rgba(200,214,226,0.5)'; c.lineWidth = 1; const r2 = rng(77); for (let i = 0; i < 90; i++) { const x0 = (r2() - 0.5) * 2.4 * r, y0 = ((r2() * 2 * r + t * 700 * (0.7 + r2() * 0.3)) % (2 * r + 40)) - r - 20; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - 6, y0 + 22); c.stroke(); } c.restore();
  }
  function aethel(c, r, t, lit) {
    let g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#8fa3b2'); g.addColorStop(0.55, '#e3d6bb'); g.addColorStop(1, '#c6b48c'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    const ranges = [['#8496a6', 0.05, 0.42, 3], ['#5f7182', 0.2, 0.5, 5], ['#3d4a56', 0.36, 0.4, 7]];
    ranges.forEach(([col, base, amp, seed]) => { const rr = rng(seed); c.fillStyle = col; c.beginPath(); c.moveTo(-r, r); let x = -r; c.lineTo(x, r * base); while (x < r) { const w = r * (0.18 + rr() * 0.22), h = r * amp * (0.4 + rr() * 0.6); c.lineTo(x + w / 2, r * base - h); x += w; c.lineTo(x, r * base - h * 0.1 * rr()); } c.lineTo(r, r); c.closePath(); c.fill(); });
    // the volcano and its plume
    c.fillStyle = '#2a2622'; c.beginPath(); c.moveTo(r * 0.05, r * 0.4); c.lineTo(r * 0.3, -r * 0.3); c.lineTo(r * 0.38, -r * 0.3); c.lineTo(r * 0.65, r * 0.4); c.closePath(); c.fill();
    K.glow(c, r * 0.34, -r * 0.3, r * 0.16, [255, 120, 50], 0.5 + 0.1 * Math.sin(t * 3));
    K.smoke(c, t, { n: 10, x: r * 0.1, y: -r * 1.2, w: r * 0.6, h: r * 0.9, color: [70, 64, 60], alpha: 0.45, size: r * 0.4, rise: 16, seed: 21 });
    // snow
    c.fillStyle = 'rgba(244,246,248,0.85)'; const rr = rng(5); for (let i = 0; i < 6; i++) { const x0 = (rr() - 0.5) * 1.6 * r, y0 = r * (0.05 - rr() * 0.35); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 14, y0 + 16); c.lineTo(x0 - 14, y0 + 16); c.closePath(); c.fill(); }
    // forest
    c.fillStyle = '#1e2a22'; const rf = rng(17); for (let i = 0; i < 70; i++) { const x0 = -r + rf() * 2 * r, y0 = r * (0.62 + rf() * 0.4), h = 22 + rf() * 30; c.beginPath(); c.moveTo(x0, y0 - h); c.lineTo(x0 + h * 0.3, y0); c.lineTo(x0 - h * 0.3, y0); c.closePath(); c.fill(); }
    c.strokeStyle = 'rgba(220,235,245,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * 0.6, r); c.quadraticCurveTo(-r * 0.2, r * 0.7, r * 0.1, r * 0.6); c.stroke();
  }

  // ---------------------------------------------------------------- the diorama: the map tilted, mountains standing up
  function project(u, v, h, V) {
    const du = u - V.cx, dv = v - V.cy, s = Math.sin(V.th), c = Math.cos(V.th);
    const y = dv * c - h * s, z = V.D - dv * s - h * c; if (z < 30) return null;
    return [W / 2 + V.f * du / z, H / 2 + V.oy + V.f * y / z, V.f / z];
  }
  function diorama(ctx, V, t, flames) {
    const paper = K.map.paper(), ink = K.map.ink(), SC = K.map.SC, N = 110;
    ctx.fillStyle = '#d9c9a5'; ctx.fillRect(0, 0, W, H);
    // sky haze at the top where the map falls away
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.5); sky.addColorStop(0, '#6f7c84'); sky.addColorStop(1, '#d6c9ab'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.6);
    for (let i = 0; i < N; i++) {
      const v0 = 1650 * i / N, v1 = 1650 * (i + 1) / N, a = project(0, v0, 0, V), b = project(0, v1, 0, V); if (!a || !b) continue;
      const vm = (v0 + v1) / 2, m = project(0, vm, 0, V), s = m[2], xl = W / 2 + V.f * (0 - V.cx) / (V.f / s), y0 = a[1], y1 = b[1];
      if (y1 < -5 || y0 > H + 5) continue;
      const wpx = 2000 * s, xL = W / 2 + (0 - V.cx) * s; void xl;
      ctx.drawImage(paper, 0, v0 * SC, paper.width, (v1 - v0) * SC + 1, xL, y0, wpx, y1 - y0 + 1);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ink, 0, v0 * SC, ink.width, (v1 - v0) * SC + 1, xL, y0, wpx, y1 - y0 + 1); ctx.restore();
    }
    // distance haze over the far map
    const hz = ctx.createLinearGradient(0, 0, 0, H * 0.7); hz.addColorStop(0, 'rgba(200,200,196,0.75)'); hz.addColorStop(0.6, 'rgba(210,200,180,0.15)'); hz.addColorStop(1, 'rgba(210,200,180,0)'); ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H * 0.7);
    // mountains stand up from the page along the spine, far to near
    const peaks = K.cached('s2:standing', () => { const r = rng(808), out = []; for (const p of K.map.D.peaks) if (r() < 0.32) out.push({ u: p[0], v: p[1], s: p[2] * 1.5, seed: Math.floor(r() * 1e6) }); for (const p of Object.values(K.map.D.places)) if (p.kind === 'volcano') out.push({ u: p.x, v: p.y, s: (p.s || 50) * 2.1, volc: true, seed: 5 }); return out.sort((a, b) => a.v - b.v); });
    const rise = V.rise;
    if (rise > 0.04) for (const p of peaks) {
      const base = project(p.u, p.v, 0, V); if (!base || base[1] < -200 || base[1] > H + 300) continue;
      const top = project(p.u, p.v, p.s * 1.3 * rise, V), sc = base[2], wd = p.s * 0.8 * sc; if (!top) continue;
      const r = rng(p.seed), lean = (r() - 0.5) * wd * 0.3;
      ctx.save(); ctx.globalAlpha = smooth(rise * 1.6);
      ctx.beginPath(); ctx.moveTo(base[0] - wd, base[1]); ctx.lineTo(top[0] + lean - (p.volc ? wd * 0.14 : 0), top[1]); if (p.volc) ctx.lineTo(top[0] + lean + wd * 0.14, top[1]); ctx.lineTo(base[0] + wd, base[1]); ctx.closePath();
      const g = ctx.createLinearGradient(base[0] - wd, 0, base[0] + wd, 0); g.addColorStop(0, '#e6dcc4'); g.addColorStop(0.5, '#cbbd9e'); g.addColorStop(0.52, '#8c7f68'); g.addColorStop(1, '#6d634f'); ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = INKC(0.45); ctx.lineWidth = Math.max(0.6, sc * 1.1); for (let k = 0; k < 12; k++) { const u = k / 12, ax = lerp(top[0] + lean, base[0] + wd, u), ay = lerp(top[1], base[1], u); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - wd * 0.5, ay + (base[1] - top[1]) * 0.5); ctx.stroke(); } ctx.restore();
      ctx.strokeStyle = INKC(0.85); ctx.lineWidth = Math.max(0.8, sc * 1.8); ctx.beginPath(); ctx.moveTo(base[0] - wd, base[1]); ctx.lineTo(top[0] + lean, top[1]); ctx.lineTo(base[0] + wd, base[1]); ctx.stroke();
      if (!p.volc && rise > 0.5) { ctx.fillStyle = 'rgba(248,248,246,0.85)'; ctx.beginPath(); ctx.moveTo(top[0] + lean, top[1]); ctx.lineTo(lerp(top[0] + lean, base[0] - wd, 0.22), lerp(top[1], base[1], 0.22)); ctx.lineTo(lerp(top[0] + lean, base[0] + wd, 0.18), lerp(top[1], base[1], 0.2)); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      if (p.volc) { K.glow(ctx, top[0] + lean, top[1], wd * 0.5, [255, 110, 40], 0.55 * rise); K.smoke(ctx, t, { n: 7, x: top[0] + lean - wd * 0.6, y: top[1] - wd * 3, w: wd * 1.2, h: wd * 3, color: [70, 62, 58], alpha: 0.4 * rise, size: wd * 1.4, rise: 18, seed: Math.floor(p.u) }); }
    }
    // seven flames for the seven families, standing on their halls
    if (flames > 0) K.map.halls().forEach((hl, i) => {
      const a = smooth(clamp(flames * 2.2 - i * 0.18)); if (a <= 0) return;
      const b = project(hl.x, hl.y, 0, V); if (!b) return; const s = b[2] * 2.4, fl = 1 + 0.12 * Math.sin(t * 11 + i * 3) + 0.08 * Math.sin(t * 17 + i);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b[0], b[1]); ctx.scale(s, s * fl);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-8, -5, -7, -14, 0, -28); ctx.bezierCurveTo(1, -18, 8, -14, 6, -5); ctx.quadraticCurveTo(4, 0, 0, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, -28); g.addColorStop(0, '#9b2f1f'); g.addColorStop(0.5, '#e08a30'); g.addColorStop(1, '#f8dc86'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      K.glow(ctx, b[0], b[1] - 12 * s, 60 * s, [255, 170, 80], 0.5 * a);
    });
    // mist drifting low over the land
    K.smoke(ctx, t, { n: 14, x: -200, y: H * 0.3, w: W + 400, h: H * 0.5, color: [236, 230, 216], alpha: 0.18, size: 520, rise: 3, drift: 6, seed: 61 });
  }

  // ---------------------------------------------------------------- the scene
  SCENES[2] = {
    join: 'dissolve', joinDur: 1.4,
    draw(ctx, t, sc) {
      const L6 = K.cue('L06'), L7 = K.cue('L07'), L8 = K.cue('L08'), L9 = K.cue('L09'), L10 = K.cue('L10'), L11 = K.cue('L11');
      const tBreak = L6.start + 2.0;                     // "...shattered."
      const tRoundels = L9.start - 0.4, tDive = L11.start + 0.6;
      // name times inside L9: "Four great powers endured. Korvenia. Solforiz. Kwind Oh-Nine."
      const d9 = L9.end - L9.start, tK = L9.start + d9 * 0.43, tS = L9.start + d9 * 0.62, tW = L9.start + d9 * 0.8;
      ctx.fillStyle = '#0e0a07'; ctx.fillRect(0, 0, W, H);
      if (t < tRoundels + 1.2) {
        // ---- the crown over the dark map, then the shards falling onto the land
        const fall = span(t, tBreak + 0.4, L7.start + 3.6);     // 0..1 as shards come down onto the map
        const camZ = lerp(1.15, 0.62, ease(span(t, tBreak + 0.2, L7.start + 2.8))), camX = lerp(1000, 1000, fall), camY = lerp(760, 830, ease(fall));
        const [hx, hy] = K.shake(t, 14 * win(t, tBreak - 0.05, tBreak + 0.9, 0.05, 0.8), 3);
        ctx.save(); K.cam(ctx, camX + hx, camY + hy, camZ);
        K.map.draw(ctx, { ink: 1 });
        // ash: the land darkens where the shards fall
        const ash = smooth(span(t, L7.start + 1.0, L7.end + 0.5));
        if (ash > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.45 * ash; ctx.fillStyle = '#6d6258'; ctx.fillRect(0, 0, 2000, 1650); ctx.restore(); }
        // shards land and burn small marks into the map
        for (const s of SHARDS) {
          const land = span(t, tBreak + 0.9 + s.delay, tBreak + 2.6 + s.delay);
          if (land >= 1) {
            const [lx, ly] = s.land, sg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 22); sg.addColorStop(0, 'rgba(40,24,12,0.55)'); sg.addColorStop(1, 'rgba(40,24,12,0)');
            ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, 6.283); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(lx, ly); ctx.rotate(s.rot); K.gold(ctx, c => { c.beginPath(); c.moveTo(0, -13); c.lineTo(6, 4); c.lineTo(-1, 9); c.lineTo(-6, 2); c.closePath(); }, -6, -13, 6, 9, { sheen: 0.5 + 0.4 * Math.sin(t * 2 + s.cx), outlineW: 0.8 }); ctx.restore();
            K.glow(ctx, lx, ly, 30, lx === 825 ? [170, 120, 255] : [255, 214, 140], 0.4 * (0.6 + 0.4 * Math.sin(t * 2 + s.cx)));
          }
        }
        // the Scavenger Wars: battles marked in ink across the land, campaign arrows in red, fires and smoke
        const war = win(t, L8.start - 0.4, L9.start + 1.2, 0.3, 1.0);
        if (war > 0) {
          const r = rng(4040), t0 = L8.start - 0.4;
          for (let i = 0; i < 12; i++) {
            const pts = [], x0 = 160 + r() * 1500, y0 = 160 + r() * 1300, ang = r() * 6.283, len = 220 + r() * 260, bend = (r() - 0.5) * 0.8;
            for (let k = 0; k <= 20; k++) { const u = k / 20, a2 = ang + bend * (u - 0.5); pts.push([x0 + Math.cos(a2) * len * u, y0 + Math.sin(a2) * len * u + Math.sin(u * 3.1) * 30 * bend]); }
            if (pts.some(q => q[0] < 120 || q[0] > 1880 || q[1] < 120 || q[1] > 1520)) continue;
            const p = ease(span(t, t0 + i * 0.22, t0 + i * 0.22 + 0.8)); if (p <= 0) continue;
            ctx.save(); ctx.globalAlpha = war * 0.85; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#9b2f1f'; K.nib(ctx, pts, { w: 14, angle: 0.4, min: 0.5, taper: 0.2, p, seed: i });
            if (p > 0.95) { const e = pts[20], d = pts[17], a3 = Math.atan2(e[1] - d[1], e[0] - d[0]); ctx.beginPath(); ctx.moveTo(e[0] + Math.cos(a3) * 26, e[1] + Math.sin(a3) * 26); ctx.lineTo(e[0] + Math.cos(a3 + 2.5) * 22, e[1] + Math.sin(a3 + 2.5) * 22); ctx.lineTo(e[0] + Math.cos(a3 - 2.5) * 22, e[1] + Math.sin(a3 - 2.5) * 22); ctx.closePath(); ctx.fill(); }
            ctx.restore();
          }
          for (let i = 0; i < 14; i++) {
            const px = 140 + r() * 1720, py = 140 + r() * 1380, ts = t0 + 0.2 + r() * 1.8, p = ease(span(t, ts, ts + 0.35)); if (p <= 0) continue;
            ctx.save(); ctx.globalAlpha = war; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(32,21,12,0.92)';
            for (const sgn of [-1, 1]) { const q = [[px - 34 * sgn, py + 34], [px + 34 * sgn, py - 34]]; K.nib(ctx, K.resample(q, 4), { w: 6, angle: sgn * 0.8, min: 0.4, taper: 0.1, p, seed: i * 2 + sgn }); ctx.fillRect(px + 22 * sgn - 9, py + 22 - 2, 18, 4); }
            ctx.fillStyle = 'rgba(155,47,31,0.75)'; const rr = rng(i * 13 + 7); for (let k = 0; k < 9; k++) { const a2 = rr() * 6.283, d2 = 10 + rr() * 36; ctx.beginPath(); ctx.arc(px + Math.cos(a2) * d2, py + Math.sin(a2) * d2, 1.5 + rr() * 5 * p, 0, 6.283); ctx.fill(); }
            ctx.restore();
            K.glow(ctx, px, py, 70, [255, 140, 60], 0.5 * war * p * (0.7 + 0.3 * Math.sin(t * 9 + i)));
          }
          K.smoke(ctx, t, { n: 22, x: 0, y: 0, w: 2000, h: 1650, color: [46, 38, 32], alpha: 0.28 * war, size: 300, seed: 909 });
        }
        ctx.restore();
        // the crown: whole, cracking, breaking; shards fly out and fall away toward the map
        const crownA = win(t, sc.start - 0.5, tBreak + 2.8, 0.8, 1.2);
        if (crownA > 0) {
          const dark = 0.62 * (1 - smooth(span(t, tBreak + 0.4, tBreak + 2.4)));
          ctx.fillStyle = `rgba(10,7,5,${dark})`; ctx.fillRect(0, 0, W, H);
          const cs = lerp(0.95, 1.05, span(t, sc.start, tBreak)), crack = span(t, L6.start + 0.3, tBreak), brk = span(t, tBreak, tBreak + 2.6);
          ctx.save(); ctx.translate(W / 2, H / 2 - 10); ctx.scale(cs, cs); ctx.globalAlpha = crownA;
          const sheet = crownSheet();
          if (brk <= 0) {
            ctx.drawImage(sheet, -CW / 2, -CH / 2 - 20, CW, CH);
            // cracks race across the leaf; light leaks through them
            const n = Math.floor(CRACKS.length * ease(crack));
            ctx.strokeStyle = 'rgba(30,18,8,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < n; i++) { const [a, b] = CRACKS[i]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.save(); crownPath(ctx); ctx.clip(); ctx.stroke(); ctx.restore();
            if (crack > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,230,170,${(crack - 0.5) * 1.2})`; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < n; i += 2) { const [a, b] = CRACKS[i]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } crownPath(ctx); ctx.clip(); ctx.stroke(); ctx.restore(); }
          } else {
            for (const s of SHARDS) {
              const u = easeOut(clamp(brk * 1.3 - s.delay * 0.3)), g = easeIn(clamp(brk * 1.2 - s.delay * 0.2));
              const ox = s.vx * u * 0.9, oy = s.vy * u * 0.5 + g * 900, sc2 = 1 - 0.75 * g;
              ctx.save(); ctx.translate(s.cx + ox, s.cy + oy); ctx.rotate(s.rot * u * 0.5 + s.spin * g); ctx.scale(sc2, sc2); ctx.translate(-s.cx, -s.cy);
              ctx.beginPath(); K.poly(ctx, s.tr); ctx.clip(); ctx.drawImage(sheet, -CW / 2, -CH / 2 - 20, CW, CH); ctx.restore();
            }
          }
          ctx.restore();
          // the flash of the breaking
          const fl = win(t, tBreak - 0.05, tBreak + 0.8, 0.05, 0.7);
          if (fl > 0) { K.glow(ctx, W / 2, H / 2 - 40, 700, [255, 226, 170], 0.75 * fl); ctx.fillStyle = `rgba(255,244,220,${0.35 * fl})`; ctx.fillRect(0, 0, W, H); }
        }
        K.specks(ctx, t, { kind: 'ash', n: 90, alpha: 0.5 * smooth(span(t, tBreak, tBreak + 2)), wind: 20, seed: 202 });
      }
      if (t >= tRoundels - 0.01 && t < tDive + 2.2) {
        // ---- the page of the four powers; the camera goes into Aethelgard
        const pageA = smooth(span(t, tRoundels, tRoundels + 1.2));
        const L = K.layer('s2:page'), x = L.getContext('2d');
        const lit = { korv: smooth(span(t, tK - 0.3, tK + 0.4)), solf: smooth(span(t, tS - 0.3, tS + 0.4)), kwind: smooth(span(t, tW - 0.3, tW + 0.4)), aeth: smooth(span(t, L10.start - 0.2, L10.start + 0.5)) };
        const focus = t < tS - 0.2 ? RD.korv : t < tW - 0.2 ? RD.solf : t < L10.start - 0.2 ? RD.kwind : RD.aeth, fA = smooth(span(t, tK - 0.6, tK)) * (1 - smooth(span(t, L10.start + 0.6, L10.end)));
        const dive = easeIn(span(t, tDive - 0.6, tDive + 1.6));
        let cx = lerp(0, focus.x, 0.18 * fA), cy = lerp(40, focus.y, 0.18 * fA), z = 0.78 + 0.03 * Math.sin(t * 0.3);
        cx = lerp(cx, RD.aeth.x, ease(span(t, L10.start, tDive))); cy = lerp(cy, RD.aeth.y, ease(span(t, L10.start, tDive))); z = lerp(z, 1.05, ease(span(t, L10.start, tDive))) * Math.pow(9, dive);
        x.save(); K.cam(x, cx, cy, z);
        x.drawImage(K.cached('s2:pagebg', () => K.parchment(2400, 1600, 3030, { base: [226, 211, 178], edge: 0.8, stains: 3 })), -1200, -800, 2400, 1600);
        // scattered shards on the page, between the powers
        const r = rng(616); for (let i = 0; i < 22; i++) { const px = (r() - 0.5) * 1900, py = (r() - 0.5) * 1300; if (Object.values(RD).some(R => Math.hypot(px - R.x, py - R.y) < R.r + 60)) continue; x.save(); x.translate(px, py); x.rotate(r() * 6); K.gold(x, c => { c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 6); c.lineTo(-8, 9); c.closePath(); }, -10, -14, 10, 9, { sheen: 0.5 + 0.3 * Math.sin(t + i) }); x.restore(); }
        for (const [k, fn, name] of [['korv', korvenia, 'KORVENIA'], ['solf', solforiz, 'SOLFORIZ'], ['kwind', kwind, 'KWIND-09'], ['aeth', aethel, 'AETHELGARD']]) {
          const R = RD[k], l = lit[k];
          inRoundel(x, R, (c, rr) => { fn(c, rr, t, l); c.fillStyle = `rgba(30,22,14,${0.55 * (1 - l)})`; c.fillRect(-rr, -rr, 2 * rr, 2 * rr); });
          roundelFrame(x, R, l, t, name);
        }
        x.restore();
        ctx.globalAlpha = pageA; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
      }
      if (t >= tDive) {
        // ---- the diorama: Aethelgard's map stands up into mountains; seven flames
        const u = span(t, tDive, sc.end + 1.4), inA = smooth(span(t, tDive, tDive + 1.6));
        const V = { cx: lerp(1060, 1080, u), cy: lerp(1150, 860, ease(u)), th: lerp(0.95, 0.82, ease(u)), D: 1400, f: lerp(1500, 1250, ease(u)), oy: 120, rise: smooth(span(t, tDive + 0.2, tDive + 2.6)) };
        const Ld = K.layer('s2:dio'), dx = Ld.getContext('2d');
        const famT = L11.start + (L11.end - L11.start) * 0.52;
        diorama(dx, V, t, span(t, famT - 0.3, famT + 2.2));
        // it opens out of Aethelgard's roundel as a widening circle
        if (inA < 1) { const m = K.layer('s2:circ'), mx = m.getContext('2d'); mx.fillStyle = '#000'; mx.beginPath(); mx.arc(W / 2, H / 2, lerp(200, 1300, inA), 0, 6.283); mx.fill(); dx.save(); dx.globalCompositeOperation = 'destination-in'; dx.drawImage(m, 0, 0); dx.restore(); }
        ctx.drawImage(Ld, 0, 0);
        K.grade(ctx, '#d8a868', 'soft-light', 0.1);
      }
      K.paperTooth(ctx, 0.1);
      K.vignette(ctx, 0.5, '20,12,6', 0.35);
    },
  };
})();
