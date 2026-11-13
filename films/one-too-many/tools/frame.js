// One full-resolution frame: node tools/frame.js Q01 12.5 out/q01_12.png   (sequence-local time; use ALL for global time)
const { open } = require('./film');
(async () => {
  const [id, t, out] = process.argv.slice(2);
  const { browser, page, errs } = await open(id === 'ALL' ? null : id);
  const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/png'); }, +t);
  require('fs').writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  const uniq = [...new Set(errs)]; if (uniq.length) console.log(uniq.slice(0, 20).join('\n')); else console.log('ok ' + out);
  await browser.close();
})();
