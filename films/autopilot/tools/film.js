// Shared headless page for film tools.
const { chromium } = require('playwright');
const path = require('path');
async function open(only, opts) {
  opts = opts || {};
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: opts.w || 1920, height: opts.h || 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/willReadFrequently/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  const url = 'file://' + path.resolve(__dirname, '../film/headless.html') + (only ? '?only=' + only : '');
  await page.goto(url);
  await page.waitForFunction(() => window.FILM_READY === true, null, { timeout: 60000 });
  return { browser, page, errs };
}
module.exports = { open };
