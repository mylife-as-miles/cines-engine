// One frame:  node tools/frame.js <seconds> [out.png]
const { open } = require('./film'); const fs = require('fs');
(async () => {
  const t = +process.argv[2] || 0, out = process.argv[3] || `out/frame_${t}.png`;
  const { browser, page, errs } = await open();
  const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await browser.close();
  if (errs.length) console.log(errs.join('\n')); console.log('wrote ' + out);
})();
