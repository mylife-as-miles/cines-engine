# Production plan: a fully animated film, rendered on Higgsfield GPUs (28 Nov 2026)

The author's brief (28 Nov): no still pictures. Real motion everywhere: characters that move (a hand typing on a
keyboard), simulated cloth, paper, rain and dust, camera moves done in 3D, and Blender Cycles quality, with Houdini and
Unreal where they help. Real footage and photographs are cut in. The text becomes kinetic and premium (the current serif
cards were rejected as boring). Pacing alternates fast and slow for retention, like fern's films.

This replaces the "3D still + 2D push" method of animatics v1 and v2. The script stays SCRIPT_V3.

## What fern actually does (from the contact sheets in the analysis folder)

- Animated mannequins in real-feeling rooms: typing, sitting, turning; close-ups of hands on lit keyboards.
- Very fast montage in the hooks: cuts of 0.1 to 0.6 s (1:45.1 to 1:45.8 in the CIA film is seven cuts in 0.7 s). Then
  long, slow holds once the story settles (average shot 6.8 s after the first 3 minutes).
- Text lives in the world: on screens, on documents (a yellow marker on the key phrase), in case-file and HUD panels
  (photo, name, flag), and as small sans-serif labels on timelines floating in 3D space. Almost no big title cards.
- Real archive cut hard against the 3D: news clips, press, raids, headlines pushed in.

## The pipeline

| Step | Tool | Where it runs | Cost |
| --- | --- | --- | --- |
| Shot list with a fast/slow rhythm map (from SCRIPT_V3) | lead | here | free |
| Sets (the 19 stages already built) brought up to animation: rigs, props that move, cloth | Blender (Python) | here | free |
| Characters: the stone mannequins rigged (Rigify); walking, sitting, gestures from the CMU motion-capture library (free for any use), retargeted; typing and writing hands keyed procedurally | Blender | here | free |
| Simulations: cloth (bags lifted and set down, the tote handled, uniforms), paper (letters, statement pages), rain and wet streets (Hong Kong), dust and haze in light beams, crowd extras in the airport | Blender cloth, particles, Mantaflow | here (bakes on CPU) | free |
| Camera: real 3D dollies, cranes, handheld drift, rack focus, motion blur, in place of 2D pushes | Blender | here | free |
| Previews to check every shot's motion before paying for it (Eevee or low-sample Cycles) | Blender | here | free |
| **Final frames, path traced** | **Blender Cycles on Higgsfield GPUs** | **rented box** | **credits (below)** |
| Kinetic type, captions on the testimony, case-file panels, a 3D-space timeline, maps | canvas pages and Blender | here | free |
| Real footage, photos and documents composited with motion | ffmpeg / Python | here | free |
| Edit, score, sound, mix | the existing tools | here | free |

Everything is built, animated, simulated and previewed here at no cost. The GPU only renders final frames.

## Which GPU

Credits cost about $0.05 each: a 4,000-credit pack is $210.53 (19 credits per dollar), auto-refill is 20 per dollar.

| GPU | Credits per GPU-hour | About $ per hour | For this film |
| --- | --- | --- | --- |
| L40S | 71 | $3.55 | Good. Has RT cores and a video encoder. Fine for tests and short renders |
| **RTX PRO 6000** | **98** | **$4.90** | **Recommended.** About 1.5x an L40S in Cycles, so cheaper per finished frame |
| H100 / H200 / B200 / B300 | 120-197 | $6-10 | No. No RT cores, so Cycles' OptiX is slower on them than on an L40S, at a higher price |

Cycles uses every GPU in a box. More GPUs make it finish sooner; they do not change the total cost.
- 1 RTX PRO 6000: 98 credits an hour.
- 2 RTX PRO 6000: 196 credits an hour, about twice as fast.
- 4 RTX PRO 6000: 392 credits an hour, about four times as fast.

## The estimate (to be firmed up by one paid test)

Assumptions:
- SCRIPT_V3 runs about 13:50.
- About 8:20 of it is 3D animation. The rest is real footage, photos, documents and motion graphics, which cost nothing to render.
- The average cut is about 2.5 s, so about 200 animated shots.
- Each shot gets a 10-frame handle for the edit, so the total is about 14,000 frames at 1920x1080, 24 fps.
- Cycles at 128 adaptive samples, with OptiX denoising and motion blur.
- Estimated about 18 s a frame on an RTX PRO 6000 on average: 10-12 s for simple interiors, 25-30 s with haze, rain or crowds.

| Item | GPU-hours (RTX PRO 6000) | Credits | About $ |
| --- | --- | --- | --- |
| Final frames (14,000 × 18 s) | 70 | 6,860 | $345-360 |
| Low-cost GPU previews where a local preview is not enough (about 10 %) | 7 | 690 | $35 |
| Re-renders after review (about 30 % of shots) | 21 | 2,060 | $105 |
| Box start-up, uploads, test frames (about 5 %) | 4 | 390 | $20 |
| **Total, recommended plan** | **about 102** | **about 10,000** | **about $500-525** |

