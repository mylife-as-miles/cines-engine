// Render a graphics page's draw(t) to a PNG still.
//   node tools/render_gfx.js design/gfx/route_map.html design/gfx/land_pacific.json 1.0 out/route_map.png
// The page must define window.draw(t); the JSON (if given) is injected as window.LAND before drawing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [html, data, t, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(html));
  if (data && data !== '-') await page.evaluate(d => { window.LAND = d; }, JSON.parse(fs.readFileSync(data, 'utf8')));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(x => window.draw(x), parseFloat(t));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.locator('canvas').screenshot({ path: out });
  await browser.close();
})();
