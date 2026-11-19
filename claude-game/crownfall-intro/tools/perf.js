// Frame times after the caches are warm:  node tools/perf.js <t1> <t2> ... [--scene N]
const { open, flags } = require('./film');
(async () => {
  const args = process.argv.slice(2), ts = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--scene').map(Number);
  const { browser, page, errs } = await open(flags(args));
  const r = await page.evaluate(ts => ts.map(t => { FILM.renderAt(t); const t0 = performance.now(); FILM.renderAt(t + 1 / 24); return [t, performance.now() - t0]; }), ts);
  await browser.close();
  console.log(r.map(([t, ms]) => `${t}s ${ms.toFixed(0)}ms`).join('  ')); if (errs.length) console.log([...new Set(errs)].join('\n'));
})();
