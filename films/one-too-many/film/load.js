/* Loads the film in order: kit, script, engine, sound, then every sequence that exists. Usage: FILM_LOAD(base).then(...) */
window.FILM_SEQUENCES = [
  'Q01_cold_open', 'Q02_crisps_title', 'Q03_arrivals', 'Q04_party', 'Q05_seven_hands', 'Q06_five',
  'Q07_the_crash', 'Q08_the_circle', 'Q09_the_photo', 'Q10_kitchen', 'Q11_the_lighter', 'Q12_two',
];
window.FILM_SETS = ['yard', 'hall', 'living', 'table', 'kitchen', 'title'];
window.FILM_LOAD = async function (base, only) {
  base = base || '';
  const add = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  for (const f of ['kit/otm.js', 'kit/figures.js', 'kit/dialogue.js', 'film/script.js', 'film/engine.js', 'film/sound.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  // the one-shot map (film/sfx_map.js) and the recorded beds (audio/samples.js; optional: without it the beds are synthesised)
  await add(base + 'film/sfx_map.js'); if (!window.FILM_NO_SAMPLES) await add(base + 'audio/samples.js');
  window.SETS = window.SETS || {};
  for (const f of ['film/rig.js'].concat(window.FILM_SETS.map(n => 'film/sets/' + n + '.js'))) { const ok = await add(base + f); if (!ok) console.warn('[film] not built yet: ' + f); }
  await OTM.loadFonts(base + 'fonts/fonts.css');
  const list = only ? window.FILM_SEQUENCES.filter(n => only.includes(n.slice(0, 3))) : window.FILM_SEQUENCES;
  for (const n of list) { const ok = await add(base + 'film/seq/' + n + '.js'); if (!ok) console.warn('[film] sequence not built yet: ' + n); }
  return window.FILM;
};
