// The map of Aethelgard, whole and in a close shot:  node tools/map_demo.js [out.png] [cx cy zoom]
const { open } = require('./film'); const fs = require('fs');
(async () => {
  const out = process.argv[2] || 'out/map_demo.png', cx = +(process.argv[3] || 1000), cy = +(process.argv[4] || 825), z = +(process.argv[5] || 0.6545);
  const { browser, page, errs } = await open();
  const r = await page.evaluate(([cx, cy, z]) => {
    const K = KIT, c = document.querySelector('canvas'), x = c.getContext('2d'); const t0 = performance.now();
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, K.W, K.H);
    x.save(); K.cam(x, cx, cy, z); const reg = z > 1.6 ? [Math.round(cx - 960 / z - 20), Math.round(cy - 540 / z - 20), Math.round(1920 / z + 40), Math.round(1080 / z + 40), Math.min(6, Math.ceil(z * 1.1))] : null; K.map.draw(x, { region: reg }); x.restore();
    const t1 = performance.now(); x.save(); K.cam(x, cx, cy, z); K.map.draw(x, { region: reg }); x.restore(); const t2 = performance.now();
    K.vignette(x, 0.35);
    return { build: t1 - t0, frame: t2 - t1, url: c.toDataURL('image/png') };
  }, [cx, cy, z]);
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64')); await browser.close();
  if (errs.length) console.log([...new Set(errs)].join('\n')); console.log(`wrote ${out} (first ${r.build.toFixed(0)} ms, then ${r.frame.toFixed(0)} ms)`);
})();
