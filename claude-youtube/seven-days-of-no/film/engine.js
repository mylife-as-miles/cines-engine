/* SEVEN DAYS OF NO — film engine (ported from Long Distance's, itself from Autopilot's and One Too Many's).
   A deterministic, time-driven video: FILM.renderAt(t) draws any instant on the narration clock, so the player can scrub and
   the exporter can step frames at 24 fps. The narration is the clock: every shot and sound cue is anchored to a spoken word
   (FILM.W / FILM.Wend over audio/vo/words.json, served to the page as film/words.js). Flat cartoon: no paper finish, no grain.
   Sequences register with FILM.seq({...}); see film/FILM.md for the contract. Never use Math.random or Date in a sequence. */
(function (global) {
  'use strict';
  const W = 1920, H = 1080, FPS = 24, TOTAL = 225.5;
  const FILM = global.FILM = { WIDTH: W, HEIGHT: H, FPS, TOTAL, total: TOTAL, seqs: [], lib: {}, shots: [], _cache: new Map(), _warned: {}, warnings: [] };

  // ---------------------------------------------------------------- maths
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function bezier(x1, y1, x2, y2) {
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x; for (let i = 0; i < 8; i++) { const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x; const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t; if (Math.abs(d) < 1e-6) break; t = clamp(t - cx / d, 0, 1); }
      return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    };
  }
  const ease = {
    linear: t => t, inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
    inCubic: t => t ** 3, outCubic: t => 1 - (1 - t) ** 3, inOutCubic: t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2, outExpo: t => t >= 1 ? 1 : 1 - 2 ** (-10 * t), inExpo: t => t <= 0 ? 0 : 2 ** (10 * t - 10),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2, inBack: (t, s = 1.70158) => (s + 1) * t ** 3 - s * t * t,
    settle: bezier(0.22, 1, 0.36, 1), bezier,
  };
  const E = e => (typeof e === 'string' ? ease[e] : e);
  // normalised progress of t through [a,b], clamped, optionally eased
  function seg(t, a, b, e) { const u = clamp((t - a) / (b - a || 1e-6), 0, 1); return e ? E(e)(u) : u; }
  // keyframes: key(t, [[t0, v0], [t1, v1, 'outCubic'], ...]); v: number, array or object; the ease on a key shapes the segment arriving at it
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1]; const last = ks[ks.length - 1]; if (t >= last[0]) return last[1];
    let i = 0; while (i < ks.length - 1 && t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1, e] = ks[i + 1]; return mixv(v0, v1, seg(t, t0, t1, e || 'inOutSine'));
  }
  function mixv(a, b, u) {
    if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, u);
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => i < b.length ? mixv(v, b[i], u) : v);
    if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k in a) o[k] = (k in b) ? mixv(a[k], b[k], u) : a[k]; for (const k in b) if (!(k in a)) o[k] = b[k]; return o; }
    return u < 0.5 ? a : b;
  }
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;       // character poses (walk phase, mouth, blink) animate on twos
  const ones = t => Math.floor(t * 24 + 1e-6) / 24;
  // seeded PRNG and value noise (never Math.random)
  function hashStr(s) { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rng = seed => mulberry32(typeof seed === 'number' ? seed : hashStr(seed));
  const h1 = (i, seed) => { let x = Math.imul((i | 0) ^ Math.imul(seed | 0, 0x27d4eb2d), 0x9E3779B1); x ^= x >>> 15; x = Math.imul(x, 0x85EBCA77); x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  function noise1(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(i, seed), h1(i + 1, seed), u); }
  const wob = (t, hz, seed) => noise1(t * hz, seed | 0) * 2 - 1;     // smooth seeded drift in [-1,1]
  Object.assign(FILM, { clamp, lerp, ease, bezier, seg, key, mixv, twos, ones, rng, hashStr, noise1, wob });

  // ---------------------------------------------------------------- the narration clock: word anchors
  // FILM_WORDS (film/words.js, made from audio/vo/words.json by tools/film.js) = { words: [{w, t0, t1}] } on the edited clock.
  FILM.words = ((global.FILM_WORDS && global.FILM_WORDS.words) || []).map((w, i) => ({ w: w.w, t0: w.t0, t1: w.t1, i }));
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const NW = FILM.words.map(w => norm(w.w));
  FILM.normWord = norm;
  // find the n-th (1-based) match of a word or phrase ("not fine", "five thirty") starting at or after `after` seconds
  function findPhrase(phrase, n, after) {
    const parts = String(phrase).trim().split(/\s+/).map(norm).filter(Boolean); if (!parts.length) return null;
    let k = 0;
    for (let i = 0; i + parts.length <= NW.length; i++) {
      if (FILM.words[i].t0 < after - 1e-6) continue;
      let ok = true; for (let j = 0; j < parts.length; j++) if (NW[i + j] !== parts[j]) { ok = false; break; }
      if (ok && ++k === n) return [FILM.words[i], FILM.words[i + parts.length - 1]];
    }
    return null;
  }
  function anchorArgs(a, after0) { let n = 1, after = after0 || 0; if (typeof a === 'number') n = a; else if (a && typeof a === 'object') { if (a.n) n = a.n; if (a.after != null) after = a.after; } return { n, after }; }
  function anchor(phrase, a, after0, end) {
    const { n, after } = anchorArgs(a, after0); const m = findPhrase(phrase, n, after);
    if (!m) { warn(`anchor not found: "${phrase}"${n > 1 ? ' #' + n : ''}${after ? ' after ' + after.toFixed(2) : ''}`); return after; }
    return end ? spokenEnd(m[1]) : m[0].t0;
  }
  // a word's t1 often runs on through the pause after it (Whisper gives the gap to the word before it): the spoken end is the
  // last moment inside the word where the narration is still loud (film/vo_env.js); without the envelope, t1 capped at 0.7 s
  function spokenEnd(w) {
    const E = global.FILM_VOENV; if (!E) return Math.min(w.t1, w.t0 + 0.7);
    for (let i = Math.floor(w.t1 * E.hz); i > Math.floor(w.t0 * E.hz); i--) if ((E.data.charCodeAt(i) - 48) / 61 >= 0.55) return Math.min(w.t1, (i + 1) / E.hz + 0.04);
    return Math.min(w.t1, w.t0 + 0.3);
  }
  FILM.spokenEnd = spokenEnd;
  // W('Monday') -> start of the first "Monday"; W('no', 3) -> the third "no"; W('no', {after: 45.8}) -> the first "no" after 45.8 s
  FILM.W = (phrase, a) => anchor(phrase, a, 0, false);
  // Wend('tonight') -> the end of that word (of the last word of a phrase)
  FILM.Wend = (phrase, a) => anchor(phrase, a, 0, true);
  // a scoped pair whose counts start at `after` (use one per sequence so an inserted word earlier never shifts its anchors):
  // const { W, Wend } = FILM.from(FILM.W('Tuesday'));  W('no') is then Tuesday's "no".
  FILM.from = after => ({ W: (p, a) => anchor(p, a, after, false), Wend: (p, a) => anchor(p, a, after, true), after });
  // the span from the start of one phrase to the end of another (searched after the first): a character's spoken line
  FILM.span = (first, last, after) => { const a = anchor(first, 1, after || 0, false); return [a, anchor(last == null ? first : last, 1, a, true)]; };
  FILM.wordsIn = (t0, t1) => FILM.words.filter(w => w.t1 > t0 && w.t0 < t1);
  FILM.wordAt = t => { for (const w of FILM.words) if (t >= w.t0 - 0.02 && t < w.t1 + 0.02) return w; return null; };
  FILM.nearestWord = t => { let b = null, d = 1e9; for (const w of FILM.words) { const e = Math.abs(w.t0 - t); if (e < d) { d = e; b = w; } } return b; };

  // ---------------------------------------------------------------- motion helpers (explainer animation)
  // talking: mouth 0..1 while the narrator speaks a character's words. span = [t0, t1] or a list of spans. Uses the narration's
  // loudness envelope (film/vo_env.js) gated by the word times; without the envelope, a syllable pulse per word. On twos.
  const ENV = global.FILM_VOENV || null;
  const syl = w => Math.max(1, (norm(w).match(/[aeiouy]+/g) || []).length);
  FILM.talk = function (t, span) {
    if (!span) return 0; const spans = typeof span[0] === 'number' ? [span] : span; t = twos(t);
    if (!spans.some(s => t >= s[0] - 0.02 && t < s[1] + 0.04)) return 0;
    const w = FILM.wordAt(t); if (!w) return 0;
    if (ENV) { const i = Math.floor(t * ENV.hz); const v = i >= 0 && i < ENV.data.length ? (ENV.data.charCodeAt(i) - 48) / 61 : 0; return clamp((v - 0.6) / 0.3, 0, 1); }   // speech sits at 0.6-0.95 of the -50..-5 dBFS range
    const n = syl(w.w), u = clamp((t - w.t0) / Math.max(0.05, w.t1 - w.t0), 0, 0.999);
    return 0.15 + 0.85 * Math.pow(Math.sin(Math.PI * ((u * n) % 1)), 0.7);
  };
  // blinks on a seeded schedule (every 2.2-5.5 s, sometimes double): 0 open .. 1 closed. Scripted blinks: FILM.blinkAt(t, [t0, t1...])
  const blinkTimes = {};
  function schedule(seed) {
    if (blinkTimes[seed]) return blinkTimes[seed];
    const R = rng('blink' + seed), out = []; let t = 0.4 + R() * 2.2;
    while (t < TOTAL + 5) { out.push(t); if (R() < 0.16) out.push(t + 0.28); t += 2.2 + R() * 3.3; }
    return (blinkTimes[seed] = out);
  }
  const lid = (t, tb) => { const u = (t - tb) / 0.17; return u < 0 || u >= 1 ? 0 : u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6; };
  FILM.blinkAt = (t, times) => { t = twos(t) + 1e-4; let m = 0; for (const tb of times) m = Math.max(m, lid(t, tb)); return m > 0.3 ? 1 : 0; };
  FILM.blink = (t, seed) => FILM.blinkAt(t, schedule(seed == null ? 0 : seed).filter(tb => tb > t - 0.3 && tb < t + 0.1));
  // walk from xa to xb between t0 and t1: {x, walk (phase in strides, on twos), moving, face (+1 right, -1 left)}. stride px at s=1.
  FILM.walk = function (t, t0, t1, xa, xb, o) {
    o = o || {}; const s = o.s || 1, stride = (o.stride || 150) * s, acc = o.acc == null ? 0.12 : o.acc;
    const u = seg(t, t0, t1), d = t1 - t0;
    // linear in the middle, short ease at both ends (acc = share of the walk spent accelerating)
    const p = u < acc ? (u * u) / (2 * acc * (1 - acc)) : u > 1 - acc ? 1 - ((1 - u) * (1 - u)) / (2 * acc * (1 - acc)) : (u - acc / 2) / (1 - acc);
    const x = lerp(xa, xb, p); const tw = seg(twos(t), t0, t1); const pw = tw < acc ? (tw * tw) / (2 * acc * (1 - acc)) : tw > 1 - acc ? 1 - ((1 - tw) * (1 - tw)) / (2 * acc * (1 - acc)) : (tw - acc / 2) / (1 - acc);
    return { x, walk: Math.abs(xb - xa) * pw / stride, moving: t > t0 && t < t1 && d > 0, face: xb >= xa ? 1 : -1, u: p };
  };
  // squash pop-in for icons and bubbles: {s, sx, sy, a, on}. popOut(t, t1, d) shrinks away ending at t1.
  // it starts at 35% scale (never a speck in a sampled frame), overshoots and settles, fading in over its first quarter
  FILM.pop = function (t, t0, d) {
    d = d || 0.32; if (t < t0) return { s: 0, sx: 0, sy: 0, a: 0, on: false };
    const u = clamp((t - t0) / d, 0, 1), s = u >= 1 ? 1 : 0.35 + 0.65 * ease.outBack(u, 2.2);
    const q = u >= 1 ? 0 : Math.sin(u * Math.PI * 2) * (1 - u) * 0.14;    // squash then stretch, decaying
    return { s, sx: s * (1 + q), sy: s * (1 - q), a: clamp(u * 4, 0, 1), on: true };
  };
  FILM.popOut = function (t, t1, d) { d = d || 0.22; const u = seg(t, t1 - d, t1); const s = 1 - 0.65 * ease.inBack(u, 1.8); return { s, sx: s, sy: s, a: 1 - u * u, on: t < t1 }; };
  // pop in at t0 and out at t1: the product of both
  FILM.popInOut = (t, t0, t1, d) => { const a = FILM.pop(t, t0, d), b = t1 == null ? { s: 1, sx: 1, sy: 1, a: 1, on: true } : FILM.popOut(t, t1); return { s: a.s * b.s, sx: a.sx * b.sx, sy: a.sy * b.sy, a: a.a * b.a, on: a.on && b.on }; };
  // a stamp: comes down from big to its size in 0.12 s, lands with a little shake. {s, a, dx, dy, rot, hit (landed), on}
  FILM.stamp = function (t, t0, o) {
    o = o || {}; const fall = o.fall || 0.12; if (t < t0 - fall) return { s: 0, a: 0, dx: 0, dy: 0, rot: 0, hit: false, on: false };
    const u = clamp((t - (t0 - fall)) / fall, 0, 1); const s = lerp(o.from || 2.3, 1, ease.inQuad(u));
    const k = Math.max(0, t - t0), amp = (o.amp || 10) * Math.exp(-k * 14) * (t >= t0 ? 1 : 0);
    return { s: t >= t0 ? 1 - 0.06 * Math.exp(-k * 18) * Math.sin(k * 60) : s, a: clamp(u * 1.5, 0, 1), dx: amp * Math.sin(k * 71), dy: amp * Math.cos(k * 53), rot: (o.rot || 0), hit: t >= t0, on: true };
  };
  // camera flash: white alpha, 1 at t0 decaying
  FILM.flash = (t, t0, d) => t < t0 ? 0 : clamp(Math.exp(-(t - t0) / ((d || 0.45) / 4)), 0, 1) * (t - t0 < (d || 0.45) ? 1 : 0);
  // screen shake: decaying seeded offset {dx, dy}
  FILM.quake = function (t, t0, d, amp, seed) { d = d || 0.35; amp = amp == null ? 14 : amp; if (t < t0 || t > t0 + d) return { dx: 0, dy: 0 }; const k = 1 - (t - t0) / d; return { dx: amp * k * k * wob(t, 31, (seed || 5)), dy: amp * k * k * wob(t, 29, (seed || 5) + 17) }; };
  // tremble (a body shaking with nerves): small fast offset on twos
  FILM.tremble = (t, amp, seed) => { t = twos(t); return { dx: (amp || 4) * wob(t, 9, seed || 3), dy: (amp || 4) * 0.5 * wob(t, 11, (seed || 3) + 9) }; };
  // idle breath (px at s=1): a slow bob
  FILM.breath = (t, seed) => Math.sin((t + (seed || 0) * 1.7) * Math.PI * 2 * 0.28) * 3;
  // nods: head pitch -1..1 beats at the given times (each nod 0.36 s)
  FILM.nod = (t, times, d) => { d = d || 0.36; let v = 0; for (const tn of times) { const u = (t - tn) / d; if (u >= 0 && u < 1) v = Math.sin(u * Math.PI); } return v; };
  // a quick punch-in zoom at each time (yes, yes, yes): returns a zoom multiplier
  // each beat steps the zoom up by amt, with a short overshoot that settles
  FILM.punch = (t, times, amt, d) => { amt = amt || 0.08; d = d || 0.3; let z = 1; for (const tp of times) if (t >= tp) z += amt * seg(t, tp, tp + d * 0.5, 'outBack'); return z; };
  // slide in from an offset: returns the offset remaining (e.g. a card sliding in from 600 px below)
  FILM.slide = (t, t0, from, d, e) => from * (1 - seg(t, t0, t0 + (d || 0.45), e || 'outBack'));

  // ---------------------------------------------------------------- registration
  // def: { id, title, chapter, from, shots: [{at, name, in, push, draw(c, st)}], sound(S), setup() }   (all times on the narration clock)
  FILM.seq = function (def) {
    if (typeof def.from !== 'number' || isNaN(def.from)) { warn(def.id + ': `from` must be a time (an anchor)'); def.from = 0; }
    def.shots = (def.shots || []).slice().sort((a, b) => a.at - b.at);
    FILM.lib[def.id] = def; FILM._built = false; return def;
  };
  // the timeline: sequences ordered by `from`, each lasting to the next one's start (the last to TOTAL); shots flattened globally
  FILM.build = function () {
    const S = Object.values(FILM.lib).sort((a, b) => a.from - b.from); FILM.seqs = S;
    // the sequences must fall in story order (film/load.js): a wrong anchor (a day name inside a sentence) would reorder them
    const order = (global.FILM_SEQUENCES || []).map(n => n.slice(0, 3)).filter(id => FILM.lib[id]);
    if (order.length && order.join() !== S.map(s => s.id).join()) warn('sequences out of story order: ' + S.map(s => s.id + '@' + s.from.toFixed(2)).join(' '));
    S.forEach((s, i) => { s.start = s.from; s.end = i + 1 < S.length ? S[i + 1].from : TOTAL; s.dur = s.end - s.start; });
    const all = [];
    for (const s of S) for (const sh of s.shots) {
      sh.seq = s; if (typeof sh.at !== 'number' || isNaN(sh.at)) { warn(s.id + '/' + sh.name + ': bad `at`'); sh.at = s.start; }
      if (sh.at < s.start - 1e-6 || sh.at >= s.end) warn(`${s.id}/${sh.name}: at ${sh.at.toFixed(2)} outside ${s.start.toFixed(2)}-${s.end.toFixed(2)}`);
      all.push(sh);
    }
    all.sort((a, b) => a.at - b.at || (a.seq.start - b.seq.start));
    all.forEach((sh, i) => { sh.index = i; sh.end = i + 1 < all.length ? all[i + 1].at : TOTAL; });
    if (all.length && all[0].at > 0) warn('the first shot starts at ' + all[0].at);
    FILM.shots = all; FILM.total = TOTAL; FILM._built = true;
  };
  FILM.find = function (t) { if (!FILM._built) FILM.build(); const S = FILM.seqs; for (const q of S) if (t < q.end) return q; return S[S.length - 1] || null; };
  function shotIndex(t) { const A = FILM.shots; let lo = 0, hi = A.length - 1, r = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (A[m].at <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  FILM.shotAt = t => { if (!FILM._built) FILM.build(); return FILM.shots[shotIndex(t)]; };

  // ---------------------------------------------------------------- render context
  // c.cache(key, drawFn(g, canvas), w, h): an offscreen canvas kept across frames (static layers). Prefix keys with your seq or set id.
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; return c; };
  FILM.makeCanvas = makeCanvas;
  function cache(keyName, fn, w, h) {
    let e = FILM._cache.get(keyName);
    if (!e) {
      const cv = makeCanvas(w || W, h || H); const g = cv.getContext('2d'); fn(g, cv); e = { cv, used: 0, px: cv.width * cv.height };
      FILM._cache.set(keyName, e); FILM._cachePx = (FILM._cachePx || 0) + e.px;
      while (FILM._cache.size > 1 && (FILM._cachePx > FILM.cacheBudgetPx || FILM._cache.size > 400)) {
        let oldest = null; for (const [k, v] of FILM._cache) if (v !== e && (!oldest || v.used < oldest[1].used)) oldest = [k, v];
        if (!oldest) break; FILM._cachePx -= oldest[1].px; FILM._cache.delete(oldest[0]);
      }
    }
    e.used = FILM._clock = (FILM._clock || 0) + 1; return e.cv;
  }
  FILM.cache = cache; FILM.cacheBudgetPx = 48 * W * H;

  // the shot's camera push: push: 1.05 (zoom 1 -> 1.05 over the shot, about the centre) or {from, to, x, y, ease, d}
  function pushOf(shot, st) {
    const p = shot.push; if (!p) return { z: 1, fx: W / 2, fy: H / 2 };
    const o = typeof p === 'number' ? { to: p } : p; const d = o.d || (shot.end - shot.at);
    const z = lerp(o.from || 1, o.to || 1, seg(st, o.delay || 0, d, o.ease || 'inOutSine'));
    if (z < 1 && !shot._warnedPush) { shot._warnedPush = 1; warn(`${shot.seq.id}/${shot.name}: push below 1 shows the frame edge`); }
    return { z, fx: o.x == null ? W / 2 : o.x, fy: o.y == null ? H / 2 : o.y };
  }
  function makeContext(g, t, shot) {
    const seq = shot.seq, st = t - shot.at;
    const c = { g, t, lt: t - seq.start, st, frame: Math.round(t * FPS), seq, shot, shotDur: shot.end - shot.at, W, H, cache, after: [], seed: Math.round(t * FPS), _cam: null, sets: {} };
    const P = pushOf(shot, st); let sx = 0, sy = 0;
    // base transform: the push (screen-space zoom about a point) and any shake; every set, figure and graphic sits under it
    const base = () => g.setTransform(P.z, 0, 0, P.z, P.fx - P.z * P.fx + sx, P.fy - P.z * P.fy + sy);
    c.push = P;
    c.reset = () => { base(); c._cam = null; };
    c.screen = () => { g.setTransform(1, 0, 0, 1, 0, 0); c._cam = null; };   // raw screen space: no push, no shake
    // camera: the world point (x,y) goes to the frame centre at zoom (1 = authored framing), rotated rot, offset dx,dy
    // (x,y) is clamped so a zoomed frame never leaves the 1920x1080 world (as the sets clamp theirs); cam.free lifts that
    c.camera = cam => {
      cam = cam || {}; base(); const z = cam.zoom || 1; let x = cam.x == null ? W / 2 : cam.x, y = cam.y == null ? H / 2 : cam.y;
      if (z >= 1 && !cam.free) { const hw = W / 2 / z, hh = H / 2 / z; x = clamp(x, hw, W - hw); y = clamp(y, hh, H - hh); }
      g.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); if (cam.rot) g.rotate(cam.rot); g.scale(z, z); g.translate(-x, -y);
      c._cam = { x, y, zoom: z, dx: cam.dx || 0, dy: cam.dy || 0, rot: cam.rot || 0 };
    };
    c.shake = o => { if (o) { sx += o.dx || 0; sy += o.dy || 0; } if (c._cam) c.camera(Object.assign({ free: true }, c._cam)); else base(); };
    c.impact = (t0, d, amp, seed) => c.shake(FILM.quake(t, t0, d, amp, seed));
    // a full-frame flash (white by default) drawn over the shot after it has drawn
    c.flash = (a, color) => { if (a > 0.001) c.after.push(gx => { gx.save(); gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalAlpha = clamp(a, 0, 1); gx.fillStyle = color || '#FFFFFF'; gx.fillRect(0, 0, W, H); gx.restore(); }); };
    // art: sets, characters and props (real art from kit/sets.js and kit/pov.js when present, labelled placeholders until then)
    c.set = (name, o) => global.ART.set(c, name, o || {});
    c.setFront = (name, o) => global.ART.setFront(c, name, o || {});
    c.fig = (who, o) => global.ART.fig(c, who, o || {});
    c.prop = (name, o) => global.ART.prop(c, name, o || {});
    c.anchor = (set, name, fb) => global.ART.anchor(set, name, fb, c);
    base();
    return c;
  }
  const contextFor = makeContext;

  // draw one shot at global time t into g (cleared first). Errors are caught and warned so one broken shot never stops a render.
  function drawShot(g, shot, t) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.fillStyle = shot.bg || (shot.seq && shot.seq.bg) || '#F7E7CE'; g.fillRect(0, 0, W, H);
    const c = contextFor(g, t, shot);
    const seq = shot.seq; if (!seq._setup && seq.setup) { try { seq.setup(); } catch (e) { warn(seq.id + ' setup: ' + e.message); } } seq._setup = true;
    try { shot.draw(c, c.st); } catch (err) { warn(seq.id + '/' + (shot.name || shot.at) + ': ' + err.message); console.error(err); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    c.after.forEach(fn => { try { fn(g); } catch (err) { warn(seq.id + ' after: ' + err.message); } });
    g.restore(); return c;
  }
  FILM.drawShotAt = drawShot;
  // FILM.drawShot(c, 'Q03', t): draw what the timeline shows at global time t (another sequence's shot) into this frame
  FILM.drawShotTime = function (g, t) { const sh = FILM.shotAt(t); return drawShot(g, sh, t); };

  // ---------------------------------------------------------------- transitions
  // shot.in: 'cut' (default), 'wipe', 'slide', 'fade', 'dip', 'pop', 'iris', or {type, dur, dir: 'left'|'right'|'up'|'down', color, x, y}
  const TR_DUR = { wipe: 0.38, slide: 0.42, fade: 0.4, dip: 0.5, pop: 0.32, iris: 0.5 };
  function trOf(shot) { const i = shot.in; if (!i || i === 'cut') return null; const o = typeof i === 'string' ? { type: i } : Object.assign({}, i); o.dur = o.dur || TR_DUR[o.type] || 0.4; return o; }
  let bufA = null, bufB = null;
  function composite(ctx, A, B, tr, u) {
    const dir = tr.dir || 'right';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (tr.type === 'wipe') {
      const e = ease.inOutCubic(u), band = tr.band == null ? 70 : tr.band, slant = 140;
      const horiz = dir === 'right' || dir === 'left';
      const span = (horiz ? W : H) + slant + band * 2; const pos = e * span - band;
      ctx.drawImage(A, 0, 0);
      const poly = (off) => { ctx.beginPath();
        if (dir === 'right') { const x = pos - slant + off; ctx.moveTo(-10, -10); ctx.lineTo(x + slant, -10); ctx.lineTo(x, H + 10); ctx.lineTo(-10, H + 10); }
        else if (dir === 'left') { const x = W - pos + off; ctx.moveTo(W + 10, -10); ctx.lineTo(x - slant, -10); ctx.lineTo(x, H + 10); ctx.lineTo(W + 10, H + 10); }
        else if (dir === 'down') { const y = pos - slant + off; ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, y); ctx.lineTo(-10, y + slant); }
        else { const y = H - pos + off; ctx.moveTo(-10, H + 10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W + 10, y); ctx.lineTo(-10, y - slant); }
        ctx.closePath(); };
      const sg = (dir === 'right' || dir === 'down') ? 1 : -1;
      // the coloured band leads, the new shot follows it
      ctx.save(); poly(band * sg); ctx.fillStyle = tr.color || '#F5A454'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#1c1c1c'; ctx.stroke(); ctx.restore();
      ctx.save(); poly(0); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      ctx.save(); poly(0); ctx.lineWidth = 6; ctx.strokeStyle = '#1c1c1c'; ctx.stroke(); ctx.restore();
    } else if (tr.type === 'slide') {
      const e = ease.inOutCubic(u); const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0, dy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
      ctx.drawImage(A, dx * e * W, dy * e * H); ctx.drawImage(B, dx * (e - 1) * W, dy * (e - 1) * H);
    } else if (tr.type === 'fade') { ctx.drawImage(A, 0, 0); ctx.globalAlpha = ease.inOutSine(u); ctx.drawImage(B, 0, 0); }
    else if (tr.type === 'dip') { const k = u < 0.5 ? u * 2 : (1 - u) * 2; ctx.drawImage(u < 0.5 ? A : B, 0, 0); ctx.globalAlpha = ease.inOutSine(k); ctx.fillStyle = tr.color || '#FFFFFF'; ctx.fillRect(0, 0, W, H); }
    else if (tr.type === 'pop') { ctx.drawImage(A, 0, 0); const s = 0.86 + 0.14 * ease.outBack(u, 1.6); ctx.globalAlpha = clamp(u * 3, 0, 1); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); ctx.drawImage(B, 0, 0); }
    else if (tr.type === 'iris') {
      const x = tr.x == null ? W / 2 : tr.x, y = tr.y == null ? H / 2 : tr.y; const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * ease.inOutCubic(u);
      ctx.drawImage(A, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, R), 0, Math.PI * 2); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, R), 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = '#1c1c1c'; ctx.stroke();
    } else ctx.drawImage(B, 0, 0);
    ctx.restore();
  }

  let mainCtx = null;
  FILM.renderAt = function (t, ctx) {
    if (!FILM._built) FILM.build();
    ctx = ctx || mainCtx; t = clamp(t, 0, TOTAL - 1e-4); if (!FILM.shots.length) return null;
    const i = shotIndex(t), shot = FILM.shots[i], tr = i > 0 ? trOf(shot) : null; const u = tr ? (t - shot.at) / tr.dur : 1;
    let c;
    if (tr && u < 1) {
      if (!bufA) { bufA = makeCanvas(W, H); bufB = makeCanvas(W, H); }
      drawShot(bufA.getContext('2d'), FILM.shots[i - 1], t); c = drawShot(bufB.getContext('2d'), shot, t);
      composite(ctx, bufA, bufB, tr, clamp(u, 0, 1));
    } else c = drawShot(ctx, shot, t);
    if (FILM.debug) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = '600 22px Inter, sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, 760, 34); ctx.fillStyle = '#fff'; ctx.fillText(`${t.toFixed(2)}s  ${shot.seq.id} · ${shot.name || ''}`, 10, 24); ctx.restore(); }
    return c;
  };

  function warn(m) { if (FILM._warned[m]) return; FILM._warned[m] = 1; console.warn('[film] ' + m); FILM.warnings.push(m); }
  FILM.warn = warn;

  // ---------------------------------------------------------------- sound: named cues for the mix (spotting notes)
  // seq.sound(S): S.cue(name, t, params) one-shot at narration time t; S.bed(name, t0, t1, params) continuous; S.duck(t0, t1, level)
  // lowers the music; S.silence(t0, t1) drops music and effects (the voice stays). Levels in dB. The narration itself is not a cue.
  FILM.score = function (seq) {
    if (seq._score) return seq._score;
    const ev = { cues: [], beds: [], silences: [], ducks: [] };
    const S = { cue: (name, t, p) => ev.cues.push({ name, t, p: p || {} }), bed: (name, t0, t1, p) => ev.beds.push({ name, t0, t1, p: p || {} }),
      silence: (t0, t1) => ev.silences.push({ t0, t1 }), duck: (t0, t1, level) => ev.ducks.push({ t0, t1, level }), seq };
    if (seq.sound) { try { seq.sound(S); } catch (e) { warn(seq.id + ' sound: ' + e.message); } }
    return (seq._score = ev);
  };
  // every sequence's sound events in global (narration) seconds, with each cue's nearest spoken word as a spotting note
  FILM.cuesheet = function () {
    if (!FILM._built) FILM.build();
    return FILM.seqs.map(s => { const ev = FILM.score(s); return { id: s.id, title: s.title, chapter: s.chapter || null, start: s.start, end: s.end,
      cues: ev.cues.map(c => { const w = FILM.nearestWord(c.t); return Object.assign({ word: w ? w.w : null, word_t: w ? w.t0 : null }, c); }), beds: ev.beds, silences: ev.silences, ducks: ev.ducks }; });
  };
  // chapters for the player (and a check against publish/): every sequence with a chapter title
  FILM.chapters = () => { if (!FILM._built) FILM.build(); return FILM.seqs.filter(s => s.chapter).map(s => ({ t: s.start, title: s.chapter, id: s.id })); };

  // ---------------------------------------------------------------- headless mount (tools)
  FILM.mountHeadless = function () { const cv = makeCanvas(W, H); mainCtx = cv.getContext('2d'); document.body.appendChild(cv); cv.style.cssText = 'width:100vw;height:56.25vw;display:block'; return cv; };
  FILM.mount = function (cv) { mainCtx = cv.getContext('2d'); return cv; };
})(window);
