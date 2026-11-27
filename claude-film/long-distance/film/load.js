/* Loads the film in order: kit, script, voices, engine, sound, rig, phone, sets, then every sequence that exists.
   Usage: FILM_LOAD(base, only).then(...). With `only` (e.g. ['Q05']) every sequence still loads, so FILM.drawShot can reach
   any shot it redraws, but only the listed ones are put on the timeline. */
window.FILM_SEQUENCES = window.FILM_SEQUENCES || [
  'Q01_the_pillow', 'Q02_good_morning', 'Q03_face_down', 'Q04_send_me_one', 'Q05_the_voice_message', 'Q06_the_waterfall',
  'Q07_goodnight_good_morning', 'Q08_the_knock', 'Q09_the_makeup_bag', 'Q10_you_didnt_forget', 'Q11_are_you_there',
];
window.FILM_SETS = window.FILM_SETS || ['bedroom', 'bathroom', 'office', 'stairwell', 'bus', 'living'];
window.FILM_LOAD = async function (base, only) {
  base = base || '';
  const add = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  for (const f of ['kit/otm.js', 'kit/look_b.js', 'film/script.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  // the recorded takes (optional: without them the subtitles still time from audio/voice_map durations baked into voice.js)
  await add(base + 'audio/voice.js');
  for (const f of ['film/engine.js', 'film/sound.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  window.SETS = window.SETS || {};
  for (const f of ['film/rig.js', 'film/phone.js'].concat(window.FILM_SETS.map(n => 'film/sets/' + n + '.js'))) { const ok = await add(base + f); if (!ok) console.warn('[film] not built yet: ' + f); }
  await OTM.loadFonts(base + 'fonts/fonts.css');
  if (only) window.FILM_ONLY = only.map(s => s.slice(0, 3));
  for (const n of window.FILM_SEQUENCES) { const ok = await add(base + 'film/seq/' + n + '.js'); if (!ok && (!only || window.FILM_ONLY.includes(n.slice(0, 3)))) console.warn('[film] sequence not built yet: ' + n); }
  return window.FILM;
};
