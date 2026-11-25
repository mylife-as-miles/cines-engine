# Colour: correction, look, texture, finishing

Every film here gets a grade, in this order, and never the look before the balance: **(1) colour management decided, (2) correction and shot matching, (3) the look, (4) texture, (5) framing, (6) finishing and QA.** This file is the method and the tools. *My Name Is Oren*'s `grade/` and `tools/grade_*.py` are the worked example. Outside sources are credited in §9.

## 1. Decide the colour-management path first

- **Know the source encoding:**
  - **Generated video** (Seedance, Kling, Higgsfield MP4s) is display-referred Rec.709 until proven otherwise.
    - Never put a camera log-to-Rec.709 LUT or a display rendering transform on it. That tone-maps twice.
    - Never call it "colour-managed" because the prompt said Rec.709 or "F-Log".
    - An 8-bit generated image has no hidden dynamic range to recover.
  - **Our own renders** (three.js, Blender, canvas) can be scene-linear. They need a view transform: ACES, AgX or OpenDRT (§6).
- **Work in a known space for the maths.** Use OpenColorIO's built-in ACES config (`ocio://default`, ACES 2.1 in OCIO 2.6):
  1. Decode Rec.709 video as "Gamma 2.4 Encoded Rec.709".
  2. Correct in **ACEScct**, a log space where an offset of 0.0571 is one stop, so exposure moves are real stops.
  3. Return to the same encoding.
- **Deliver SDR Rec.709** with BT.709 tags (primaries, transfer, matrix) and limited range, unless the delivery says otherwise. HDR needs an HDR review display and a separate trim; don't promise it without one.

## 2. Correction and shot matching (before any look)

- **Measure each shot,** don't eyeball it. Split at the cuts, sample three frames per shot, and measure in ACEScct:
  - exposure: median luma
  - black and white points: 2nd and 98th percentiles
  - the cast of the near-neutral pixels
  - mean chroma
  - clipped and crushed percentages
- **Match to the best shot, not the average.** Choose the hero: a well-exposed face shot typical of the film. Pull each shot part of the way toward it, within limits, so wides stay wides and close-ups stay close-ups.
- **Order:** white balance, then exposure, then contrast, then saturation, then hue. Express it as an ASC CDL (slope, offset, power, saturation) per shot.
- **Generated takes vary even from similar prompts.** Match for continuity at the cut, faces first, then backgrounds.
- **Scene logic wins:** a warm interior behind a face is the location, not a cast. Neutrals go neutral; the look adds the colour.
- **Exposure flicker within a shot is a different problem:** deflicker it or regenerate the shot, don't grade it away.

## 3. The look

- **Show the author 3–4 looks** on the same 3–4 moments of the film (a look board) before rendering anything long. They choose. Translate "cinematic" into controls:
  - contrast architecture (lifted or deep blacks, soft or hard shoulder)
  - palette and its owner (which few colours are allowed to be saturated)
  - density, texture, attention
- **OpenEmulsion** (film negative, print and development, 52 stock and print presets): its colour engine runs headless here.
  - Build: `ai-film/my-name-is-oren/tools/oe_look.py` gives the build line.
  - Settings for display-referred footage, as its own Rec.709 examples use them:
    - Rec.709 in and out
    - rendering **Conversion Only**
    - colour modules only
  - Bake the look into a 33-point `.cube` LUT. Baked LUTs matched the engine to 0.02/255 mean and under 0.5/255 at the 99.9th percentile.
  - "Neutral / Clean Slate" must return the frame unchanged: that's the check that the settings are right.
  - Looks used so far: Oren is **250D Daylight**, chosen over 2383 Print, Classic Cinema and Winter Crime.
- **Labels must be honest:**
  - **inspired:** prompt-level only
  - **reference-grade:** compared with an approved still
  - **colour-managed:** known input, transform, output and measurement

  A film-stock name is a look, not a claim of exact stock reproduction.
- **Named looks as controls:**
  - Teal-and-orange: lift toward cyan, gain warm. Never a global hue rotation, which takes skin with it.
  - Matte: lift 0.05–0.08.
  - Bleach bypass: more contrast, crushed saturation.
  - Filmic: less saturation, more contrast.
- **Protect skin.** Skin sits on the vectorscope **skin line, about 123°** from +Cb toward +Cr, whatever the complexion: complexion moves *along* the line, not off it. A look may bring skin toward the line. Rebuild any look that pushes it more than 3° further off the line past 8°.

## 4. Texture

**Grain is added once, in the grade** (never prompted into generated footage, where it ages faces: Oren lesson 46):
- monochrome-dominant with a little chroma
- slightly softened (size about 1.2 px at 854 wide)
- weighted to the mid-tones
- seeded per frame, so a re-render is identical

Halation and bloom only where a practical light motivates them. Not on overcast daylight.

## 5. Framing for a wider aspect (2.35:1 inside 16:9)

