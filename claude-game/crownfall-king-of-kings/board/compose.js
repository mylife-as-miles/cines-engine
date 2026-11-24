// 2D compositor: puts the 2.39:1 picture into its matte and adds what a board needs: the shot caption, subtitles
// (bone, serif, low in frame), supers (small capitals, widely spaced, bone), fades and black, and a sound note.
const BONE = '#D9D2C2';
const SERIF = '"EB Garamond", Garamond, "Liberation Serif", serif';
export const PIC_W = 1280, PIC_H = 536;

export async function loadFonts() {
  try {
    await Promise.all([document.fonts.load(`28px ${SERIF}`), document.fonts.load(`italic 28px ${SERIF}`), document.fonts.load(`500 28px ${SERIF}`)]);
  } catch (e) { /* fall back to a system serif */ }
}

function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/), out = [];
  let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function envelope(t, t0, t1, fade = 0.35) {
  if (t < t0 || t > t1) return 0;
  return clamp01((t - t0) / fade) * clamp01((t1 - t) / fade);
}

// subtitles: native-tongue lines show their English; lines with sub:false are not shown in picture (e.g. "Ihriq!")
function drawSubtitle(g, line, x0, y0, names) {
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `${line.native ? 'italic ' : ''}29px ${SERIF}`;
  const who = names && line.who ? line.who.toUpperCase() : '';
  const lines = wrap(g, line.text, 980);
  const lh = 35, base = y0 + PIC_H - 30 - (lines.length - 1) * lh;
  g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 5; g.shadowOffsetY = 1;
  lines.forEach((l, i) => {
    g.fillStyle = BONE;
    g.font = `${line.native ? 'italic ' : ''}29px ${SERIF}`;
    g.fillText(l, x0 + PIC_W / 2, base + i * lh);
  });
  if (who) {
    g.font = `500 15px ${SERIF}`; g.letterSpacing = '3px'; g.fillStyle = 'rgba(217,210,194,0.62)';
    g.fillText(who, x0 + PIC_W / 2, base - 30);
    g.letterSpacing = '0px';
  }
  g.restore();
}
function drawSuper(g, sup, x0, y0, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = BONE;
  const size = sup.size ?? 30;
  g.font = `500 ${size}px ${SERIF}`;
  g.letterSpacing = `${Math.round(size * 0.34)}px`;
  const y = y0 + PIC_H * (sup.y ?? 0.5);
  g.fillText(String(sup.text).toUpperCase(), x0 + PIC_W / 2 + size * 0.17, y);
  g.restore();
}

// fine, even grain (bible p.18), drawn over the picture: a few seeded noise tiles, cycled per frame
let tiles = null;
function makeTiles() {
  tiles = [];
  let a = 12345;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), im = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 170; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = Math.max(0, Math.min(255, v)); im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); tiles.push(c);
  }
}
export function grain(g, x0, y0, w, h, amount, seed) {
  if (!amount) return;
  if (!tiles) makeTiles();
  const k = Math.abs(Math.floor(seed)) % tiles.length;
  const ox = (Math.abs(Math.floor(seed * 7919)) % 256), oy = (Math.abs(Math.floor(seed * 104729)) % 256);
  g.save();
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = Math.min(1, amount * 3.2);
  g.translate(x0 - ox, y0 - oy);
  g.fillStyle = g.createPattern(tiles[k], 'repeat');
  g.fillRect(ox, oy, w, h);
  g.restore();
}

