// A labelled board of chosen moments, rendered in one browser session:
//   node tools/board.js PICKS.json out.jpg [cols=4] [tileWidth=480]
// PICKS.json: [["Q05", 45.6, "Better? Mm-hmm."], ...]  (sequence id, sequence-local seconds, caption)
const { open } = require('./film');
const fs = require('fs');
(async () => {
  const [picksFile, out, cols = '4', tw = '480'] = process.argv.slice(2);
  const picks = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
  const { browser, page, errs } = await open(null);
  const url = await page.evaluate(({ picks, cols, tw }) => {
    const th = Math.round(tw * 9 / 16), lab = 30, C = cols, R = Math.ceil(picks.length / C);
    const sheet = document.createElement('canvas'); sheet.width = C * tw; sheet.height = R * (th + lab);
    const g = sheet.getContext('2d'); g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, sheet.width, sheet.height);
    const src = document.querySelector('canvas');
    picks.forEach(([id, t, cap], i) => {
      const s = FILM.lib[id]; if (!s || s.start == null) return;
      FILM.renderAt(s.start + t);
      const x = (i % C) * tw, y = Math.floor(i / C) * (th + lab);
      g.drawImage(src, x, y, tw, th);
      g.fillStyle = '#d8d4cc'; g.font = '15px "Libre Franklin", sans-serif';
      g.fillText(`${id} ${s.title} · ${cap}`, x + 8, y + th + 20, tw - 16);
    });
    return sheet.toDataURL('image/jpeg', 0.86);
  }, { picks, cols: +cols, tw: +tw });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  const u = [...new Set(errs)].filter(e => !/not built yet|ERR_FILE/.test(e)); if (u.length) console.log(u.slice(0, 10).join('\n'));
  console.log('wrote ' + out);
  await browser.close();
})();
