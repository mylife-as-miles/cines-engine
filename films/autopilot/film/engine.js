/* AUTOPILOT — film engine (ported from One Too Many's).
   A deterministic, time-driven film: renderAt(t) draws any instant, so the player can scrub and the exporter can step frames.
   Sequences register in story order with FILM.seq({...}); see film/FILM.md for the contract.
   Differences from One Too Many: dialogue is Look C's in-picture subtitles (LC.caption), timed to the recorded voices where
   a line is voiced (audio/voice_map.json via audio/voice.js); the frame is always full 16:9; FILM.drawShot() redraws a shot of
   another sequence (the flash cuts are the morning's own images). */
(function (global) {
  'use strict';
  const O = global.OTM; const { W, H } = O;
  const FPS = 24;
  const FILM = global.FILM = { FPS, seqs: [], lib: {}, total: 0, script: global.FILM_SCRIPT || [], byId: {}, _cache: new Map(), _warned: {} };
  FILM.script.forEach(e => { if (e.id) FILM.byId[e.id] = e; });
  // the recorded takes: { L001: { dur, take, b64? } } (audio/voice.js); a voiced line's subtitle holds for its take
  FILM.voices = global.FILM_VOICES || {};

  // ---------- maths ----------
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
    outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
    settle: bezier(0.22, 1, 0.36, 1), weary: bezier(0.45, 0.05, 0.35, 1), bezier,
  };
  // normalised progress of t through [a,b], clamped, optionally eased
  function seg(t, a, b, e) { const u = clamp((t - a) / (b - a || 1e-6), 0, 1); return e ? (typeof e === 'string' ? ease[e] : e)(u) : u; }
  // keyframes: key(t, [[t0, v0], [t1, v1, 'inOutSine'], ...]); v may be a number, array or object of numbers; the ease on a key shapes the segment arriving at it
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1]; const last = ks[ks.length - 1]; if (t >= last[0]) return last[1];
    let i = 0; while (i < ks.length - 1 && t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1, e] = ks[i + 1]; const u = seg(t, t0, t1, e || 'inOutSine');
    return mixv(v0, v1, u);
  }
  // numbers interpolate; arrays and objects recurse; anything else (a pose's 'walk', 'crooked', true) snaps at the midpoint
  function mixv(a, b, u) {
    if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, u);
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => i < b.length ? mixv(v, b[i], u) : v);
    if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k in a) o[k] = (k in b) ? mixv(a[k], b[k], u) : a[k]; for (const k in b) if (!(k in a)) o[k] = b[k]; return o; }
    return u < 0.5 ? a : b;
  }
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;       // characters animate on twos
  const ones = t => Math.floor(t * 24 + 1e-6) / 24;
  // seeded smooth noise in [-1,1] for drift, breath and handheld
  const wob = (t, hz, seed) => O.vnoise(t * hz, 0.5, seed | 0) * 2 - 1;
  Object.assign(FILM, { clamp, lerp, ease, bezier, seg, key, mixv, twos, ones, wob });

  // ---------- registration ----------
  // def: { id, title, dur, shots: [{at, name, draw(c, st, lt), post?, fade?}], lines: [...], sound(S){}, setup(){}, post: {} }
  // When only some sequences are requested (tools), the others still load so FILM.drawShot can reach them, but stay off the timeline.
  FILM.seq = function (def) {
    def.shots = (def.shots || []).slice().sort((a, b) => a.at - b.at);
    def.lines = def.lines || [];
    FILM.lib[def.id] = def;
    const only = global.FILM_ONLY; if (only && !only.includes(def.id)) return def;
    FILM.seqs.push(def);
    let t = 0; FILM.seqs.forEach(s => { s.start = t; t += s.dur; }); FILM.total = t;
    return def;
  };
  FILM.find = function (t) {
    const S = FILM.seqs; if (!S.length) return null;
    let s = S[S.length - 1]; for (const q of S) if (t < q.start + q.dur) { s = q; break; }
    return s;
  };

  // ---------- dialogue: Look C subtitles ----------
  // Scene dialogue is only ever type: bold, white (Emily's in her yellow). Daniel's V.O. is voiced: lighter, in bone.
  // The radio is voiced through a small speaker: italic, smaller, dimmer. Every line comes from film/script.js by id.
  const STYLE = {
    dialogue: { weight: 700, size: 44, color: '#FFFFFF' },
    emily: { weight: 700, size: 44, color: '#E0B34F' },
    vo: { weight: 500, size: 40, color: '#E6E0D2' },
    radio: { weight: 500, size: 36, color: '#D9D3C6', style: 'italic', alpha: 0.9 },
  };
  function kindOf(e) {
    if (!e) return 'dialogue';
    if (e.speaker === 'RADIO PRESENTER') return 'radio';
    if (e.ext === 'V.O.') return 'vo';
    if (e.speaker === 'EMILY') return 'emily';
    return 'dialogue';
  }
  // the screenplay's typewriter punctuation, set properly (the words stay verbatim)
  FILM.typeset = s => s.replace(/\.\.\./g, '…').replace(/--/g, '—').replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’').replace(/"([^"]*)"/g, '“$1”');
  // resolve a line def into timing: {kind, text, at, inEnd, holdEnd, end, voice}
  FILM.lineTiming = function (L) {
    if (L._t) return L._t;
    const e = FILM.byId[L.id]; if (!e) warn('missing line ' + L.id);
    const text = FILM.typeset((e && e.text) || ''); const kind = L.kind || kindOf(e);
    const voice = FILM.voices[L.id] || null;
    const ent = L.entrance != null ? L.entrance : 0.12;
    // voiced: hold for the take plus a breath; read: a comfortable reading speed
    const hold = L.hold != null ? L.hold : voice ? voice.dur + 0.35 : Math.max(1.3, 0.55 + 0.062 * text.length);
    const inEnd = L.at + ent, holdEnd = L.until != null ? L.until : L.at + hold, end = holdEnd + (L.exit != null ? L.exit : 0.25);
    return (L._t = { kind, speaker: e && e.speaker, text, at: L.at, ent, inEnd, holdEnd, end, voice });
  };
  FILM.lineState = function (L, lt) {
    const T = FILM.lineTiming(L); if (lt < T.at || lt >= T.end) return null;
    if (lt < T.inEnd) return { T, phase: 'in', alpha: T.ent ? (lt - T.at) / T.ent : 1 };
    if (lt < T.holdEnd) return { T, phase: 'hold', alpha: 1 };
    return { T, phase: 'out', alpha: 1 - (lt - T.holdEnd) / Math.max(1e-6, T.end - T.holdEnd) };
  };
  // wrap to at most `max` px per row (two rows at most, as the look asks; a third only if the line is very long)
  const mcv = O.makeCanvas(8, 8).getContext('2d');
  function wrap(text, st, max) {
    mcv.font = `${st.style || 'normal'} ${st.weight} ${st.size}px "Libre Franklin"`;
    if (mcv.measureText(text).width <= max) return [text];
    const words = text.split(' '), rows = []; let row = '';
    for (const w of words) { const tr = row ? row + ' ' + w : w; if (mcv.measureText(tr).width > max && row) { rows.push(row); row = w; } else row = tr; }
    if (row) rows.push(row);
    // balance two rows
    if (rows.length === 2) { const all = words; let best = null; for (let k = 1; k < all.length; k++) { const a = all.slice(0, k).join(' '), b = all.slice(k).join(' '); const wa = mcv.measureText(a).width, wb = mcv.measureText(b).width; if (wa > max || wb > max) continue; const sc = Math.abs(wa - wb); if (!best || sc < best[0]) best = [sc, [a, b]]; } if (best) return best[1]; }
    return rows;
  }
  // draw every active line (screen space, after the world, so subtitles survive cuts). Lines without their own x/y stack at the
  // bottom centre, the newest on the base line and earlier ones above it.
  FILM.drawLines = function (c, seq, lt) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const active = [];
    for (const L of seq.lines) { const s = FILM.lineState(L, lt); if (!s || (L.when && !L.when(lt))) continue; active.push([L, s]); }
    let base = H - 92;
    for (let i = active.length - 1; i >= 0; i--) {
      const [L, s] = active[i]; const st = Object.assign({}, STYLE[s.T.kind], L.style || {}); if (L.size) st.size = L.size;
      const rows = wrap(s.T.text, st, L.maxWidth || 1240); const lead = st.size * 1.28;
      const alpha = s.alpha * (L.alpha != null ? L.alpha : 1) * (st.alpha != null ? st.alpha : 1);
      if (L.draw) { L.draw(c, s, { rows, st, alpha }); continue; }
      const y = L.y != null ? L.y : base; const x = L.x != null ? L.x : W / 2; const align = L.align || 'center';
      // each subtitle is drawn once (its blurred halo is the costly part) into a cached strip, then placed with its alpha
      const pad = 40, hh = Math.ceil(rows.length * lead + st.size * 0.5 + 2 * pad);
      const strip = cache('cap|' + s.T.text + '|' + JSON.stringify(st) + '|' + align + '|' + (L.halo || '') + '|' + (L.maxWidth || ''), sg => {
        const ax = align === 'center' ? W / 2 : align === 'left' ? pad : W - pad;
        global.LC.caption(sg, rows.map(t => ({ t, color: st.color })), { x: ax, y: hh - pad - st.size * 0.25, size: st.size, weight: st.weight, style: st.style, align, lead: 1.28,
          halo: L.halo || 'rgba(4,10,11,0.6)', haloBlur: L.haloBlur || 14 });
      }, W, hh);
      const ox = align === 'center' ? x - W / 2 : align === 'left' ? x - pad : x - (W - pad);
      g.globalAlpha = Math.max(0, Math.min(1, alpha)); g.drawImage(strip, ox, y - (hh - pad - st.size * 0.25)); g.globalAlpha = 1;
      if (L.y == null) base = y - rows.length * lead - st.size * 0.18;
    }
    g.restore();
  };

  // ---------- render context ----------
  // c.cache(key, drawFn, w, h) keeps an offscreen canvas across frames (sets, static layers). Keys should start with the seq or set id.
  function cache(keyName, fn, w, h) {
    let e = FILM._cache.get(keyName);
    if (!e) {
      const cv = O.makeCanvas(w || W, h || H); const g = cv.getContext('2d'); fn(g, cv); e = { cv, used: 0 };
      e.px = cv.width * cv.height; FILM._cache.set(keyName, e); FILM._cachePx = (FILM._cachePx || 0) + e.px;
      // keep the least recently used layers within a memory budget (about 72 full frames) rather than a count, so a sequence
      // cutting between sets with several full-frame layers each doesn't churn, and small subtitle strips cost little
      while (FILM._cache.size > 1 && (FILM._cachePx > FILM.cacheBudgetPx || FILM._cache.size > 240)) {
        let oldest = null; for (const [k, v] of FILM._cache) if (v !== e && (!oldest || v.used < oldest[1].used)) oldest = [k, v];
        if (!oldest) break; FILM._cachePx -= oldest[1].px; FILM._cache.delete(oldest[0]);
      }
    }
    e.used = FILM._clock = (FILM._clock || 0) + 1; return e.cv;
  }
  FILM.cache = cache;
  FILM.cacheBudgetPx = 72 * W * H;
  // camera: c.camera({x, y, zoom, rot, dx, dy}): (x,y) is the world point placed at frame centre; zoom 1 = authored framing
  function camera(g, cam) {
    const z = cam.zoom || 1, r = cam.rot || 0, x = cam.x == null ? W / 2 : cam.x, y = cam.y == null ? H / 2 : cam.y;
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); g.rotate(r); g.scale(z, z); g.translate(-x, -y);
  }
  // handheld: seeded drift, returns {dx, dy}
  FILM.shake = (t, amp, hz, seed) => ({ dx: amp * wob(t, hz, (seed || 7)), dy: amp * wob(t, hz, (seed || 7) + 31) });

  function shotAt(seq, lt) { let shot = seq.shots[0]; for (const s of seq.shots) if (lt >= s.at) shot = s; return shot; }
  function makeContext(ctx, t, seq, lt, f) {
    const frameNo = Math.round(t * FPS); const shot = shotAt(seq, lt);
    const shotEnd = (seq.shots[seq.shots.indexOf(shot) + 1] || { at: seq.dur }).at;
    const g = f.world;
    const c = { t, lt, st: lt - shot.at, frame: frameNo, seq, shot, shotDur: shotEnd - shot.at, f, g, em: f.emissive, cache, after: [], before: [], seed: frameNo };
    c.reset = () => { g.setTransform(1, 0, 0, 1, 0, 0); f.emissive.setTransform(0.25, 0, 0, 0.25, 0, 0); };
    // the emissive buffer is quarter-res: camera() on it keeps the 0.25 scale
    c.camera = cam => { camera(g, cam); const e = f.emissive; e.setTransform(0.25, 0, 0, 0.25, 0, 0); const z = cam.zoom || 1, r = cam.rot || 0, x = cam.x == null ? W / 2 : cam.x, y = cam.y == null ? H / 2 : cam.y; e.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); e.rotate(r); e.scale(z, z); e.translate(-x, -y); };
    return c;
  }
  // FILM.drawShot(c, 'Q02', 21.5): draw what sequence Q02 shows at its local time 21.5 into this frame (world and emissive),
  // with that shot's own post settings returned so the caller can adopt them. Used for the flash cuts.
  FILM.drawShot = function (c, seqId, lt, opts) {
    const seq = FILM.lib[seqId]; if (!seq) { warn('drawShot: sequence ' + seqId + ' is not loaded'); return null; }
    if (!seq._setup && seq.setup) seq.setup(); seq._setup = true;
    const shot = shotAt(seq, lt); const shotEnd = (seq.shots[seq.shots.indexOf(shot) + 1] || { at: seq.dur }).at;
    // its own before/after lists (copied into the caller's below once), so a flashed shot's post effects run exactly once
    const c2 = Object.assign({}, c, { lt, st: lt - shot.at, seq, shot, shotDur: shotEnd - shot.at, flash: true, before: [], after: [], post: {} });
    c.reset();
    try { shot.draw(c2, lt - shot.at, lt); } catch (err) { warn('drawShot ' + seqId + '/' + (shot.name || shot.at) + ': ' + err.message); console.error(err); }
    c.reset();
    c2.before.forEach(fn => c.before.push(fn)); c2.after.forEach(fn => c.after.push(fn));
    if (opts && opts.lines && seq.lines.length) FILM.drawLines(c, seq, lt);
    return Object.assign({}, seq.post || {}, shot.post || {}, c2.post || {});
  };

  let mainCtx = null;
  FILM.renderAt = function (t, ctx) {
    ctx = ctx || mainCtx; t = clamp(t, 0, Math.max(0, FILM.total - 1e-4));
    const seq = FILM.find(t); if (!seq) return;
    const lt = t - seq.start;
    if (!seq._setup && seq.setup) { seq.setup(); } seq._setup = true;
    const f = O.frame(ctx, { pool: true });
    const g = f.world; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const c = makeContext(ctx, t, seq, lt, f); const shot = c.shot, st = c.st;
    c.post = {};
    try { shot.draw(c, st, lt); } catch (err) { warn(seq.id + '/' + (shot.name || shot.at) + ': ' + err.message); console.error(err); }
    c.reset();
    if (seq.lines.length) FILM.drawLines(c, seq, lt);
    // Look C finish: fine grain, halation on light sources, a teal vignette; never a letterbox
    const P = Object.assign({ grain: 0.05, halation: 0.55, vig: 0.4, vigColor: '#081011' }, seq.post || {}, shot.post || {}, c.post || {});
    const post = { letterbox: 0, seed: (c.frame % 8) + 1, t: lt, grain: P.grain, vignette: 0, halation: P.halation, fibre: 0,
      beforePost: cx => { if (P.vig > 0 && global.LC) global.LC.vignette(cx, P.vig, P.vigColor); c.before.forEach(fn => fn(cx)); },
      afterPost: cx => c.after.forEach(fn => fn(cx)) };
    // subtitles are drawn on the world before post; keep them crisp by drawing again after post when asked (default: no)
    f.finish(post);
    // fades to and from black requested by the shot: fade(st, dur) returns 0..1 of black
    const fade = shot.fade ? shot.fade(st, c.shotDur) : 0; if (fade > 0) { ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    return c;
  };

  function warn(m) { if (FILM._warned[m]) return; FILM._warned[m] = 1; console.warn('[film] ' + m); (FILM.warnings = FILM.warnings || []).push(m); }
  FILM.warn = warn;

  // ---------- score (sound) ----------
  // seq.sound(S): S.cue(name, t, params) one-shot; S.bed(name, t0, t1, params) continuous; S.silence(t0, t1) the world drops out;
  // S.duck(t0, t1, level). Voiced lines add their take automatically (cue 'voice', or 'radio' for the presenter).
  FILM.score = function (seq) {
    if (seq._score) return seq._score;
    const ev = { cues: [], beds: [], silences: [], ducks: [] };
    const S = { cue: (name, t, p) => ev.cues.push({ name, t, p: p || {} }), bed: (name, t0, t1, p) => ev.beds.push({ name, t0, t1, p: p || {} }),
      silence: (t0, t1) => ev.silences.push({ t0, t1 }), duck: (t0, t1, level) => ev.ducks.push({ t0, t1, level }) };
    if (seq.sound) seq.sound(S);
    for (const L of seq.lines) {
      if (L.silent) continue; const T = FILM.lineTiming(L);
      if (T.voice) S.cue(T.kind === 'radio' ? 'radio' : 'voice', T.at + (L.voiceDelay || 0), { id: L.id, take: T.voice.take, dur: T.voice.dur, level: L.level });
    }
    return (seq._score = ev);
  };
  FILM.renderAudio = async function (seq, sr) {
    sr = sr || 44100; const len = Math.ceil(seq.dur * sr);
    const ac = new OfflineAudioContext(2, len, sr);
    const ev = FILM.score(seq);
    if (!global.SOUND) { warn('sound.js not loaded'); return ac.startRendering(); }
    await global.SOUND.ready(ac);
    global.SOUND.build(ac, ev, seq);
    return ac.startRendering();
  };

  // ---------- player ----------
  FILM.player = function (opts) {
    opts = opts || {};
    const root = document.getElementById('film');
    const cv = O.makeCanvas(W, H); cv.id = 'screen'; root.querySelector('.screen').appendChild(cv); mainCtx = cv.getContext('2d');
    const ui = { play: root.querySelector('#play'), time: root.querySelector('#time'), bar: root.querySelector('#bar'), fill: root.querySelector('#fill'), head: root.querySelector('#head'),
      ticks: root.querySelector('#ticks'), sound: root.querySelector('#sound'), full: root.querySelector('#full'), scene: root.querySelector('#scene'), note: root.querySelector('#note') };
    let t = 0, playing = false, ac = null, master = null, t0Audio = 0, t0Film = 0, raf = 0, muted = false;
    const buffers = new Map(), pending = new Map(), sources = [];
    const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
    FILM.seqs.forEach(s => { const d = document.createElement('button'); d.className = 'tick'; d.style.left = (100 * s.start / FILM.total) + '%'; d.style.width = (100 * s.dur / FILM.total) + '%'; d.title = s.title; d.setAttribute('aria-label', 'Jump to ' + s.title); d.onclick = e => { e.stopPropagation(); seek(s.start + 0.001); }; ui.ticks.appendChild(d); });
    function draw() {
      FILM.renderAt(t); const s = FILM.find(t);
      ui.time.textContent = fmt(t) + ' / ' + fmt(FILM.total); ui.scene.textContent = s ? s.title : '';
      const p = 100 * t / FILM.total; ui.fill.style.width = p + '%'; ui.head.style.left = p + '%';
    }
    function getBuffer(seq) {
      if (buffers.has(seq)) return Promise.resolve(buffers.get(seq));
      if (pending.has(seq)) return pending.get(seq);
      const pr = FILM.renderAudio(seq, 32000).then(b => { buffers.set(seq, b); pending.delete(seq); if (buffers.size > 4) { const k = buffers.keys().next().value; if (k !== seq) buffers.delete(k); } return b; });
      pending.set(seq, pr); return pr;
    }
    // the mixed soundtrack (opts.audio: the same mix as the MP4) drives the clock when given; otherwise the engine renders each sequence
    let track = opts.audio ? new Audio(opts.audio) : null; if (track) { track.preload = 'auto'; if (!track.canPlayType('audio/mpeg')) track = null; }
    function stopAudio() { if (track) track.pause(); sources.splice(0).forEach(s => { try { s.stop(); } catch (e) { } }); }
    let clockFromAudio = false, wall0 = 0;
    async function startAudio() {
      if (muted) return;
      if (track) {
        ui.note.textContent = 'Loading sound…'; ui.note.hidden = false;
        try { track.currentTime = t; await track.play(); } catch (e) { console.warn('soundtrack', e); track = null; }
        if (track) { ui.note.hidden = true; if (!playing) { track.pause(); return; } t0Film = t; clockFromAudio = true; return; }
      }
      if (!ac) { ac = new (global.AudioContext || global.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
      await ac.resume(); stopAudio();
      const seq = FILM.find(t); const i = FILM.seqs.indexOf(seq);
      ui.note.textContent = 'Preparing sound…'; ui.note.hidden = false;
      const buf = await getBuffer(seq); if (!playing) return; ui.note.hidden = true;
      t0Audio = ac.currentTime + 0.05; t0Film = t;
      const play = (b, when, offset) => { const src = ac.createBufferSource(); src.buffer = b; src.connect(master); src.start(when, Math.max(0, offset)); sources.push(src); };
      play(buf, t0Audio, t - seq.start);
      let at = t0Audio + (seq.start + seq.dur - t);
      for (let k = i + 1; k < Math.min(FILM.seqs.length, i + 3); k++) { const q = FILM.seqs[k]; const when = at; getBuffer(q).then(b => { if (playing && when > ac.currentTime) play(b, when, 0); }); at += q.dur; }
      clockFromAudio = true;
    }
    function loop(now) {
      if (!playing) return;
      if (clockFromAudio && track) t = track.currentTime; else if (clockFromAudio && ac) t = t0Film + Math.max(0, ac.currentTime - t0Audio); else t = t0Film + (now - wall0) / 1000;
      if (t >= FILM.total) { t = FILM.total - 0.001; pause(); draw(); return; }
      if (clockFromAudio && ac && !track) { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); const nxt = FILM.seqs[i + 2]; if (nxt) getBuffer(nxt); }
      draw(); raf = requestAnimationFrame(loop);
    }
    let posterShown = false;
    function play() { if (playing) return; if (posterShown) { posterShown = false; t = 0; } playing = true; ui.play.textContent = 'Pause'; ui.play.setAttribute('aria-label', 'Pause'); t0Film = t; wall0 = performance.now(); clockFromAudio = false; startAudio().catch(e => { ui.note.hidden = true; console.warn(e); }); raf = requestAnimationFrame(loop); }
    function pause() { playing = false; ui.play.textContent = 'Play'; ui.play.setAttribute('aria-label', 'Play'); cancelAnimationFrame(raf); stopAudio(); clockFromAudio = false; }
    function seek(nt) { posterShown = false; const was = playing; if (was) pause(); t = clamp(nt, 0, FILM.total - 0.001); draw(); if (was) play(); }
    ui.play.onclick = () => playing ? pause() : play();
    ui.bar.onclick = e => { const r = ui.bar.getBoundingClientRect(); seek(FILM.total * (e.clientX - r.left) / r.width); };
    ui.sound.onclick = () => { muted = !muted; ui.sound.textContent = muted ? 'Sound off' : 'Sound on'; ui.sound.setAttribute('aria-pressed', String(!muted)); if (muted) stopAudio(); else if (playing) { t0Film = t; startAudio(); } };
    ui.full.onclick = () => { const el = root.querySelector('.screen'); (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => { }); };
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.code === 'ArrowRight') seek(t + 5); if (e.code === 'ArrowLeft') seek(t - 5);
      if (e.code === 'BracketRight') { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); if (FILM.seqs[i + 1]) seek(FILM.seqs[i + 1].start + 0.001); }
      if (e.code === 'BracketLeft') { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); seek((FILM.seqs[Math.max(0, i - (t - s.start < 1 ? 1 : 0))] || s).start + 0.001); }
    });
    const h = location.hash.replace('#', ''); const js = FILM.seqs.find(s => s.id.toLowerCase() === h.toLowerCase()); if (js) t = js.start + 0.001;
    if (opts.t != null) t = opts.t;
    if (opts.poster != null && !js && opts.t == null) { t = opts.poster; posterShown = true; }
    draw();
    FILM.ui = { play, pause, seek, get t() { return t; } };
  };

  // ---------- export hooks (used by tools/export.js and tools/strip.js) ----------
  FILM.mountHeadless = function () { const cv = O.makeCanvas(W, H); mainCtx = cv.getContext('2d'); document.body.appendChild(cv); cv.style.cssText = 'width:100vw;height:56.25vw;display:block'; return cv; };
  FILM.wav = async function (seqIndex, sr) {
    const seq = FILM.seqs[seqIndex]; const buf = await FILM.renderAudio(seq, sr || 48000);
    const n = buf.length, ch = 2, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L; let o = 44;
    for (let i = 0; i < n; i++) { out.setInt16(o, clamp(L[i], -1, 1) * 32767, true); out.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); o += 4; }
    const bytes = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  // the cue sheet for the offline mixer: every sequence's sound events in global seconds
  FILM.cuesheet = function () {
    return FILM.seqs.map(s => { const ev = FILM.score(s); return { id: s.id, title: s.title, start: s.start, dur: s.dur, cues: ev.cues, beds: ev.beds, silences: ev.silences, ducks: ev.ducks }; });
  };
})(window);
