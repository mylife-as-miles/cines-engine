# The machine: rendering, encoding and limits in this container

Read before the first render of a session. The cloud container is a 4-core machine with about 15 GB of RAM, no swap, **no GPU**, and a fixed disk allowance; it is reclaimed when idle, so anything worth keeping is committed (source) or sent to the author (deliverables).

## Headless browser

- Chromium and Playwright are preinstalled: `require('playwright')` works from any folder, `chromium.launch()` needs no options. Do not run `playwright install`. Other tools that need Chrome use `/opt/pw-browsers/chromium` with `--headless --no-sandbox`.
- Canvas 2D films render on the CPU comfortably (Autopilot: about 3.4 frames a second per worker at 1080p; three workers).
- **WebGL without a GPU** goes through SwiftShader: launch with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. It works but is slow (a large three.js world: minutes to load, about 1.5 fps). WebGPU-only effects will not run.
- Capture: for canvas films, `canvas.toDataURL('image/jpeg', 0.93)` piped to ffmpeg as `image2pipe` (fast, what the films use); for whole pages, `page.screenshot()`; when a slow page makes `page.screenshot()` time out, use CDP directly: `const cdp = await page.context().newCDPSession(page); const {data} = await cdp.send('Page.captureScreenshot', {format: 'png'})`.
- Determinism: draw from `t` only; for pages that animate on their own, an init script can replace `requestAnimationFrame`, `performance.now` and `Date.now` with a virtual clock that advances one frame per capture.
- Screenshots a person will see: `deviceScaleFactor: 2`; ones only you look at: 1.

## Encoding

- Delivery: H.264 High, `-pix_fmt yuv420p`, CRF 14–18 (`-preset slow` for masters), BT.709 tagged (`-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`), AAC 256 k 48 kHz, `-movflags +faststart`.
- Alpha layers for compositing: QuickTime RLE (`-c:v qtrle`, what `scripts/canvas_render.js` writes for `.mov`) or ProRes 4444 (`-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le`, smaller for long layers).
- Frame-exact work: force every input onto one clock with `setpts=N/(24*TB)`; `tpad=stop_mode=clone` then `trim=end_frame=N`; confirm counts with `ffprobe -v error -count_packets -select_streams v -show_entries stream=nb_read_packets -of csv=p=0 file.mp4`. Overlays add a frame at the end unless you trim (`-frames:v N`).
- Game cuts: 1280×720, CRF 26–28 with a bitrate cap, AAC 160 k. Upload masters: high bitrate. Sending to the author: under **400 MiB** per file (`SendUserFile`), so make a lower-bitrate copy when needed and keep the master.

## Memory, CPU, time

- One heavy job at a time: a long render, a full-length mix, an earshot batch, a Stable Audio batch or a Blender render. Two together have run the machine out of memory (Autopilot's render and mix). Use `--threads 2` for audio.cpp and earshot when anything else runs.
- Long jobs run in the background (`run_in_background`), with progress written to a log; you are notified when they finish — do not poll with `sleep`. Keep any foreground command under about ten minutes.
- Measure before promising: render one frame or one still at final settings, multiply, and tell the author the real time.

## Disk

- Check `df -h /` before big installs or renders (Blender's module is about 1.1 GB, torch and audio weights several GB, a 1080p frame sequence several GB). If space runs out, delete intermediates you no longer need — frame folders after encoding, superseded renders, stems after the mix — but only files you made, and never a deliverable before it has been sent.
- Renders live in each production's ignored `out/`, or in the session scratchpad for one-off jobs.

## Keys and network

- Keys come from the environment or from network secrets that the proxy injects (ElevenLabs on `api.elevenlabs.io`; Gemini on `generativelanguage.googleapis.com`); scripts read env vars by name and never print them. If a key is missing, ask for it with the credential tool, never in chat.
- Some sites refuse this machine (Freesound and its CDN did); generate locally (Stable Audio) or use committed CC0 sounds.
- Private repositories and assets: fetch only what the task needs, keep them out of git and out of anything sent to outside services.
