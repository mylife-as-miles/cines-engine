# Shared brief for stage agents (The Prize That Became a Prison)

## The film

A 15-minute investigative documentary for YouTube about Dawn Michelle Hunt: in 2014 she carried "prize" designer handbags
through a Chinese airport, drugs were found sewn into their linings, and she has been imprisoned since. The script is
`design/script/Dawn_Hunt_Script.pdf`; the shot plan is `design/STYLE_PLAN.md`; the settled decisions are
`design/DECISIONS.md` (read all three first, then `design/REFERENCES.md`).

**Target: the level of fern's documentaries** (the author's reference, studied in `design/REFERENCES.md`), and the
craft of the reference Blender films in `/home/user/leonxlnx/` (cube-to-cafe-racer, koi-pond-keycap, mechanical-moon,
ink-dragon: fully procedural Python-in-Blender films; study their `mats.py`, `studio.py` / `lighting.py` / `look.py`,
`geo.py` bevel habits and `post.py` grade). Method references for sets: `/home/user/apekshik/anyscene` (practical-light-
first lighting, haze, grounding checks, the critic's bar) and `/home/user/apekshik/anymachine` (props part by part).

**The look** (DECISIONS): cinematic investigative noir. Desaturated blue, fluorescent institutional light, deep
shadows, a lit island in the dark. Slow tracking shots, overhead compositions, controlled close-ups. Restrained, never
sensational. The people are matte stone statues (MakeHuman bodies, blank statue eyes, sculpted hair) so the picture
reads as reconstruction without any label.

## Hard rules

- **No legible text anywhere in 3D**: no signage words, no logos, no brands, no numbers on screens or tags. Signs are
  blank panels or pictograms; screens glow blank. Story typography is added later as motion graphics, never by you.
- **No paid generation and no downloads**: do not call Tripo, fal, Higgsfield, vidIQ or any generation tool, and do not
  fetch assets from the internet. Use the props listed below, MakeHuman clothes, and geometry you build in Python.
- **Write only your own files**: `scenes/stages/<your stage>.py` and, if needed, helpers named
  `scenes/stages/<your stage>_*.py`. Do not edit `noir-kit/*`, `scenes/sets.py`, `scenes/shoot.py` or another stage.
  If a shared helper misbehaves, work around it inside your module and say so in your report.
- **Do not commit or push**; the orchestrator does.
- No staged violence, no invented photograph of Dawn, nothing that imitates real officials' insignia or a real airline.

## Conventions

- Blender 5.3 as a Python module: `/tmp/claude-0/-home-user-cines-engine/73593c7c-6dfc-5879-82bf-97979958b8ab/scratchpad/bpyenv/bin/python -I`.
  Import `bpy` before `bmesh` / `mathutils`. Metres, Z up, floor at z = 0.
- A stage module defines `CAMERAS`, optional `EXPOSURE`, and `build(cast=True)`; see `scenes/shoot.py` and the seed
  `scenes/stages/inspection_room.py`, which already works (props on the bench, Dawn and two officers).
- Set parts: `noir-kit/setkit.py` (`mat`, `emission`, `tiles`, `wood`, `box` with bevel, `cyl`, `arc`, `area_light`,
  `haze`, `camera`). Existing room: `scenes/sets.py` (`airport_room`, `bench`, `materials`). You may write better
  versions of these inside your own module. Every edge that catches light gets a real bevel.
- Cast: `noir-kit/cast.py` (`person(name, gender, height_cm, age, hair="bun"|"short")`, `dress(holder, items, tint=)`,
  `hat(holder, path, rgb=)`) and `noir-kit/rigged.py` (`pose_figure(holder, {"head": (down, turn), "chest": ...,
  "l_arm"/"r_arm": (forward, out, elbow)})`). Build at the origin facing -Y, then move the holder empty. MakeHuman
  clothes in `noir-kit/assets/makehuman/clothes/` (female_elegantsuit01, female_casualsuit01, male_elegantsuit01,
  male_casualsuit01/03/05, shoes01-06, fedoras). Officers wear male_elegantsuit01 in navy with
  `noir-kit/assets/props/peaked-cap.glb` through `cast.hat`. Each person takes about 10 s to build.
- Props: `noir-kit/props.py` `load(name, size, axis, loc, turn_deg, sat, val, hue, rough_add)` from
  `noir-kit/assets/props/<name>.glb`. Generated models face no fixed direction: check each one's front before placing.

| Prop | size, axis | Notes |
| --- | --- | --- |
| dawn-suitcase | 0.66, z | Charcoal soft case; front pocket looks along +X in the file. sat 0.6 |
| extra-bag-closed / extra-bag-open | 0.75, long | Black rolling duffel (zip open on the second). sat 0.5, val 0.35, rough_add 0.3 |
| handbag-tote | 0.35, long | Cognac leather; one face has a dent under top light: turn 162 shows the clean face |
| handbag-satchel | 0.30, long | Black leather, gold clasp |
| handbag-shoulder | 0.32, long | Came out glossy raspberry: darken toward burgundy (val ~0.55) and rough_add ~0.25 |
| xray-scanner | 1.45, z | Tunnel opens to +X, its only detailed side; small maker's plate on top (keep it out of focus or cover it) |
| luggage-trolley | 1.0, long | |
| gate-seating | 2.4, long | Row of four linked seats |
| peaked-cap | (via cast.hat) | Bright blue in the file: pass a navy rgb |
| desk-lamp 0.55 z, laptop 0.33 long, file-folders 0.34 long | | Evidence-table props |
| reception-desk | 1.1, z | Chunky: background only |
| kitchen-table 0.76 z, dining-chair 0.95 z, dining-table 1.8 long | | Home |
| cell-door | 2.1, z | Front is good; the door is a 1.1 m-deep block: set it into a wall |
| visitor-chair 0.82 z, visiting-phone 0.30 z, bunk-bed 1.95 long, judge-chair 1.25 z, gallery-bench 2.0 long, microphone 0.45 z | | Detention, court, hearing |

Not usable (Tripo misses): `checkin-desk`, `stanchion`. Build these in Python if your stage needs them.

- Exposure: under the inspection-room troffer, props wash out at exposure -0.2; -2.0 is right there. Light every stage
  so its exposure sits near -2.0 to -1.0, never by greying the props.
- The film grade (applied by `shoot.py` to `*_graded.png`) desaturates and cools: judge colour on the graded frame.

## Lessons from the first critiques (airport stages, 26 November 2026)

The independent critic failed the first airport frames (means 4.6 and 5.1) for these reasons; get them right first time:

- **Lit island, not fill.** A big bounce or fill light flattens everything to one mid grey. Light with practicals
  (troffers, lamps, screens, light under doors) and let the rest fall off into deep but readable shadow; avoid areas
  that the grade crushes to pure black when they carry the place (windows, the far wall).
- **Prop values.** Check the raw frame: charcoal and black bags must read dark, the cognac tote warm (not salmon). Do
  not fix values by greying textures; fix the light and the grade (`val`, `sat`, exposure).
- **No clipping.** Flat glossy tops under a lamp (steel benches, tables) clip to a white lightbox from above: raise
  roughness, angle the light, keep the top's brushed texture and edge thickness visible.
- **Practicals must glow and spill.** A blank screen or display is an emissive surface that lights what is near it
  (a weak area or point light in front of it), and its bezel stays darker than its face.
- **People are not clones.** Vary height, build, age, hair and suit tint; give each a distinct pose with a visible
  action; eyelines toward who they are speaking to; hands relaxed (curl the fingers), resting on things, not hovering
  or splayed; feet grounded with contact shadow. `female_elegantsuit01`'s pinstripe knit shimmers in wide shots (tint
  it flat or choose another outfit); `shoes05` reads as branded sneakers: choose plain shoes.
