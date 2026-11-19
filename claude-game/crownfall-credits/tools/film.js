// Shared headless page for the credits tools (Playwright + Chromium).
const { chromium } = require('playwright');
const path = require('path');
async function open() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../film/headless.html'));
  await page.waitForFunction(() => window.FILM_READY === true, null, { timeout: 60000 });
  return { browser, page, errs };
}
module.exports = { open };
