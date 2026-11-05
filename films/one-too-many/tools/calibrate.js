// Measure each recorded bed against the synthesised bed it replaces (same params, 10 s, RMS), and print the dB trims
// that make them sit at the same level: node tools/calibrate.js > audio/trims.json
const { open } = require('./film');
(async () => {
  const { browser, page } = await open('Q01');
  const res = await page.evaluate(async () => {
    await SOUND.ready();
    const peak = b => { let m = 0; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); } return 20 * Math.log10(m + 1e-12); };
    const rms = b => { let s = 0, n = 0; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { s += d[i] * d[i]; n++; } } return 10 * Math.log10(s / n + 1e-20); };
    const render = async (fn) => { const ac = new OfflineAudioContext(2, 48000 * 10, 48000); const B = { room: ac.destination, music: ac.destination, fx: ac.destination, extra: ac.destination, dialogue: ac.destination, reverb: ac.createGain() }; fn(ac, B); return rms(await ac.startRendering()); };
    const keep = Object.assign({}, SOUND.buffers), out = {};
    const tests = { fire: ['fire', (ac, B) => SOUND.beds.fire(ac, B, 0, 10, { level: -14, fi: 0.01, fo: 0.01 }, OTM.rng('c'))],
      walla: ['walla', (ac, B) => SOUND.beds.walla(ac, B, 0, 10, { level: -30 }, OTM.rng('c'))],
      gas: ['gas', (ac, B) => SOUND.beds.gas(ac, B, 0, 10, { from: -30, to: -30 })],
      siren: ['siren', (ac, B) => SOUND.beds.siren(ac, B, 0, 10, { level: -34 })],
      beat: ['beat', (ac, B) => SOUND.beds.heart(ac, B, 0, 10, { bpm: 70, level: -20 })] };
    for (const [k, [buf, fn]] of Object.entries(tests)) {
      for (const b in SOUND.buffers) delete SOUND.buffers[b]; const syn = await render(fn);
      Object.assign(SOUND.buffers, keep); const rec = await render(fn);
      out[k] = +(syn - rec).toFixed(2);
    }
    // one-shots match the synthesised version's peak, not its RMS
    const renderPk = async (fn) => { const ac = new OfflineAudioContext(2, 48000 * 5, 48000); const B = { room: ac.destination, music: ac.destination, fx: ac.destination, extra: ac.destination, dialogue: ac.destination, reverb: ac.createGain() }; fn(ac, B); return peak(await ac.startRendering()); };
    for (const [k, fn] of Object.entries({ scream: (ac, B) => SOUND.cues.scream(ac, B, 0.1, { level: -16, dur: 3 }), crash: (ac, B) => SOUND.cues.crash(ac, B, 0.1, { level: -8 }, OTM.rng('c')) })) {
      for (const b in SOUND.buffers) delete SOUND.buffers[b]; const syn = await renderPk(fn);
      Object.assign(SOUND.buffers, keep); const rec = await renderPk(fn); out[k] = +(syn - rec).toFixed(2);
    }
    out.crash_glass = out.crash; out.fire_roar = out.fire; out.beat2 = out.beat; return out;
  });
  await browser.close(); console.log(JSON.stringify(res));
})();
