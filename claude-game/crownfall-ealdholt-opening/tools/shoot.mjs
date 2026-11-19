// Shoots the film inside the game's own village renderer, so the film looks like the village the player enters
// straight after it. The game (Crownfall, main game, dev server) is opened with ?ealdholtFilm=1, which gives this
// script a DEV-only hook in village-view.ts: for every frame it places the camera, sets the sky's hour, the animation
// seconds and the villagers' time, waits for the world to settle and captures the canvas.
//
//   node tools/shoot.mjs --out out/shoot                       all 900 frames (resumes: existing frames are kept)
//   node tools/shoot.mjs --out out/look --times 2,6.5,9,12     only those moments
//   node tools/shoot.mjs --out out/scout --scout scout.json    free poses: [{ name, p, t, fov, minute, focus? }]
//   options: --from 0 --to 899  --size 1280x720 (default 1920x1080)  --ss 1.5 (supersampling, device scale)
//            --battery 25 (on battery power, stop when the charge falls to this; exit code 3. The shoot resumes later)
//            --blur run:4,canopy:4,swoop:2,flyby:2 (subframes per frame, for motion blur, by shot; tools/finish.mjs
//            averages them. Each is a moment inside the first half of the frame: a half-open shutter)
//
// Needs the game's dev server (default http://localhost:5173/, or CROWNFALL_URL) and its private village service.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_FROM || 'C:/Users/MILES/Documents/Crownfall/main game/package.json');
const { chromium } = require('playwright');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const GAME = process.env.CROWNFALL_URL || 'http://localhost:5173/';
const out = path.resolve(ROOT, arg('out', 'out/shoot'));
const SS = +arg('ss', 1), FPS = 30;
const [WIDTH, HEIGHT] = arg('size', '1920x1080').split('x').map(Number), BATTERY = +arg('battery', 0);
const BLUR = Object.fromEntries(arg('blur', '').split(',').filter(Boolean).map((e) => { const [shot, n] = e.split(':'); return [shot, Math.max(1, +n || 1)]; }));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
fs.mkdirSync(out, { recursive: true });

// ---- what to shoot
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
function lookQuaternion(p, t, roll = 0) {
  M.lookAt(new THREE.Vector3(...p), new THREE.Vector3(...t), UP); Q.setFromRotationMatrix(M);
  if (roll) Q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  return Q.toArray();
}
const DAY = 1440;                                   // the film's morning is the village's second day
let jobs = [];                                      // { file, frames: [{ p, q, fov, focus, near, minute, seconds, cut }] }
let timeline = null;
if (arg('scout', null)) {
  const list = JSON.parse(fs.readFileSync(path.resolve(ROOT, arg('scout')), 'utf8'));
  jobs = list.map((s, i) => ({ file: `${s.name}.png`, frames: [{ p: s.p, q: lookQuaternion(s.p, s.t, s.roll || 0), fov: s.fov || 50, focus: s.focus || s.t, near: s.near || 0.15,
    minute: s.minute, seconds: 100 + i * 7, cloud: s.cloud, cut: true }] }));
} else {
  const ground = JSON.parse(fs.readFileSync(path.join(ROOT, 'out', 'ground.json'), 'utf8'));
  timeline = await import('../film/src/world/timeline.js');
  const film = timeline.makeFilm(ground);
  const frameAt = (t, cut) => {
    const c = film.at(t);
    return { p: c.pos, q: lookQuaternion(c.pos, c.target, c.roll), fov: c.fov, focus: c.focus, near: c.near, minute: c.minute, seconds: 100 + t, cloud: c.cloud, cut };
  };
  const times = arg('times', null);
  if (times) jobs = times.split(',').map(Number).map((t) => ({ file: `t${t.toFixed(2).padStart(5, '0')}.png`, frames: [frameAt(t, true)] }));
  else {
    const from = +arg('from', 0), to = +arg('to', 899), step = +arg('step', 1);   // --step 5: every fifth frame, for a quick look
    let lastShot = null;
    for (let i = from; i <= to; i += step) {
      const t = i / FPS, shot = timeline.shotAt(t), cut = shot.id !== lastShot; lastShot = shot.id;
      // subframes: the shutter is open for half the frame, and never looks across a cut
      const frames = [], n = step > 1 ? 1 : BLUR[shot.id] || 1;
      for (let k = 0; k < n; k++) {
        const ts = Math.min(shot.t1 - 1e-4, t + (k / n) * 0.5 / FPS);
        frames.push({ ...frameAt(ts, cut && k === 0), jump: step > 1 });
      }
      jobs.push({ file: `f${String(i).padStart(5, '0')}`, frames, index: i });
    }
  }
}
const fileOf = (j, k) => (j.frames.length > 1 ? `${j.file}_${k}.png` : j.file.endsWith('.png') ? j.file : `${j.file}.png`);
const pending = jobs.filter((j) => !fs.existsSync(path.join(out, fileOf(j, j.frames.length - 1))));
log(`${pending.length} of ${jobs.length} to shoot -> ${path.relative(ROOT, out)}  (supersampling ${SS}, motion blur ${JSON.stringify(BLUR)})`);
if (!pending.length) process.exit(0);
// a resumed shoot lands the camera somewhere new, like a cut
pending[0].frames[0].cut = true;