- **Framing.** Do not cut feet or heads at the frame edge, do not run edges tangent through necks, do not cut a bright
  light fitting at the frame edge, keep a clear subject, avoid big flat grey slabs in the foreground.
- **Materials up close.** No streaky noise that reads as wood on steel; real paper is matt and slightly warm, twine is
  fibrous, fabric shows weave; block walls are painted block (mortar lines), not mottled noise.

## Rendering (4 CPU cores shared by every agent)

- Render **only** through `scenes/shoot.py` (it holds a machine-wide lock, so renders queue):
  `cd /home/user/cines-engine/claude-youtube/prize-that-became-a-prison && <bpy python> scenes/shoot.py -- <stage> <cam> out/stages/<stage>/<name>.png --res 960x540 --spp 24 [--nocast]`
  Use `--nocast` while working on the set (about 30 s faster). Look at the PNGs with the Read tool.
- At most 12 renders per agent run. Never run two Blender processes at once; never kill processes you did not start.
- Several agents share the lock, so a render can wait 10 minutes or more before it starts: give every shoot.py command
  a Bash timeout of 1,800,000 ms (or run it in the background and wait for it), and never treat waiting as a failure.
- Final frames for review: `--res 1280x720 --spp 64`, file names `final_<cam>.png`.

## Final report (short)

Your stage's cameras and what each shows (which chapter beat), the final frame paths (graded), what you changed, known
weaknesses, and any helper problems.
