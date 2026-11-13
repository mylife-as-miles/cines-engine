/* Loads the film in order: kit, script, voices, engine, sound, rig, sets, then every sequence that exists.
   Usage: FILM_LOAD(base, only).then(...). With `only` (e.g. ['Q05']) every sequence still loads, so FILM.drawShot can reach
   the morning's shots for the flash cuts, but only the listed ones are put on the timeline. */
window.FILM_SEQUENCES = [
  'Q01_dawn', 'Q02_the_counter', 'Q03_the_routine', 'Q04_breakfast', 'Q05_the_mirror', 'Q06_the_journey',
  'Q07_eight_thirty_two', 'Q08_midday', 'Q09_the_hottest_hours', 'Q10_five_thirty_seven', 'Q11_wheres_emily', 'Q12_the_door',
];
window.FILM_SETS = ['bedroom', 'kitchen', 'bathroom', 'house', 'car', 'roads', 'city', 'carpark', 'office', 'nursery'];
window.FILM_LOAD = async function (base, only) {
  base = base || '';
  const add = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  for (const f of ['kit/otm.js', 'kit/look_c.js', 'film/script.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  // the recorded takes (optional: without them the subtitles still time from audio/voice_map durations baked into voice.js)
  await add(base + 'audio/voice.js');
  for (const f of ['film/engine.js', 'film/sound.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  window.SETS = window.SETS || {};
  for (const f of ['film/rig.js'].concat(window.FILM_SETS.map(n => 'film/sets/' + n + '.js'))) { const ok = await add(base + f); if (!ok) console.warn('[film] not built yet: ' + f); }
  await OTM.loadFonts(base + 'fonts/fonts.css');
  if (only) window.FILM_ONLY = only.map(s => s.slice(0, 3));
  for (const n of window.FILM_SEQUENCES) { const ok = await add(base + 'film/seq/' + n + '.js'); if (!ok && (!only || window.FILM_ONLY.includes(n.slice(0, 3)))) console.warn('[film] sequence not built yet: ' + n); }
  return window.FILM;
};
