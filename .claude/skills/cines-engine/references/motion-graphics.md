# Motion Graphics: product launches, ads, explainers

Graphics layers designed in code and composited over footage, previs or AI shots, then voiced, scored and mixed. The method comes from the FloWell ad (oil-field flow assurance, 84 s, 2026): the client's Blender previs and storyboard, a new ElevenLabs voice, previs-style supers, a route bar, data cards, an end card and a disclaimer, a Lyria score, delivered subtitled and clean.

Contents: 1 Inputs · 2 The plan · 3 Voice first · 4 Graphics pages · 5 Compositing · 6 Music and mix · 7 Claims and disclaimers · 8 Legibility · 9 Upscaling and the text repair · 10 Delivery · 11 Design rules

## 1. Inputs to gather

The footage or previs (with its frame rate and exact length), the storyboard, the brand (logo files, colours, typefaces), the approved script, every claim with its source, and the deliverables list (lengths, aspect ratios, subtitled or clean, platforms). Client footage stays out of git unless the client allows it; note its location in the README.

## 2. The plan: one source of truth

Every timing and every word lives in one JSON plan (`design/plan.json`), read by the graphics pages (`--plan`) and the mix script, so a change of copy or timing is made once:

```json
{ "fps": 24, "total": 84.375,
  "vo":     [{"take": "L01", "at": 3.1, "speech": [3.12, 6.83], "sub": [3.12, 6.83], "text": "…"}],
  "supers": [[12.6, 23.9, "Representative flowline", "Wax and sludge · deposit varies by asset"]],
  "route":  {"stops": ["Offshore", "Onshore field", "Manifold", "Tank farm", "Refinery"], "spans": [[0.5, 7.6, 0]]},
  "title":  {"t0": 24.6, "t1": 29.3, "name": "FloWell", "line": "Pour point depressant · wax suppressant"},
  "cards":  {"lab": [66.667, 72.667], "map": [72.667, 76.875], "end": [76.875, 84.375]} }
```

Approved copy (claims, numbers, disclaimers) is also kept verbatim in `design/COPY.md` with sources.

## 3. Voice first, then everything to the voice