// lines may be {who, text, native, sub, spoken} or the shot list's {speaker, text, subtitle, spoken}: a line with a
// spoken native text shows its English subtitle; one with a spoken text and no subtitle ("Ihriq! Ihriq!") is heard only
export function normLine(l) {
  if (l.speaker === undefined) return l;
  const native = l.spoken != null && l.spoken !== l.text || l.subtitle != null;
  return { t0: l.t0, t1: l.t1, who: l.speaker, text: l.subtitle ?? l.text, native: l.subtitle != null, spoken: l.spoken,
    sub: !(l.spoken != null && l.subtitle == null), note: l.note ?? (l.spoken != null && l.subtitle == null ? 'not subtitled' : undefined), _native: native };
}
export function compose(out, pic, o) {
  const { spec, t, mode, dur } = o;
  const s = { ...o.shot, lines: (o.shot.lines ?? []).map(normLine) };
  if (mode === 'picture') {                            // the bare 2.39:1 picture with grain (proof frames)
    out.width = PIC_W; out.height = PIC_H;
    const g = out.getContext('2d'); g.drawImage(pic, 0, 0); grain(g, 0, 0, PIC_W, PIC_H, o.grain ?? 0.03, t * 24 + 1);
    return;
  }
  const still = mode === 'still';
  const headH = still ? 60 : 92, footH = still ? 108 : 92;
  out.width = PIC_W; out.height = still ? headH + PIC_H + footH : 720;
  const g = out.getContext('2d');
  g.fillStyle = still ? '#141414' : '#000'; g.fillRect(0, 0, out.width, out.height);
  const x0 = 0, y0 = headH;
  if (pic) { g.drawImage(pic, x0, y0, PIC_W, PIC_H); grain(g, x0, y0, PIC_W, PIC_H, o.grain ?? 0.03, Math.round(t * 24) + 1); }
  // fades and black
  let black = s.black ? 1 : 0;
  if (s.fade) {
    if (s.fade.in) black = Math.max(black, 1 - clamp01(t / s.fade.in));
    if (s.fade.out) black = Math.max(black, 1 - clamp01((dur - t) / s.fade.out));
  }
  if (black > 0) { g.fillStyle = `rgba(0,0,0,${black})`; g.fillRect(x0, y0, PIC_W, PIC_H); }
  // supers
  const sups = (s.super ? (Array.isArray(s.super) ? s.super : [s.super]) : []).map(x => (typeof x === 'string' ? { text: x } : x));
  for (const sup of sups) {
    const t0 = sup.t0 ?? 0, t1 = sup.t1 ?? dur;
    const a = still ? 1 : envelope(t, t0, t1, sup.fade ?? 0.5);
    if (a > 0) drawSuper(g, sup, x0, y0, a);
  }
  // subtitles
  const names = s.names ?? spec.subtitleNames ?? true;
  const lines = s.lines ?? [];
  for (const l of lines) {
    if (l.sub === false) continue;
    if (still ? (t >= l.t0 && t <= l.t1) || (lines.length === 1) : (t >= l.t0 && t < l.t1)) { drawSubtitle(g, l, x0, y0, names); break; }
  }
  // caption: title, shot number, camera text (small, in the matte)
  g.save();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (still) {
    g.fillStyle = '#c9a25a'; g.font = 'bold 19px sans-serif';
    g.fillText(`${spec.title ? spec.title + '  ·  ' : ''}SHOT ${s.n ?? s.id ?? ''}  ·  ${s.time ?? (dur.toFixed(1) + ' s')}`, 16, 25);
    g.fillStyle = '#e8e4da'; g.font = '16px sans-serif';
    g.fillText(s.camText ?? '', 16, 49);
  } else {
    g.fillStyle = 'rgba(201,162,90,0.85)'; g.font = 'bold 15px sans-serif';
    g.fillText(`SHOT ${s.n ?? s.id ?? ''}`, 16, 36);
    const w = g.measureText(`SHOT ${s.n ?? s.id ?? ''}`).width;
    g.fillStyle = 'rgba(232,228,218,0.7)'; g.font = '15px sans-serif';
    g.fillText(`·  ${s.camText ?? ''}`, 24 + w, 36);
    g.textAlign = 'right'; g.fillStyle = 'rgba(232,228,218,0.45)'; g.font = '13px sans-serif';
    g.fillText(`${spec.title ?? ''}  ${t.toFixed(1)} / ${dur.toFixed(1)} s`, PIC_W - 16, 36);
  }
  // bottom: sound note and lines that are heard but not subtitled
  const heard = lines.filter(l => l.sub === false && (still || (t >= l.t0 - 0.2 && t < l.t1 + 0.6)));
  const notes = [...heard.map(l => `${l.who ? l.who + ': ' : ''}"${l.text}" (${l.note ?? 'not subtitled'})`), s.sound].filter(Boolean);
  if (still) {
    g.fillStyle = '#ffffff'; g.font = `italic 20px ${SERIF}`;
    let y = headH + PIC_H + 30;
    const dl = lines.length ? lines.map(l => `${l.who ? l.who + ': ' : ''}${l.text}${l.spoken ? `  [${l.spoken}]` : ''}`).join('   ') : (s.line ?? '');
    for (const ln of wrap(g, dl, 1240).slice(0, 2)) { g.fillText(ln, 16, y); y += 25; }
    g.font = '14px sans-serif'; g.fillStyle = '#9fc3e0';
    const nt = [s.note, ...notes].filter(Boolean).join('  ·  ');
    for (const ln of wrap(g, nt, 1240).slice(0, 2)) { g.fillText(ln, 16, y + 4); y += 19; }
  } else if (notes.length) {
    g.textAlign = 'left'; g.fillStyle = 'rgba(232,228,218,0.5)'; g.font = 'italic 14px sans-serif';
    g.fillText(notes.join('   ·   '), 16, 720 - 36);
  }
  g.restore();
}