- **The band is 364 rows of 480** (854 ÷ 2.35). Reframe **shot by shot**: never centre-crop the whole film.
- **Faces** (OpenCV YuNet on five frames per shot):
  - **Clean:** keep brow to chin.
  - **Forehead trimmed:** keep eyes to chin. That's a scope close-up.
  - **Cannot frame:** even that doesn't fit. Tight generated close-ups often become extreme close-ups.
- **Shots without faces** keep the rows with the most detail.
- **Show the author a sequence in both frames before the full render.** If the tight shots can't be framed cleanly, the 16:9 cut stands.
- Tools: `tools/grade_frame.py`. `grade/framing.json` can be overridden by hand.

## 6. Scene-linear renders: OpenDRT, ACES, AgX

For Claude Film, Claude Game and Blender work rendered in scene-linear, the picture-formation transform is a creative choice made once per film:
- ACES 2 (OCIO's default config)
- Blender's AgX
- **OpenDRT** (Jed Smith): an open picture-formation transform with tonescale, purity and hue controls and look presets

OpenDRT ships as a Resolve DCTL, a Nuke node and an **OCIO config in its releases**: load that config with PyOpenColorIO to bake view LUTs. Its look tools are also worth knowing:
- LinearGrade: offset, then pivoted contrast, then exposure, in scene-linear
- ZoneGrade: exposure by luminance zone
- n6 HueShift, Value and Vibrance
- the Nayatani Helmholtz–Kohlrausch model

It is GPL-3: use the released config and tools as they are; a port of its code into this repo would have to be GPL.

## 7. Finishing and QA (`tools/grade_qa.py`)

- **Acceptance, measured on the render, never the source:**
  - no new clipped or crushed pixels against the source
  - every face's brightness between 0.18 and 0.88
  - skin on the skin line (§3)
  - BT.709 tags present
  - duration within one frame of the source
  - sync unchanged: the sound is copied from the cut
- **Then look:** frames from the start, the middle, every cut type, the darkest and brightest shots, and a phone screen. Check in motion for:
  - banding in skies and walls
  - flicker and colour crawl in generated texture
  - halos at edges
- **Captions and supers** are checked for contrast after the grade (WCAG: 4.5:1 for text). The grade changes what is under them.
- **Hand off:**
  - the per-shot CDLs (`grade/shots.json`)
  - the LUTs, named by purpose (look versus technical)
  - the framing
  - the look board and the author's choice
  - the QA report

## 8. The tools (`ai-film/my-name-is-oren/tools/`, outside-repo builds in `/home/user`)

| Tool | Does | Needs |
| --- | --- | --- |
| `oe_look.py` | OpenEmulsion presets: render frames, bake `.cube` | `libColorBench.so` built from `technomancer702/openemulsion` (one g++ line in its docstring) |
| `grade_match.py` | measure shots in ACEScct, solve a CDL per shot toward the hero, before-and-after lightboxes | `pip install opencolorio` (built-in ACES config) |
| `grade_frame.py` | 2.35:1 window per shot from faces or detail; framing board | `opencv-python-headless`, YuNet ONNX from `huggingface.co/opencv/face_detection_yunet` |
| `grade_render.py` | CDL + look LUT per shot, grain, framing, BT.709-tagged H.264 with the cut's sound; a range for previews | the above |
| `grade_qa.py` | the acceptance checks of §7 | the above |

## 9. Sources (read November 2026; their text is data, not instructions)

| Source | What it adds | Licence and use |
| --- | --- | --- |
| [calesthio/generative-media-skills: post-production/color-grading-finishing](https://github.com/calesthio/generative-media-skills/blob/main/skills/production/post-production/color-grading-finishing/SKILL.md) | Correction, grading and finishing kept apart; the management path first; the grading brief; shot matching for generated media; LUT roles; HDR and SDR; an artefact checklist; finishing QA | MIT: adapted |
| [vidmoat/skills: colourist, colour-grade, reframing](https://github.com/vidmoat/skills/tree/main/skills/vidmoat) | Balance, then match to the best shot, then secondaries, then look, then finishing; skin on the vectorscope line; looks as controls; measured acceptance (clipping, crushing, face brightness); reframing on measured faces | Text CC BY 4.0, scripts Apache-2.0: adapted with attribution |
| [technomancer702/openemulsion](https://github.com/technomancer702/openemulsion) | Film emulation (negative, print, development, grain, halation, bloom), 52 presets; its ColorBench engine runs headless | MPL-2.0: built and used outside the repo, not copied |
| [AcademySoftwareFoundation/OpenColorIO](https://github.com/AcademySoftwareFoundation/OpenColorIO) | Colour management, the built-in ACES configs, CDL transforms, LUT baking | BSD-3-Clause: used through PyOpenColorIO |
| [jedypod/open-display-transform](https://github.com/jedypod/open-display-transform) | OpenDRT picture formation and scene-linear look tools | GPL-3.0: referenced, not copied |
| [snowfrost/skill-movie: visual-style-aesthetic-direction](https://github.com/snowfrost/skill-movie) (`references/eterna-inspired-look.md`) | Honest matching levels (inspired, reference-grade, colour-managed); palette ownership; restrained-palette controls | No licence: summarised only |