1. Write the script to the picture's beats; read it aloud against the cut for length.
2. Voice it per line (ElevenLabs, `sound.md`; audition two or three voices with the client's brief, keep the one chosen in `DECISIONS.md`). Generate two or three takes of hard lines and rank them (earshot, or by ear).
3. Measure each take's speech span (RMS above 10 % of peak, 10 ms frames) and place it on the timeline; captions take their in and out from the speech, not from the line's slot.
4. Graphics enter and leave around the voice: a super lands with the noun it names, a number lands as it is said.

If the original has a voice to replace, separate it first (Demucs `htdemucs`, two stems) and keep the accompaniment as an effects bed.

## 4. Graphics pages

Copy `assets/gfx_template.html` into `gfx/`, set the palette and typefaces from the brand, and add modes as needed. Each mode draws one frame at time `t` on a transparent 1920×1080 canvas (`window.draw(mode, t)`), all text from `PLAN`. Render with `scripts/canvas_render.js`:

```sh
S=.claude/skills/cines-engine/scripts
node $S/canvas_render.js gfx/gfx.html stills out/st supers:14 subs:14 title:27 --plan design/plan.json   # review first
node $S/canvas_render.js gfx/gfx.html seq supers 0 84.375 out/supers.mov --plan design/plan.json       # alpha layer
node $S/canvas_render.js gfx/gfx.html seq subs   0 84.375 out/subs.mov   --plan design/plan.json
node $S/canvas_render.js gfx/gfx.html seq notice 0 10     out/notice.mp4 --plan design/plan.json       # opaque card
```

Full-frame cards that replace the picture (a data card over darkened footage, a map, the end card) render as their own clips; overlays render as `.mov` with alpha (QuickTime RLE). Look at stills composited over the real footage before rendering sequences: legibility depends on what is underneath.

## 5. Compositing with ffmpeg

Frame-exact rules that saved hours: force every layer onto the same clock with `setpts=N/(24*TB)`; pad short layers with `tpad=stop_mode=clone` and cut with `trim=end_frame=N`; overlay with `eof_action=pass` (or `repeat` for a held card); concat segments, then `trim=end_frame=<total frames>`; check the frame count of the output with `ffprobe -count_packets`. Make the subtitled and the clean version from one graph with `split`:

```sh
ffmpeg -i footage.mp4 -i out/supers.mov -i out/subs.mov -i mix.wav -filter_complex "
[0:v]fps=24,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p[base];
[1:v]setpts=N/(24*TB)[sp];[base][sp]overlay=format=auto:eof_action=pass,split[c][s];
[2:v]setpts=N/(24*TB)[sb];[s][sb]overlay=format=auto:eof_action=pass,format=yuv420p[vs];[c]format=yuv420p[vc]" \
 -map "[vs]" -map 3:a -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 256k out/ad_subtitled.mp4 \
 -map "[vc]" -map 3:a -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 256k out/ad_clean.mp4
```

Inserting a card: build the base as `concat` of footage segments and card clips (each conformed to 1920×1080, 24 fps, yuv420p), then overlay the layers on the whole.

## 6. Music and mix

- Score: one Lyria 3.5 piece shaped to the edit (a low problem, a lift where the product enters, the peak on the proof, thinning before the end card, a resolve), about 89 s per piece (`sound.md`). Or Stable Audio for beds and stingers.
- Keep the original's effects bed 9 dB down where it carries real effects (whooshes, gurgles, keys) and fade it out where the score takes over.
- Duck the music under the voice only where they compete: target music 12 dB under the voice's one-second level, at most 10 dB of ducking, 60 ms attack, 450 ms release, measured at 1 ms control rate (a numpy loop; see `sound.md`).
- Loudness: −14 LUFS integrated for web and social, −16 for presentations played in rooms, true peak −1 dBTP (`loudnorm` two-pass).

## 7. Claims and disclaimers

- Every number on screen has a source line on the same card ("Source: supplied summary, …") and the conditions that bound it ("one crude sample, not a production figure").
- Label what is illustrative where it is shown ("Illustrative comparison · not test data", "Proposed application · not yet deployed", "Stylised map · reconstruction, not project footage").
- Testimonials carry "Testimonial supplied by the client. Not independently verified." unless verified.
- AI-generated or simulated visuals get a notice card after the end card, word for word as approved (the `notice` mode: heading in the mono accent, paragraphs in the body face, 8 to 10 s, silence or the score's tail under it).

## 8. Legibility

At 1920×1080, as finally delivered (phones included): captions at least 48–50 px on a 0.7-opacity box, two balanced rows at most, bottom centre, 40 px above the edge; supers 40 px (secondary 34 px) in chips; data labels no smaller than 26 px; small print 25–27 px held long enough to read twice. Keep text inside the title-safe area (5 % in from each edge). When elements can collide (a long super and a route bar on the same frame), wrap the super to a maximum width rather than shrinking anything. Check every card that has small print against the caption that plays over it: a bigger caption box can cover a disclaimer line (move the card's text up).

## 9. Upscaling, and repairing text an upscaler damaged

Upscale or enhance the clean picture before graphics go on. If a client upscales a finished, texted video, the upscaler will have rewritten the text (digits, punctuation, thin type). Repair it frame-exactly, keeping the upscaled picture everywhere else:

1. Build a mask from the alpha of the original text layers (`alphaextract`, `blend=lighten` to combine, threshold just above zero so boxes and scrims count, three or four `dilation` passes, `gblur=sigma=2`).
2. `maskedmerge` the upscaled frames with a text-free base (the original footage before graphics), using that mask, in `gbrp`.
3. Overlay the text layers again (new sizes if wanted), and replace full-frame text cards whole with their originals.
4. Copy the audio stream from the upscaled file. Check frame counts match before and after.

## 10. Delivery

Deliver `_subtitled.mp4` and `_clean.mp4` (plus `.srt` if wanted), H.264 High, yuv420p, CRF 14–18, AAC 256 k 48 kHz, `+faststart`. Look at a contact sheet of the final at the moments with the most text, and at one crop of the smallest text at full size, before sending. Cut-downs (60 s, 30 s, 15 s, 9:16) reuse the same plan with their own timings.

## 11. Design rules

- **Motion**: entrances ease out (`cubic-bezier(.2,.8,.2,1)` or cubic out), moves ease in-out (`cubic-bezier(.65,0,.35,1)`), exits ease in and run faster than entrances; no elastic or bounce unless the brand is playful; never scale from zero; no overshoot on type. Durations: micro 120–200 ms, state changes 180–260 ms, small transitions 220–320 ms, a section entering 400–800 ms, hero sequences 800–1600 ms with beats inside; stagger 40–90 ms between list items, 0.2–0.3 s between a primary and a secondary element. Elements arrive 0.05–0.15 s before the word that names them.
- **Timing of a scene or a whole short piece**: the first 0.3 s is already a composed picture; the main beat lands by about 40 % of the length, a second beat by about 70 %, a composed poster by about 85 %, held with visible life to the end — never a frozen last second and a half, never a slideshow of states (connect beats with one continuous move).
- **What separates good from very good** (MengTo's "7 → 8" list): a dead ending is the biggest fault; then a timid final frame, words too small, a slideshow of states, no stated point, stock imagery (particle globes, nebulas, orbiting icons), slow openings, clipping and collisions, late copy swaps.
- **Type**: one sans for words, one mono (tracked, uppercase, accent colour) for labels and headers; big white numbers for proof; a highlight ring is a 1.5 px outline with 4–6 px of even clearance, never a band.
- **Colour**: one accent, used for bars, the current stop and key numbers; boxes dark and translucent so footage reads through. Keep the look as a block of variables (ground, ink, accent, type, radius, motion style) so a second look differs in composition, not only colour.
- **The removal test**: name each element, say its job, remove it in your head; if the message survives, delete it. Never invent customers, metrics, testimonials or product screens; real words in any interface you draw.
- **Restraint**: one idea per card, one focal point at a time; the footage is the hero.
- **Review**: two fresh judges (subagents) that see only frames and a contact sheet score against a fixed scale; the lower score counts; fix only what both name; stop when two rounds do not move the score, and say what is still short.

(Motion and timing rules adapted from MengTo/Skills `web-design/animation-systems`, `media/url-to-motion-design` and `ui/no-ai-design-slop`; MIT. See `external.md`.)
