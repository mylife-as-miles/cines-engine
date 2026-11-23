// Usage: node shoot.js <file.html> <out.png> [width] [height] [waitMs]
// Renders a style frame. Pages may set window.FRAME_READY = true when done drawing.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, out, w = '1920', h = '1080', wait = '400'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(file));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  try { await page.waitForFunction(() => window.FRAME_READY === true, null, { timeout: 15000 }); } catch (e) { errs.push('FRAME_READY not set within 15s'); }
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  await browser.close();
  if (errs.length) { console.log(errs.join('\n')); process.exitCode = 2; } else console.log('ok ' + out);
})();
