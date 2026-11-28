/* Loads the video in order: the art kits (kit/pov.js, kit/sets.js: optional, placeholders stand in until they exist), the
   narration data (film/words.js, film/vo_env.js), the engine, the art adapter, the graphics, the development sound, then every
   sequence, then builds the timeline. Usage: FILM_LOAD(base).then(FILM => ...). */
window.FILM_SEQUENCES = window.FILM_SEQUENCES || [
  'Q01_hook', 'Q02_monday', 'Q03_tuesday', 'Q04_wednesday', 'Q05_thursday', 'Q06_friday',
  'Q07_saturday', 'Q08_sunday', 'Q09_insight', 'Q10_advice', 'Q11_wrap', 'Q12_end',
];
window.FILM_LOAD = async function (base, opts) {
  base = base || ''; opts = opts || {};
  const add = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  // opts.placeholders: leave the art kits out (every set and character draws as its labelled placeholder)
  if (!opts.placeholders) for (const f of ['kit/pov.js', 'kit/sets.js']) if (!(await add(base + f))) console.info('[film] art not there yet (placeholders): ' + f);
  if (window.SETS && typeof SETS.ready === 'function') { try { await SETS.ready(); } catch (e) { console.warn('[film] SETS.ready', e); } }   // the embedded Nunito
  if (!(await add(base + 'film/words.js'))) console.error('failed to load film/words.js (run: node tools/film.js sync)');
  await add(base + 'film/vo_env.js');
  for (const f of ['film/engine.js', 'film/art.js', 'film/gfx.js', 'film/stage.js', 'film/sound.js']) if (!(await add(base + f))) console.error('failed to load ' + f);
  for (const n of window.FILM_SEQUENCES) if (!(await add(base + 'film/seq/' + n + '.js'))) console.warn('[film] sequence not built yet: ' + n);
  if (document.fonts && document.fonts.load) { try { await Promise.all(['400', '600', '700', '800', '900'].map(w => document.fonts.load(w + ' 40px Inter'))); } catch (e) { } }
  window.FILM.build();
  return window.FILM;
};