Other scales of the same plan:
- **Leaner:** about 6 minutes of 3D, fewer re-renders. About 7,000 credits, roughly $350-370.
- **1440p delivery:** about 1.8x the render time. About 18,000 credits, roughly $900-950.
- **4K delivery:** about 3.5x the render time. About 35,000 credits, roughly $1,750-1,850. Not needed: fern's films are 1080p or less.

Wall clock for the final frames:
- one RTX PRO 6000: about 70 hours;
- two: about 35 hours;
- four: about 18 hours.

The plan is to render chapter by chapter, review each, then go on. Spending then stops the moment something is wrong.

The account holds 3,000 credits. The recommended plan needs about 7,000 more, for example two 4,000-credit packs at $421.06 in all. Top-up credits expire after 90 days.

## Houdini and Unreal: not used (the author's decision, 28 Nov: Blender only)

The notes below are kept as the reasoning behind that decision.

**Houdini** (SideFX) is the best tool for heavy simulations: smoke, fire, liquids, destruction and large crowds.
- On a rented box it needs a paid SideFX licence. Indie is the cheapest that works; the free Apprentice licence does not run there. Check sidefx.com/buy for the current price.
- It also needs extra CPU cores for the simulations, about 1,000-1,800 credits ($50-95) of box time for a few hero simulations.
- This film does not need it. The motion it needs (cloth, paper, rain, dust, haze, a few extras in crowds) is within Blender's own simulators, at no licence cost.
- Use Houdini only if the author already has a licence, or wants one specific hero simulation.

**Unreal Engine** is free for film work, with a free Epic account.
- It is fastest for big, dense environments: the airport terminal with crowds, the Hong Kong street at night in the rain, the Guangzhou leather market. Free Quixel Megascans assets give it photoreal surfaces, and Lumen renders in seconds a frame.
- Setting it up on a box takes a long engine download and shader compile, and building scenes there costs box time: about 1,600-2,400 credits ($80-125) for two or three environments.
- The risk is two looks in one film (Unreal worlds, Blender characters).
- Recommended only for those two or three exteriors, and only if the Blender versions fall short.

## Checked against Higgsfield's own published runs

These are from the six Higgsfield GPU posts the author pasted on 28 Nov. They are the closest real numbers to this film.

| Their film | Render | Speed | Cost |
| --- | --- | --- | --- |
| Flower street (Houdini growth, Cycles) | 1920×1080, 192 samples, 8× RTX PRO 6000 | 14-29 s a frame on most shots; about 60 s on the heaviest macro | 1,340 film + 800 clay frames: 1,099.5 credits (about 1,230 with boxes stopped early) |
| Black liquid (Houdini sim, Cycles) | 1920×1080, 512 samples, 14× RTX PRO 6000 | 86-90 s a frame | 2,167 frames: 5,653 credits (2.6 a frame) |
| Shibuya city (Cycles) | 1920×804, 19.5 M triangles, 9,662 people, 4× RTX PRO 6000 | 55 s a frame | 960 frames in 4 h 30 min |
| Zombie dance (Cycles) | 1920×1080, 4× H100 | | 2 × 929 frames: 1,705 credits |
| Walking mech (Cycles) | 1920×1080, 256 samples, 1× L40S | 5.3-7.5 s a frame | 62 frames: 17 credits |
| Beach town (Unreal 5.8, Lumen) | 1920×1080, 64 samples at 4K | 2.9-6.1 s a frame (RTX PRO 6000), 8.2-8.6 s (L40S) | first editor start: 15-113 min of shader compiling |

Our estimate (about 18 s a frame at 128 samples, about 0.5 credits a frame) sits inside the flower film's 14-29 s at 192 samples. Our sets are lighter than the city and the liquid, so the estimate holds. The test below confirms it.

Habits taken from those runs:
- **Every scene is code** that rebuilds the same way every time. Our stages already are.
- **Preview before paying.** Motion is judged in grey or clay previews made here, for free. One test frame is approved before any paid render.
- **One GPU type for the whole film.** An L40S renders slightly darker than an RTX PRO 6000 in Unreal. Every box first renders a reference frame and must match the approved one.
- **Copy frames home while the render runs.** Anything left on a box is lost when it stops (except /workspace).
- **Check every frame:** none missing, black or too dark. In Unreal, a frame counts only if a second run gives the same image.

## The first paid step: a calibration test

The test costs about 150 credits (about $7.50) and needs the author's yes first. It renders three 4-second animated shots on one RTX PRO 6000:
- a hand typing on the laptop at Dawn's desk (close-up, depth of field);
- a figure walking through the check-in hall to the scale (character animation and a camera move);
- the detention corridor with haze and dust in the light (volumetrics).

It measures the real seconds per frame, which turns the estimate above into a firm quote. It also shows the new motion quality before anything bigger is spent.

## Not GPU costs, but costs

Licences for the archive: NBC Chicago (IN-14, IN-15), C-SPAN (IN-13, unless the official feed is used), the AFP photo, and
family permission for the photos. Quotes come from the rights holders.