// ---- the game
const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--mute-audio'] });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SS });
await context.addInitScript((entries) => { try { for (const [k, v] of entries) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); } catch { /* storage refused */ } }, Object.entries({
  'crownfall.opening.seen': 'crownfall-opening',
  'crownfall.legacy.ealdholt-opening.seen.v1': 'crownfall-ealdholt-opening',
  'crownfall.main-game.preferences': JSON.stringify({ quality: 'high', automaticGraphics: false, fullscreen: false, renderScale: 100, frameLimit: 0, motion: true }),
}));
const page = await context.newPage();
page.on('pageerror', (e) => log('pageerror', e.message));
const film = (fn, a) => page.evaluate(fn, a);
try {
  await page.goto(`${GAME}?ealdholtFilm=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('.menu-shell').waitFor({ state: 'attached', timeout: 180000 });
  await page.locator('.loading-screen').waitFor({ state: 'detached', timeout: 180000 });
  for (let i = 0; ; i++) {
    const [phase, boot] = await page.evaluate(() => { const s = document.querySelector('.menu-shell'); return [s?.getAttribute('data-opening-film'), s?.getAttribute('data-boot-state')]; });
    if ((!phase || phase === 'closed') && boot === 'ready') break;
    if (i > 40) throw new Error('the menu did not become ready');
    if (phase && phase !== 'closed') await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'My Legacy', exact: true }).click();
  log('loading the village');
  await page.waitForFunction(() => ['ready', 'error'].includes(document.querySelector('.ealdholt-preview')?.getAttribute('data-ealdholt-world')), undefined, { timeout: 12 * 60000, polling: 500 });
  if (await page.evaluate(() => document.querySelector('.ealdholt-preview').getAttribute('data-ealdholt-world')) !== 'ready') throw new Error('the village failed to load');
  log('village ready');
  // only the world is in the picture: no heading, panels or speech
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } .ealdholt-world, .ealdholt-world canvas { visibility: visible !important; } * { cursor: none !important; }' });
  // the page this shoot took: if the game's page is ever reloaded (the dev server reloads it after the computer
  // sleeps, or when a source file changes), the token is gone and the shoot stops instead of filming the wrong thing
  const token = `shoot-${Date.now()}`;
  await film((token) => { window.__ealdholtFilm.take(); window.__ealdholtFilmToken = token; }, token);
  const alive = () => film((token) => !!window.__ealdholtFilm && window.__ealdholtFilmToken === token && window.__ealdholtFilm.state().presented, token).catch(() => false);
  // on battery power the shoot stops while there is charge left; it resumes where it stopped
  const lowBattery = () => {
    if (!BATTERY || process.platform !== 'win32') return null;
    // no quotation marks in the command: Windows strips them from an argument on the way to PowerShell
    const r = spawnSync('powershell', ['-NoProfile', '-Command', '$b = Get-CimInstance Win32_Battery; if ($b) { $b.BatteryStatus; $b.EstimatedChargeRemaining }'], { encoding: 'utf8' });
    const [status, charge] = (r.stdout || '').trim().split(/s+/).map(Number);
    return status === 1 && charge <= BATTERY ? charge : null;
  };
  const base = await film(() => window.__ealdholtFilm.state());
  // the villagers live the film's morning at their own pace, from 06:40 on the second day
  const residentStart = (DAY + 400 - base.initialDayMinute) * base.millisecondsPerWorldMinute;

  async function settle(minRenders, minMs, maxMs) {
    const t0 = Date.now(), r0 = (await film(() => window.__ealdholtFilm.state())).renders;
    for (;;) {
      await page.waitForTimeout(60);
      const s = await film(() => window.__ealdholtFilm.state()), ms = Date.now() - t0;
      if ((s.renders >= r0 + minRenders && ms >= minMs && !s.observationPending) || ms > maxMs) return s;
    }
  }
  async function place(f) {
    await film((f) => {
      const hook = window.__ealdholtFilm;
      hook.clock({ residentMilliseconds: f.resident, skyMinute: f.minute, seconds: f.seconds, sky: { weather: 'clear', cloudCoverage: f.cloud ?? 0.34, windStrength: 0.22 } });
      hook.pose(f.p, f.q, f.fov, f.focus, f.near);
    }, { ...f, minute: DAY + f.minute, resident: residentStart + (f.seconds - 100) * 1000 });
  }
  const scout = !!arg('scout', null) || !!arg('times', null);
  let done = 0; const started = Date.now();
  for (const job of pending) {
    for (let k = 0; k < job.frames.length; k++) {
      const f = job.frames[k];
      await place(f);
      // a cut lands the camera somewhere new: the world streams in its detail and shadows there before the first frame
      const s = f.cut ? await settle(8, scout ? 9000 : 7000, 40000) : f.jump ? await settle(3, 1500, 20000) : await settle(2, 0, 8000);
      const file = fileOf(job, k);
      await page.screenshot({ path: path.join(out, file) });
      if (!(await alive()) || fs.statSync(path.join(out, file)).size < 60000) { fs.rmSync(path.join(out, file), { force: true }); throw new Error(`the game's page was reloaded while ${file} was being shot`); }
      if (scout) log(file, JSON.stringify({ env: s.environment, population: s.population, populationStatus: s.populationStatus }));
    }
    done++;
    if (done % 20 === 0) { const charge = lowBattery(); if (charge !== null) { log(`on battery at ${charge}%: stopping after ${done} frame(s); run the same command again to carry on`); process.exitCode = 3; break; } }
    if (!scout && done % 15 === 0) { const per = (Date.now() - started) / done / 1000; log(`${done}/${pending.length}  ${per.toFixed(1)} s a frame, about ${Math.round(per * (pending.length - done) / 60)} min left`); }
  }
  log(`shot ${done} frame(s) in ${((Date.now() - started) / 60000).toFixed(1)} min`);
} catch (error) {
  log('FAILED', error?.stack || error);
  try { await page.screenshot({ path: path.join(out, 'shoot-error.png') }); } catch { /* the page is gone */ }
  process.exitCode = 1;
} finally { await browser.close(); }
