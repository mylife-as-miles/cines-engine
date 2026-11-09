// Shared headless page for the prologue tools (Playwright + Chromium). open({ subs, scene }) -> { browser, page, errs }
const { chromium } = require('playwright');
const path = require('path');
async function open(o = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  const q = new URLSearchParams(); if (o.subs) q.set('subs', '1'); if (o.scene != null && o.scene >= 0) q.set('scene', String(o.scene));
  await page.goto('file://' + path.resolve(__dirname, '../film/headless.html') + (q.toString() ? '?' + q : ''));
  await page.waitForFunction(() => window.FILM_READY === true || window.FILM_ERROR, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.FILM_ERROR); if (err) throw new Error(err);
  return { browser, page, errs };
}
// flags shared by the tools: --subs, --scene N
function flags(argv) { const i = argv.indexOf('--scene'); return { subs: argv.includes('--subs'), scene: i >= 0 ? +argv[i + 1] : -1 }; }
module.exports = { open, flags };
