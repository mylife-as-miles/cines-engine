/* ONE TOO MANY — the sound engine. Score, music and the sounds that are synthetic in life (tinnitus, the 7th-harmonic drone,
   DTMF, ringback) are built from oscillators and seeded noise; ambience beds (fire, walla, gas, siren, heartbeat) play CC0
   recordings from film/audio/samples.js when it is loaded (SOUND.loop / SOUND.one), with the synthesised version as fallback.
   One-shot effects are placed from the same score by the opus-sound-layer mixer (tools/cuesheet.py, film/sfx_map.js):
   with SOUND.stem = 'bed' every cue the map hands to the mixer is left out of this render.
   SOUND.build(ac, score, seq) renders a sequence's score into an (Offline)AudioContext.
   Buses: room (beds and ambience), music, fx (one-shots), dialogue (type landings), extra (the 7th harmonic; never silenced).
   Beds:  SOUND.beds[name](ac, B, t0, t1, p, R)   Cues: SOUND.cues[name](ac, B, t, p, R)
   See FILM.md for the list of names and their params. */
(function (global) {
  'use strict';
  const SOUND = global.SOUND = { beds: {}, cues: {} };
  const db = d => Math.pow(10, d / 20);
  const noiseCache = new WeakMap();

  function noise(ac, kind, seed) {
    let m = noiseCache.get(ac); if (!m) { m = {}; noiseCache.set(ac, m); }
    const k = kind + (seed || 0); if (m[k]) return m[k];
    const len = Math.floor(ac.sampleRate * 3), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); const r = global.OTM.rng('noise' + k);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return (m[k] = b);
  }
  function src(ac, kind, seed, t0, t1, rate) { const s = ac.createBufferSource(); s.buffer = noise(ac, kind, seed); s.loop = true; if (rate) s.playbackRate.value = rate; s.start(t0, (seed || 0) % 2.5); if (t1 != null) s.stop(t1); return s; }
  function osc(ac, type, f, t0, t1) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(t0); if (t1 != null) o.stop(t1); return o; }
  function filt(ac, type, f, q, gainDb) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (gainDb != null) b.gain.value = gainDb; return b; }
  function gain(ac, v) { const g = ac.createGain(); g.gain.value = v == null ? 1 : v; return g; }
  function pan(ac, p) { if (!ac.createStereoPanner) return gain(ac, 1); const s = ac.createStereoPanner(); s.pan.value = p || 0; return s; }
  function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
  // percussive envelope on a gain param
  function perc(g, t, peak, a, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(1e-5, peak * 1e-3), t + a + d); }
  // bed envelope: fade in/out over [t0,t1]
  function bedEnv(g, t0, t1, level, fi, fo) { fi = fi == null ? 1.5 : fi; fo = fo == null ? 1.5 : fo; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(level, t0 + fi); g.gain.setValueAtTime(level, Math.max(t0 + fi, t1 - fo)); g.gain.linearRampToValueAtTime(0, t1); }
  Object.assign(SOUND, { db, noise, src, osc, filt, gain, pan, chain, perc, bedEnv });

  // ---------- recordings ----------
  // film/audio/samples.js: FILM_AUDIO = { name: { b64, gain (dB trim to the synthesised bed it replaces), credit } }
  SOUND.buffers = {};
  SOUND.ready = function () {
    const A = global.FILM_AUDIO; if (!A) return Promise.resolve();
    if (SOUND._ready) return SOUND._ready;
    const ac = new OfflineAudioContext(2, 1, 48000);
    return (SOUND._ready = Promise.all(Object.keys(A).map(k => { const bin = atob(A[k].b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return ac.decodeAudioData(u.buffer).then(b => { SOUND.buffers[k] = b; }, e => console.warn('sample ' + k, e)); })));
  };
  SOUND.has = name => !!SOUND.buffers[name];
  // a recorded loop playing over [t0, t1] from a seeded offset; returns its output node (or null without the recording)
  SOUND.loop = (ac, name, t0, t1, o) => {
    const b = SOUND.buffers[name]; if (!b) return null; o = o || {};
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; if (o.rate) s.playbackRate.value = o.rate;
    const g = gain(ac, db(((global.FILM_AUDIO[name] || {}).gain || 0) + (o.trim || 0))); s.connect(g);
    s.start(t0, (o.offset || 0) % b.duration); if (t1 != null) s.stop(t1); return g;
  };
  // a recording played once at t
  SOUND.one = (ac, name, t, o) => {
    const b = SOUND.buffers[name]; if (!b) return null; o = o || {};
    const s = ac.createBufferSource(); s.buffer = b; if (o.rate) s.playbackRate.value = o.rate;
    const g = gain(ac, db(((global.FILM_AUDIO[name] || {}).gain || 0) + (o.trim || 0))); s.connect(g); s.start(t); return g;
  };
  // cues the mixer places (film/sfx_map.js); left out when rendering the bed stem
  SOUND.stem = null;
  SOUND.external = name => { const m = global.FILM_SFX && global.FILM_SFX.cues[name]; return !!m && m.sound !== 'code' && !m.engine; };

  function buses(ac) {
    const master = gain(ac, 0.9); const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    chain(master, comp, ac.destination);
    // a small dark room reverb shared by everything inside the house
    const rv = ac.createConvolver(); const len = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, len, ac.sampleRate); const r = global.OTM.rng('ir');
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1); }
    rv.buffer = ir; const rvOut = gain(ac, 0.22); chain(rv, rvOut, master);
    const B = { master, reverb: rv };
    ['room', 'music', 'fx', 'dialogue', 'extra'].forEach(n => { B[n] = gain(ac, 1); B[n].connect(master); });
    ['music', 'fx'].forEach(n => { const s = gain(ac, 0.5); B[n].connect(s); s.connect(rv); });
    return B;
  }

  SOUND.build = function (ac, ev, seq) {
    const B = buses(ac); const R = global.OTM.rng('snd' + (seq && seq.id));
    // per-sequence mix trim (seq.gain in dB) and 4 ms edge fades, so hard cuts between sequences never click
    if (seq) { const g = B.master.gain, v = 0.9 * db(seq.gain || 0), end = seq.dur; g.setValueAtTime(0, 0); g.linearRampToValueAtTime(v, 0.004); g.setValueAtTime(v, Math.max(0.005, end - 0.004)); g.linearRampToValueAtTime(0, end); }
    const run = (tab, name, args) => { const fn = tab[name]; if (!fn) { global.FILM && global.FILM.warn('no sound "' + name + '"'); return; } try { fn(ac, B, ...args, R); } catch (e) { console.warn('sound ' + name, e); } };
    // beds the generated score replaces (SOUND.replaced: [{ name, t0, t1 }] in GLOBAL film time, from the score plan): any bed
    // instance a cue's span touches is left out whole, so no fragment of the synth version leaks past the cue's edges
    const spans = (SOUND.replaced || []).map(r => ({ name: r.name, t0: r.t0 - (seq ? seq.start : 0), t1: r.t1 - (seq ? seq.start : 0) }));
    ev.beds.forEach(b => {
      const off = (global.FILM_SFX && global.FILM_SFX.beds_off) || [];
      if (off.includes(b.name) || (b.p && b.p.bed && off.includes(b.p.bed))) return;   // taken out of the film
      const hit = spans.some(r => (r.name === b.name || r.name === b.name.replace(/^Q\d+\./, '') || r.name === (b.p && b.p.bed)) && r.t1 > b.t0 && r.t0 < b.t1);
      if (hit) { (SOUND.removed = SOUND.removed || []).push((seq ? seq.id : '') + ' ' + b.name + (b.p && b.p.bed ? '(' + b.p.bed + ')' : '') + ' ' + b.t0.toFixed(2) + '-' + b.t1.toFixed(2)); return; }
      run(SOUND.beds, b.name, [b.t0, b.t1, b.p]);
    });
    ev.cues.forEach(q => { if (SOUND.stem === 'bed' && SOUND.external(q.name)) return; run(SOUND.cues, q.name, [q.t, q.p]); });
    // the Extra's silence: every bus but the 7th harmonic drops to exactly nothing for the word
    const holes = ev.holes.slice().sort((a, b) => a.t0 - b.t0);
    ['room', 'music', 'fx', 'dialogue'].forEach(n => { const gp = B[n].gain; gp.setValueAtTime(1, 0); holes.forEach(h => { gp.setValueAtTime(1, Math.max(0, h.t0 - 0.15)); gp.linearRampToValueAtTime(0, h.t0); gp.setValueAtTime(0, h.t0 + h.dur); gp.linearRampToValueAtTime(1, h.t0 + h.dur + 0.06); }); });
    ev.ducks.slice().sort((a, b) => a.t0 - b.t0).forEach(d => { ['room', 'music'].forEach(n => { const gp = B[n].gain; gp.setValueAtTime(1, Math.max(0, d.t0 - 0.2)); gp.linearRampToValueAtTime(d.level, d.t0); gp.setValueAtTime(d.level, d.t1); gp.linearRampToValueAtTime(1, d.t1 + 0.3); }); });
  };

  const BD = SOUND.beds, CU = SOUND.cues;

  // ======================= BEDS =======================
  // tinnitus: two sines beating at 5.5 Hz. p.level (dB, default -38)
  BD.tinnitus = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -38) * 2, p.fi || 2, p.fo || 0.8); [6200, 6205.5].forEach(f => osc(ac, 'sine', f, t0, t1).connect(g)); g.connect(B.room); };
  // the recorded fire (two takes, near and far, layered) into an output node; false without the recordings
  SOUND.fireRec = (ac, out, t0, t1, p) => {
    if (!SOUND.has('fire')) return false; const near = p.near == null ? 0.6 : p.near;
    const a = SOUND.loop(ac, 'fire', t0, t1, { offset: 3 + t0 }); a.connect(out);
    const b = SOUND.loop(ac, 'fire_roar', t0, t1, { offset: 11 + t0, trim: -2 }); if (b) chain(b, filt(ac, 'lowpass', 900 + 5000 * near, 0.5)).connect(out);
    chain(osc(ac, 'sine', 41, t0, t1), gain(ac, 0.08)).connect(out); return true;
  };
  // fire: brown-noise roar + crackle grains + low rumble. p.level dB (-14), p.near (0..1 crackle density)
  BD.fire = (ac, B, t0, t1, p, R) => {
    const lv = db(p.level == null ? -14 : p.level); const out = gain(ac, 0); bedEnv(out, t0, t1, lv, p.fi == null ? 2 : p.fi, p.fo == null ? 2 : p.fo); out.connect(B.room);
    if (SOUND.fireRec(ac, out, t0, t1, p)) return;
    const roar = chain(src(ac, 'brown', 3, t0, t1), filt(ac, 'lowpass', 700, 0.5), gain(ac, 1.2)); roar.connect(out);
    const lfo = osc(ac, 'sine', 0.13, t0, t1), lg = gain(ac, 0.35); chain(lfo, lg); lg.connect(out.gain);
    [41, 62].forEach((f, i) => chain(osc(ac, 'sine', f, t0, t1), gain(ac, 0.12 / (i + 1))).connect(out));
    const n = Math.floor((t1 - t0) * (6 + 18 * (p.near == null ? 0.6 : p.near)));
    for (let i = 0; i < n; i++) { const t = t0 + R() * (t1 - t0); const g = gain(ac, 0); perc(g, t, 0.05 + R() * 0.25, 0.001, 0.02 + R() * 0.06); chain(src(ac, 'white', 7 + i % 5, t, t + 0.12), filt(ac, 'bandpass', 1800 + R() * 3500, 1.5), g, pan(ac, R() * 1.4 - 0.7)).connect(out); }
  };
  // room tone: mains hum + soft brown noise. p.level dB (-40)
  BD.room = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -40), 1, 1); chain(src(ac, 'brown', 11, t0, t1), filt(ac, 'lowpass', 220, 0.7)).connect(g); chain(osc(ac, 'sine', 50, t0, t1), gain(ac, 0.5)).connect(g); chain(osc(ac, 'sine', 100, t0, t1), gain(ac, 0.3)).connect(g); g.connect(B.room); };
  // rain outside. p.open: [[t, 0|1], ...] door open/closed automation; p.level dB (-30)
  BD.rain = (ac, B, t0, t1, p) => {
    const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -30), 1, 1); const lp = filt(ac, 'lowpass', 1500, 0.4);
    chain(src(ac, 'white', 21, t0, t1), filt(ac, 'highpass', 1200, 0.5), lp, g); g.connect(B.room);
    (p.open || []).forEach(([t, o]) => { lp.frequency.setTargetAtTime(o ? 7000 : 1500, t, 0.05); });
    const dr = Math.floor((t1 - t0) * 3); const r = global.OTM.rng('drip'); for (let i = 0; i < dr; i++) { const t = t0 + r() * (t1 - t0); const e = gain(ac, 0); perc(e, t, 0.04, 0.001, 0.05); chain(osc(ac, 'sine', 1800 + r() * 1400, t, t + 0.1), e, g); }
  };
  // fridge hum. p.level dB (-40); p.steps: [[t, dB], ...]
  BD.fridge = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -40), 1.5, 1); (p.steps || []).forEach(([t, d]) => g.gain.setTargetAtTime(db(d), t, 0.08)); chain(osc(ac, 'sawtooth', 50, t0, t1), filt(ac, 'lowpass', 180, 2), g); chain(osc(ac, 'sine', 100, t0, t1), gain(ac, 0.5), g); g.connect(B.room); };
  // gas hiss, hard-panned, fluttering. p.from dB, p.to dB (ramped over the bed)
  BD.gas = (ac, B, t0, t1, p) => {
    const g = gain(ac, 0); g.gain.setValueAtTime(db(p.from == null ? -54 : p.from), t0); g.gain.linearRampToValueAtTime(db(p.to == null ? -24 : p.to), Math.max(t0 + 0.1, t1 - 0.3)); g.gain.linearRampToValueAtTime(0, t1);
    if (!SOUND.gasRec(ac, g, t0, t1)) [-1, 1].forEach((side, i) => chain(src(ac, 'white', 31 + i, t0, t1), filt(ac, 'highpass', 2800, 0.7), filt(ac, 'peaking', 6500, 1, 6), pan(ac, side), g));
    const l = osc(ac, 'sine', 7, t0, t1), lg = gain(ac, db(p.to || -24) * 0.08); chain(l, lg); lg.connect(g.gain); g.connect(B.room);
  };
  // the recorded gas hiss, spread wide (two offsets of one take), into g; false without the recording
  SOUND.gasRec = (ac, g, t0, t1) => { if (!SOUND.has('gas')) return false; [-0.85, 0.85].forEach((side, i) => chain(SOUND.loop(ac, 'gas', t0, t1, { offset: 1 + i * 2.7 + t0 }), filt(ac, 'highpass', 900, 0.7), pan(ac, side), g)); return true; };
  // the Extra's leitmotif: a drone on 55 Hz partials 1..6 plus the 7th, detuned flat. Goes to the 'extra' bus (never silenced). p.level dB (-30), p.seventh dB (-26)
  BD.drone7 = (ac, B, t0, t1, p) => {
    const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -30), p.fi || 4, p.fo || 3); const lp = filt(ac, 'lowpass', 600, 0.5);
    for (let n = 1; n <= 6; n++) chain(osc(ac, 'sine', 55 * n, t0, t1), gain(ac, 1 / n), lp);
    const lfo = osc(ac, 'sine', 0.05, t0, t1), lg = gain(ac, 300); chain(lfo, lg); lg.connect(lp.frequency); lp.connect(g);
    const s7 = gain(ac, 0); bedEnv(s7, t0, t1, db(p.seventh || -26), p.fi || 4, p.fo || 3); [384.7, 385.4].forEach(f => osc(ac, 'sine', f, t0, t1).connect(s7)); s7.connect(B.extra); g.connect(B.extra);
  };
  // party walla: formant-filtered pink noise murmur. p.level dB (-30); p.cut: time the room's laugh dies
  BD.walla = (ac, B, t0, t1, p, R) => {
    const g = gain(ac, 0); bedEnv(g, t0, p.cut || t1, db(p.level || -30), 1.2, p.cut ? 0.12 : 1.5);
    if (SOUND.wallaRec(ac, g, t0, t1)) { g.connect(B.room); return; }
    for (let v = 0; v < 6; v++) { const s = src(ac, 'pink', 40 + v, t0, t1, 0.9 + v * 0.03); const fs = [[500 + v * 40, 6], [1500 + v * 90, 8], [2500, 9]]; const vg = gain(ac, 0.6); fs.forEach(([f, q]) => chain(s, filt(ac, 'bandpass', f, q), vg)); const am = osc(ac, 'sine', 2.2 + v * 0.7, t0, t1), ag = gain(ac, 0.5); chain(am, ag); ag.connect(vg.gain); chain(vg, pan(ac, (v - 2.5) / 3), g); }
    g.connect(B.room);
  };
  // the recorded party chatter, into g; false without the recording
  SOUND.wallaRec = (ac, g, t0, t1, trim) => { const a = SOUND.loop(ac, 'walla', t0, t1, { offset: 5 + t0, trim }); if (!a) return false; chain(a, filt(ac, 'highpass', 160, 0.7), g); return true; };
  // one recorded heartbeat (lub-dub) at t into dest, alternating between two beats; false without the recording
  SOUND.beat = (ac, dest, t, trim) => { const k = Math.round(t * 7) % 2 ? 'beat2' : 'beat'; const b = SOUND.one(ac, SOUND.has(k) ? k : 'beat', t, { trim }); if (!b) return false; b.connect(dest); return true; };
  // heartbeat. p.bpm (or p.bpmTo for a ramp), p.level dB (-20), p.pan
  BD.heart = (ac, B, t0, t1, p) => {
    const lp = filt(ac, 'lowpass', 150, 0.7); chain(lp, gain(ac, db(p.level || -20)), pan(ac, p.pan || 0), B.room);
    let t = t0; const b0 = p.bpm || 60, b1 = p.bpmTo || b0;
    while (t < t1) { const u = (t - t0) / Math.max(1e-3, t1 - t0); const bpm = b0 + (b1 - b0) * u; if (!SOUND.beat(ac, lp, t)) [[52, 0], [44, 0.21]].forEach(([f, dt], i) => { const g = gain(ac, 0); perc(g, t + dt, i ? 0.6 : 1, 0.008, 0.12); chain(osc(ac, 'sine', f, t + dt, t + dt + 0.25), g, lp); }); t += 60 / bpm; }
  };
  // the recorded UK siren, distant (low-passed), into g; false without the recording
  SOUND.sirenRec = (ac, g, t0, t1, lp) => { const a = SOUND.loop(ac, 'siren', t0, t1, { offset: 2 + t0 }); if (!a) return false; const f = filt(ac, 'lowpass', lp || 2200, 0.5); chain(a, f, g); return f; };
  // distant UK two-tone siren creeping closer. p.level dB (-34)
  BD.siren = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -34), 4, 2); if (SOUND.sirenRec(ac, g, t0, t1)) { g.connect(B.room); g.connect(B.reverb); return; } const o = osc(ac, 'triangle', 770, t0, t1); for (let t = t0; t < t1; t += 1.2) { o.frequency.setValueAtTime(770, t); o.frequency.setValueAtTime(960, t + 0.6); } chain(o, filt(ac, 'lowpass', 1200, 0.5), g); g.connect(B.room); g.connect(B.reverb); };
  // the last two notes: a unison that beats every 1.7 s. p.level dB (-26)
  BD.unison = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -26), p.fi || 3, p.fo || 4); [220, 220.6].forEach(f => osc(ac, 'sine', f, t0, t1).connect(g)); g.connect(B.extra); };
  // a sustained low tension pad for rising dread. p.level dB (-30), p.root Hz (55)
  BD.dread = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -30), p.fi || 3, p.fo || 2); const r = p.root || 55; [1, 1.5, 2.01, 2.99].forEach((m, i) => chain(osc(ac, i % 2 ? 'triangle' : 'sine', r * m, t0, t1), gain(ac, 0.5 / (i + 1)), g)); const lp = filt(ac, 'lowpass', 400, 1); g.connect(lp); lp.connect(B.music); };
  // party groove: soft e-piano chords in 6/8 (diegetic, from a speaker). p.level dB (-26)
  BD.groove = (ac, B, t0, t1, p) => {
    const out = gain(ac, 0); bedEnv(out, t0, t1, db(p.level || -26), 1, 1.5); out.connect(B.music);
    const chords = [[146.8, 174.6, 220, 261.6, 329.6], [98, 123.5, 174.6, 220, 329.6], [130.8, 164.8, 196, 246.9, 293.7], [110, 138.6, 164.8, 196, 233.1]];
    const e = 60 / 70 / 3; let t = t0, bar = 0;
    while (t < t1) { const ch = chords[bar % 4]; for (let k = 0; k < 6; k++) { const tt = t + k * e; if (tt > t1) break; if (k === 0 || k === 3 || k === 5) ch.forEach((f, i) => { const g = gain(ac, 0); perc(g, tt, (k ? 0.05 : 0.08) / (1 + i * 0.3), 0.005, k ? 0.5 : 1.4); const o = osc(ac, 'sine', f * (k === 5 ? 2 : 1), tt, tt + 1.6); const m = osc(ac, 'sine', f * 2, tt, tt + 1.6), mg = gain(ac, f * 1.2); chain(m, mg); mg.connect(o.frequency); chain(o, g, out); }); } t += e * 6; bar++; }
    chain(osc(ac, 'sine', 55, t0, t1), gain(ac, 0)).connect(out);
  };

  // ======================= DIALOGUE LANDINGS (-30..-38 dBFS) =======================
  const tick = (ac, bus, t, f, dur, lvl, type) => { const g = gain(ac, 0); perc(g, t, db(lvl), 0.001, dur); chain(osc(ac, type || 'sine', f, t, t + dur + 0.05), g, bus); };
  const click = (ac, bus, t, f, q, lvl, d) => { const g = gain(ac, 0); perc(g, t, db(lvl), 0.0005, d || 0.02); chain(src(ac, 'white', 51, t, t + (d || 0.02) + 0.05), filt(ac, 'bandpass', f, q || 2), g, bus); };
  CU['land.scott'] = (ac, B, t, p) => { const n = Math.min(60, p.chars || 4), d = p.dur || n * 0.035; for (let i = 0; i < n; i++) tick(ac, B.dialogue, t + d * i / n, 180, 0.006, -40); if (p.end && p.holdEnd) { const m = Math.min(40, n); for (let i = 0; i < m; i++) tick(ac, B.dialogue, p.holdEnd + (p.end - p.holdEnd) * i / m, 220, 0.005, -44); } };
  CU['land.deena'] = (ac, B, t) => { click(ac, B.dialogue, t, 600, 3, -26, 0.035); tick(ac, B.dialogue, t, 120, 0.05, -30); };
  CU['land.angelo'] = (ac, B, t, p) => { const n = Math.min(14, p.words || 1), d = p.dur || n * 0.16; for (let i = 0; i < n; i++) { click(ac, B.dialogue, t + d * (i + 1) / n - 0.02, 3200, 2, -30, 0.006); tick(ac, B.dialogue, t + d * (i + 1) / n - 0.02, 160, 0.015, -36); } };
  CU['land.kay'] = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t + (p.dur || 0.4) * 0.8, db(-30), 0.001, 0.18); const o = osc(ac, 'sine', 1400, t, t + (p.dur || 0.4) * 0.8 + 0.3); o.frequency.setValueAtTime(1400, t + (p.dur || 0.4) * 0.8); o.frequency.exponentialRampToValueAtTime(700, t + (p.dur || 0.4) * 0.8 + 0.15); chain(o, g, B.dialogue); };
  CU['land.christof'] = (ac, B, t, p) => { const n = Math.min(20, Math.round((p.chars || 10) / 2)), d = p.dur || 0.5; for (let i = 0; i < n; i++) tick(ac, B.dialogue, t + d * i / n, 2400 + (i % 5) * 180, 0.06, -42, 'triangle'); };
  CU['land.marina'] = (ac, B, t, p) => { const n = Math.min(50, p.chars || 10), d = p.dur || n * 0.028; for (let i = 0; i < n; i++) click(ac, B.dialogue, t + 0.12 + (d - 0.12) * i / n, 5000, 4, -46, 0.004); tick(ac, B.dialogue, t + d, 1900, 0.25, -36, 'sine'); tick(ac, B.dialogue, t + d, 2850, 0.18, -42, 'sine'); };
  CU['land.dispatcher'] = (ac, B, t, p) => { click(ac, B.dialogue, t, 1800, 6, -34, 0.01); const g = gain(ac, 0); bedEnv(g, t, t + (p.dur || 1) + 0.3, db(-46), 0.03, 0.1); chain(src(ac, 'white', 61, t, t + (p.dur || 1) + 0.35), filt(ac, 'bandpass', 1700, 1.2), g, B.dialogue); };
  CU['land.voice'] = () => { };

  // ======================= ONE-SHOTS =======================
  // a hard cut to black: everything stops and a low thud lands. p.level dB (-10)
  CU.smash = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -10), 0.002, 0.6); const o = osc(ac, 'sine', 70, t, t + 0.8); o.frequency.exponentialRampToValueAtTime(30, t + 0.6); chain(o, g, B.fx); click(ac, B.fx, t, 900, 1, -18, 0.05); };
  CU.glass = (ac, B, t, p, R) => { for (let i = 0; i < 14; i++) { const tt = t + R() * 0.35; const g = gain(ac, 0); perc(g, tt, db((p.level || -20) - R() * 10), 0.001, 0.08 + R() * 0.2); chain(osc(ac, 'sine', 3000 + R() * 5000, tt, tt + 0.4), g, pan(ac, p.pan || 0), B.fx); } click(ac, B.fx, t, 4000, 0.7, (p.level || -20) + 4, 0.08); };
  CU.doorbell = (ac, B, t, p) => { [[659.25, 0], [523.25, 0.4]].forEach(([f, dt]) => [1, 2, 3].forEach((m, i) => { const g = gain(ac, 0); perc(g, t + dt, db((p.level || -18) - [0, 12, 20][i]), 0.003, 1.2); chain(osc(ac, 'sine', f * m, t + dt, t + dt + 1.4), g, B.fx); })); };
  CU.knock = (ac, B, t, p) => { const n = p.n || 3; for (let i = 0; i < n; i++) { const tt = t + i * (p.gap || 0.16); const g = gain(ac, 0); perc(g, tt, db(p.level || -12), 0.001, 0.09); const o = osc(ac, 'sine', 95, tt, tt + 0.15); o.frequency.exponentialRampToValueAtTime(60, tt + 0.08); chain(o, g, B.fx); click(ac, B.fx, tt, 1400, 2, (p.level || -12) - 8, 0.02); } };
  CU.latch = (ac, B, t, p) => { click(ac, B.fx, t, 3500, 4, p.level || -20, 0.012); click(ac, B.fx, t + 0.035, 2200, 4, (p.level || -20) - 4, 0.015); };
  // the second click: drier, panned to Scott's right, and nothing in the picture makes it
  CU.click2 = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -24), 0.0005, 0.012); chain(src(ac, 'white', 71, t, t + 0.05), filt(ac, 'bandpass', 3800, 6), g, pan(ac, 0.6), B.extra); };
  CU.flick = (ac, B, t, p) => click(ac, B.fx, t, 3200, 2, p.level || -26, 0.006);
  CU.slap = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -22), 0.001, 0.05); chain(src(ac, 'white', 81, t, t + 0.08), filt(ac, 'lowpass', 1500, 0.7), g, B.fx); };
  CU.riffle = (ac, B, t, p) => { for (let i = 0; i < 40; i++) click(ac, B.fx, t + i * 0.02, 2600 + (i % 7) * 200, 3, (p.level || -30) - (i % 3), 0.004); };
  CU.deal = (ac, B, t, p) => { const n = p.n || 6, gap = p.gap || 0.32; for (let i = 0; i < n; i++) { CU.flick(ac, B, t + i * gap, { level: -26 }); CU.slap(ac, B, t + i * gap + 0.11, { level: -24 }); } };
  // a counting ping that sours: p.i (index in count), p.sour (cents flat, accumulates across the film), p.wrong (true = a count past the truth)
  CU.ping = (ac, B, t, p) => { const base = 2800 * Math.pow(2, ((p.i || 0) * 34 - (p.sour || 0) - (p.wrong ? 100 : 0)) / 1200); [[1, 1], [1.464, 0.6], [2.107, 0.35], [2.607, 0.2]].forEach(([m, a]) => { const g = gain(ac, 0); perc(g, t, db(p.level || -30) * a, 0.001, 0.6); chain(osc(ac, 'sine', base * m, t, t + 0.8), g, pan(ac, p.wrong ? 0.7 : (p.pan || 0)), p.wrong ? B.extra : B.fx); }); };
  CU.tally = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -22), 0.002, 0.06); const s = chain(src(ac, 'white', 91, t, t + 0.1), filt(ac, 'bandpass', 3500, 2)); const am = osc(ac, 'square', 30, t, t + 0.1), ag = gain(ac, 0.5 * db(p.level || -22)); chain(am, ag); ag.connect(g.gain); chain(s, g, pan(ac, p.pan || 0), p.faint ? B.extra : B.fx); };
  CU.thump = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -14), 0.002, 0.15); const o = osc(ac, 'sine', 110, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(70, t + 0.08); chain(o, g, pan(ac, p.pan == null ? 0.6 : p.pan), B.fx); };
  CU.gasp = (ac, B, t, p) => { const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -16), t + 0.06); g.gain.setValueAtTime(db(p.level || -16), t + 0.17); g.gain.linearRampToValueAtTime(0, t + 0.18); const s = src(ac, 'white', 101, t, t + 0.25); [[700, 8], [1200, 10]].forEach(([f, q]) => chain(s, filt(ac, 'bandpass', f, q), g)); g.connect(B.fx); g.connect(B.reverb); };
  CU.crash = (ac, B, t, p, R) => { const r = SOUND.one(ac, 'crash', t, { trim: (p.level || -8) + 8 }); if (r) { chain(r, pan(ac, p.pan || 0), B.fx); const g = SOUND.one(ac, 'crash_glass', t + 0.02, { trim: (p.level || -8) + 8 }); if (g) chain(g, pan(ac, -(p.pan || 0) * 0.5), B.fx); return; } for (let i = 0; i < 18; i++) { const tt = t + R() * 0.5 * (i / 18); const g = gain(ac, 0); perc(g, tt, db((p.level || -8) - i * 0.8), 0.001, 0.3 + R() * 0.9); const f = [210, 340, 520, 760, 1130, 1490][i % 6] * (0.9 + R() * 0.2); chain(osc(ac, 'triangle', f, tt, tt + 1.4), g, pan(ac, R() - 0.5), B.fx); } click(ac, B.fx, t, 1500, 0.6, (p.level || -8), 0.15); const g = gain(ac, 0); perc(g, t, db(p.level || -8), 0.003, 0.5); chain(osc(ac, 'sine', 60, t, t + 0.6), g, B.fx); };
  CU.whine = (ac, B, t, p) => { const g = gain(ac, 0); bedEnv(g, t, t + (p.dur || 1.2), db(p.level || -42), 0.1, 0.05); const o = osc(ac, 'sine', 2000, t, t + (p.dur || 1.2)); o.frequency.exponentialRampToValueAtTime(9000, t + (p.dur || 1.2)); chain(o, g, B.fx); };
  CU.shutter = (ac, B, t, p) => { click(ac, B.fx, t, 1800, 8, p.level || -18, 0.005); click(ac, B.fx, t + 0.07, 2400, 8, (p.level || -18) - 2, 0.005); };
  CU.stove = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -14), 0.02, 0.45); const f = filt(ac, 'bandpass', 220, 4); f.frequency.exponentialRampToValueAtTime(110, t + 0.45); chain(src(ac, 'brown', 111, t, t + 0.6), f, g, B.fx); const g2 = gain(ac, 0); perc(g2, t + 0.3, db((p.level || -14) + 2), 0.005, 0.3); chain(osc(ac, 'sine', 55, t + 0.3, t + 0.7), g2, B.fx); };
  CU.ovendoor = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -16), 0.01, 0.5); const o = osc(ac, 'sawtooth', 80, t, t + 0.6); o.frequency.exponentialRampToValueAtTime(40, t + 0.5); chain(o, filt(ac, 'lowpass', 400, 3), g, B.fx); click(ac, B.fx, t + 0.42, 900, 2, (p.level || -16) + 2, 0.06); };
  CU.buzz = (ac, B, t, p) => { const g = gain(ac, 0); bedEnv(g, t, t + (p.dur || 2), db(p.level || -34), 0.02, 0.2); chain(osc(ac, 'sawtooth', 100, t, t + (p.dur || 2)), filt(ac, 'bandpass', 600, 4), g, B.fx); };
  // a scream carried by detuned saws (no voice synthesis): breath, then the cry
  CU.scream = (ac, B, t, p) => { const r = SOUND.one(ac, 'scream', t + 0.35, { trim: (p.level || -16) + 16 }); if (r) { chain(r, B.fx); r.connect(B.reverb); return; } const d = p.dur || 2.4; const b = gain(ac, 0); perc(b, t, db(-24), 0.05, 0.35); chain(src(ac, 'white', 121, t, t + 0.5), filt(ac, 'bandpass', 900, 4), b, B.fx); const g = gain(ac, 0); g.gain.setValueAtTime(0, t + 0.4); g.gain.linearRampToValueAtTime(db(p.level || -16), t + 0.9); g.gain.setValueAtTime(db(p.level || -16), t + d - 0.4); g.gain.linearRampToValueAtTime(0, t + d); const lp = filt(ac, 'lowpass', 300, 2); lp.frequency.setValueAtTime(300, t + 0.4); lp.frequency.exponentialRampToValueAtTime(4500, t + 1.2); for (let i = 0; i < 9; i++) { const o = osc(ac, 'sawtooth', 220 * Math.pow(2, (i - 4) * 12.5 / 1200), t + 0.4, t + d); const v = osc(ac, 'sine', 5.5 + i * 0.2, t + 0.4, t + d), vg = gain(ac, 6); chain(v, vg); vg.connect(o.frequency); chain(o, lp); } chain(lp, g, B.fx); g.connect(B.reverb); };
  // the paper tears: fibres giving way. p.level dB (-14)
  CU.tear = (ac, B, t, p, R) => { const g = gain(ac, 0); g.gain.setValueAtTime(0, t); for (let k = 0; k < 60; k++) { const tt = t + k * 0.005; g.gain.setValueAtTime(R() < 0.55 ? db(p.level || -14) : 0, tt); } g.gain.setValueAtTime(0, t + 0.31); const f = filt(ac, 'bandpass', 4500, 3); f.frequency.exponentialRampToValueAtTime(1400, t + 0.3); chain(src(ac, 'white', 131, t, t + 0.35), f, g, B.extra); };
  CU.drip = (ac, B, t, p) => tick(ac, B.fx, t, 1300, 0.12, p.level || -28);
  CU.scrape = (ac, B, t, p) => { for (let i = 0; i < (p.n || 7); i++) click(ac, B.fx, t + i / 45, 5000, 3, p.level || -22, 0.002); };
  CU.spark = (ac, B, t, p) => { click(ac, B.fx, t, 7000, 1, p.level || -18, 0.003); const g = gain(ac, 0); perc(g, t, db((p.level || -18) - 6), 0.001, 0.08); chain(src(ac, 'white', 141, t, t + 0.12), filt(ac, 'highpass', 8000, 0.7), g, B.fx); };
  CU.boom = (ac, B, t, p) => { const lv = db(p.level || -2); const g = gain(ac, 0); perc(g, t, lv, 0.004, 1.4); const o = osc(ac, 'sine', 34, t, t + 1.6); o.frequency.exponentialRampToValueAtTime(18, t + 1.2); chain(o, g, B.fx); const n = gain(ac, 0); perc(n, t, lv * 0.9, 0.003, 3); chain(src(ac, 'brown', 151, t, t + 3.5), filt(ac, 'lowpass', 180, 0.7), n, B.fx); const c = gain(ac, 0); perc(c, t, lv * 0.5, 0.001, 0.4); chain(src(ac, 'white', 152, t, t + 0.5), filt(ac, 'bandpass', 1200, 0.5), c, B.fx); CU.glass(ac, B, t + 0.05, { level: -14 }, global.OTM.rng('boomglass')); };
  CU.dtmf = (ac, B, t, p) => { const map = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] }; String(p.digits || '999').split('').forEach((d, i) => { const tt = t + i * (p.gap || 0.22); if (d === 'x') { tick(ac, B.fx, tt, 600, 0.05, -30, 'square'); return; } (map[d] || [941, 1336]).forEach(f => { const g = gain(ac, 0); bedEnv(g, tt, tt + 0.12, db(p.level || -26), 0.005, 0.01); chain(osc(ac, 'sine', f, tt, tt + 0.13), g, B.fx); }); }); };
  CU.ringback = (ac, B, t, p) => { for (let k = 0; k < (p.n || 2); k++) { const t0 = t + k * 3; [0, 0.6].forEach(dt => { const g = gain(ac, 0); bedEnv(g, t0 + dt, t0 + dt + 0.4, db(p.level || -30), 0.01, 0.02); [400, 450].forEach(f => chain(osc(ac, 'sine', f, t0 + dt, t0 + dt + 0.42), g)); chain(g, filt(ac, 'bandpass', 900, 0.6), B.fx); }); } };
  CU.hit = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -12), 0.003, p.decay || 1.8); const o = osc(ac, 'sine', p.f || 48, t, t + (p.decay || 1.8) + 0.2); o.frequency.exponentialRampToValueAtTime((p.f || 48) * 0.6, t + 1); chain(o, g, B.fx); const c = gain(ac, 0); perc(c, t, db((p.level || -12) - 6), 0.001, 0.25); chain(src(ac, 'brown', 161, t, t + 0.4), filt(ac, 'lowpass', 300, 0.7), c, B.fx); };
  CU.swell = (ac, B, t, p) => { const d = p.dur || 1.5; const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -22), t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.03); chain(src(ac, 'pink', 171, t, t + d + 0.1), filt(ac, 'bandpass', 900, 0.7), g, B.fx); chain(osc(ac, 'sine', p.f || 110, t, t + d + 0.05), gain(ac, 0.5), g); };
  CU.lub = (ac, B, t, p) => { [[52, 0], [44, 0.21]].forEach(([f, dt], i) => { const g = gain(ac, 0); perc(g, t + dt, db((p.level || -18) - i * 4), 0.008, 0.12); chain(osc(ac, 'sine', f, t + dt, t + dt + 0.25), filt(ac, 'lowpass', 150), g, pan(ac, p.pan || 0), p.extra ? B.extra : B.room); }); };
  CU.whoosh = (ac, B, t, p) => { const d = p.dur || 0.6; const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -24), t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d); const f = filt(ac, 'bandpass', 400, 1.2); f.frequency.exponentialRampToValueAtTime(3000, t + d); chain(src(ac, 'white', 181, t, t + d + 0.05), f, g, B.fx); };
})(window);
