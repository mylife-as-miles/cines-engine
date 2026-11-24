# Villeneuve grammar for Crownfall: King of Kings

Board rules for the 3D blocking storyboard and silent animatic (three.js set, 2.35:1, fog, simple lights). Researched 24 Nov 2026.

## 1. Sources

**None of the three sources the author gave loaded.** All three hosts failed DNS resolution because the session's network allowlist blocks them, so nothing below comes from them. To use them, allow `stillslab.com`, `nofilmschool.com` and `framethrower.ai` in the environment's network settings and run this pass again.

| Source | Status | Summary |
|---|---|---|
| stillslab.com/directors/denis-villeneuve | Did not load; no search result | Unknown. |
| nofilmschool.com/how-denis-villeneuve-directs | Did not load; WebSearch confirms the title "How Denis Villeneuve Directs Actors and Frames Every Shot" | Search intro only: running big VFX productions while guiding actors through subtle emotion. |
| framethrower.ai/directors/denis-villeneuve | Did not load; no search result | Unknown. |

**Supplementary sources, read as WebSearch excerpts rather than full pages.** These are interviews with Deakins, Fraser, Bradford Young, editor Joe Walker and designer Patrice Vermette (Filmmaker Magazine, Hazlitt, ASC, ARRI, British Cinematographer, Variety, Dolby). One correction to the brief: Bradford Young shot *Arrival*, not Deakins or Fraser.

**Quotes relied on:**
- "Denis and I generally favor middle range [focal lengths], usually between a 27mm and a 50mm." (Roger Deakins, Filmmaker Magazine, *Blade Runner 2049*)
- "If the camera moves it's got to be for a reason." (Deakins, Hazlitt)
- The camera is "just observing and it's very still and that's where the tension comes from." (Deakins, Filmmaker Magazine, *Sicario*)
- "I love to work with one camera, one tripod." (Villeneuve, on *Dune*)
- "I think that sound is, by far, the most powerful tool in the cinematic language." (Villeneuve, Dolby)
- "I love dialogue, but not always in cinema." (Villeneuve, GamesRadar)
- Villeneuve wanted *Dune* to "feel intimate to the characters" (Greig Fraser, Variety). Fraser's quickest way to make something look enormous is to put a human next to it (paraphrase, PetaPixel and Inverse).
- "the biggest palace ever built by humankind. Then you get a sense of scale." (Patrice Vermette, on Arrakeen)
- Walker held *Sicario*'s descent into darkness "for ages". He describes the border shootout as slow, then suddenly very fast (paraphrase).

**Documented facts used:**
- **Blade Runner 2049.** One 24K bulb lights the replicant vault (Deakins masterclass). The Wallace office's caustics come from 10Ks bounced off moving water. The Las Vegas orange was referenced to the 2009 Sydney dust storm. The film was largely one camera, on a dolly or crane (ASC).
- **Sicario.** The tunnel was cut from real night-vision and thermal cameras and has no score.
- **Arrival.** The chamber is lit only by a rectangular window, and the palette is muted blue-grey.
- **Dune.** Arrakeen interiors get no direct sun, only bounce light through light wells. Part Two's Giedi Prime was shot in infrared black and white.
- **Prisoners.** Exteriors are overcast, and nights are lit by practicals and flashlights.
- **Method.** Villeneuve storyboards nearly every shot, with Sam Hudecki. His style is summarised as "long takes, precise mise-en-scène, steady camerawork, periods of wordless silence" (Wikipedia).

**No published average shot length exists.** Values marked *heuristic* are board starting points, not data.

## 2. The grammar

### Scale: the human against the world
- **A figure carries the scale.** Size reads from a human next to the mass (Fraser), not from a wide lens. Every scale shot gets a figure.
- **Size** *(heuristic)*: the figure is 2–6% of frame height in a scale shot and 8–15% in a lonely wide. Architecture or landscape fills 60–90% of frame.
- **Placement.** Put the figure on the centre line or a third line, with feet on or below the lower third, so the mass sits above the figure.
- **Distance in three.js.** distance (m) ≈ height (m) × focal (mm) ÷ (fraction × 14.9 mm). 14.9 mm is the 2.35 frame height at the default `filmGauge` 35. A 1.8 m figure on a 56 mm lens fills 5% of frame at about 135 m, and 2% at about 340 m.
- **Monoliths** are brutalist, angular and horizontal: Vermette chose Brazilian Brutalism for its "really interesting angular lines". Model the ziggurat as stepped, unornamented blocks that read as one silhouette in haze.

### Composition
- **Centre or offset.** Centre and symmetry for power, ritual and the throne. Offset with heavy negative space for isolation.
- **Negative space** is one flat value: sky, haze, sand or black. It takes about two-thirds of a scale shot.
- **Horizon.** Lower fifth when sky or structure dominates. Upper fifth or out of frame for overheads and descents.
- **Silhouettes.** Subject dark against brighter fog, sky or window, as with *Arrival*'s pair at the window and *Sicario*'s dusk descent.
- **Frames within frames.** Doorways, slots and light wells box in a character who is trapped or watched.
- **Focus.** Use a depth-of-field pass on singles if you have one. Otherwise separate planes with haze.

### Lenses
- **Default middle range:** S35 27–50 mm (Deakins). Set `camera.filmGauge = 24.9` to use those numbers directly. At the default gauge of 35, multiply by 1.4: 27→38, 32→45, 40→56, 50→70, a horizontal FOV of 50° to 28°.
- **Get scale by moving the camera back, not by going wider.**
- **Wide** (S35 18–21, HFOV 69–61°): only in monumental interiors and overheads.
- **Long** (S35 75–100, HFOV 19–14°): rarely, for stacked hosts, heat haze or a watcher's view.
- **Never zoom.** FOV stays constant within a shot.

### Camera height and angle
- **Default:** eye or chest height, camera level, no dutch tilt.
- **Low angle** *(board rule)*: 0.3–0.8 m high, tilted up 5–15°, reserved for power, meaning the King or the monolith.
- **Overheads and aerials** for geography and threat; Walker cut to aerials over Juárez to raise the threat. Board them top-down, or 60–80° down from 100 m or more.
- **Oblique or inverted angles** only for total chaos, as in *Polytechnique*.

### Movement
- **Locked-off by default** ("one camera, one tripod").
- **Moves are dolly or crane, slow and motivated:** push in on a realisation, pan slowly to reveal scale, crane down to land on a figure.
- **Speeds** *(heuristic)*: a push-in covers 10–25% of the camera-to-subject distance, eased in and out. Pans stay at 3°/s or slower.
- **Handheld** only inside panic or violence, and small.

### Light
- **One hard source per shot. Let the rest go black.** A reviewer named this "courage to rely on a single source" as Deakins's signature. Fill stays at 10% of key or less.
- **Interiors.** Light enters through a shaft, slit or window. Top light is fine, and faces may fall into shadow.
- **Haze on every shot.** Use `FogExp2`, with the fog colour equal to the background and the palette haze. Suggested densities in metres: 0.004–0.01 for clear desert, 0.015–0.03 for haze, 0.05 or more for a dust storm.
- **Practicals.** Torches, braziers and the Crown's glow are the motivated keys.
- **Moving light.** One accent at most: caustics or flame flicker for a sacred room (the Wallace office).
- **Palette.** One dominant hue plus black per world. Infrared monochrome (Giedi Prime) suits a world drained of colour.

**Palette suggestions** (not sampled from frames):

| Mood (reference) | Key | Haze | Shadow | Accent |
|---|---|---|---|---|
| Ochre sand (Dune, Arrakis) | `#E8C79A` | `#C9A272` | `#2B211A` | `#8C5A2E` |
| Grey-black (Dune, Caladan and Harkonnen) | `#9AA3A6` | `#5E676B` | `#141617` | `#3B4245` |
| Orange haze (BR2049, Las Vegas) | `#F2A65A` | `#D9752B` | `#3A1A0C` | `#FFC27A` |
| Cyan night, sodium (BR2049, city) | `#9FD3DA` | `#2F5F6B` | `#0B1418` | `#FFB347` |
| Blue-grey overcast (Arrival) | `#C9CFD2` | `#8B969C` | `#1C2124` | `#F4F5F2` |
| Infrared mono (Dune Part Two) | `#F4F4F2` | `#9A9A9A` | `#0A0A0A` | none |

The bible's arc is "slate until the Crown is hit, gold after it falls". Use the grey rows before that moment and the ochre and orange rows after it, reconciled with the bible's palette strip.

### Sound, silence and pacing
- **Board the silence.** Give each shot a sound note: silence, wind, drone or a single hit. Mark where there is no score, as in the *Sicario* tunnel.
- **Holds** *(heuristic)*:
  - scale wide: 6–12 s
  - tension hold: 12–20 s, once or twice per sequence
  - push-in: 8–15 s
  - single: 3–6 s
  - across the 7:56 cut, 4–6 holds longer than 10 s
- **Rhythm** (Walker): slow, slow, then a burst of 3–6 cuts at 0.5–1.5 s each, then back to a hold.
- **Hold 1–2 s past an exit or a landed line.**

### Dialogue
- **Intimate inside the epic.** Cut from a scale wide straight to close singles.
- **One chosen angle per beat.** No default master, over-the-shoulder and single set.
- **Two-shots** in profile or side by side, both facing the same thing (*Arrival*'s window), rather than shot and reverse shot.
- **Singles** keyed from the side or behind, with the face part-shadowed. The listener may be a silhouette; an early BR2049 scene was designed to keep K in silhouette (ASC).
- **Reactions held longer than lines.**

### Action and violence
- **Build long, release short.** The camera stays calm, because tension comes from stillness (Deakins).
- **Show scale:** aerial wides of the host, distant fire, smoke columns and flashes in haze.
- **Mediate the impact:** off-frame, in silhouette, or through a filtered view (*Sicario*'s thermal views, Giedi Prime's infrared arena).
- **Aftermath over impact.** *Sicario* opens on bodies found inside the walls, and shows the Juárez bodies hung from an overpass as the convoy passes.

## 3. Board checklist (per shot)

1. A figure is in frame for scale, with its height logged as % of frame.
2. The lens is S35 27–50 (three.js 38–70 at gauge 35), unless a reason is written.
3. The camera is level at eye height, except on a marked power (low) or geography (overhead) beat.
4. The composition is named: centred and symmetrical, or offset with two-thirds negative space.
5. The horizon sits in the lower fifth, the upper fifth or out of frame. Centre it only in symmetrical ritual frames.
6. There is one key light, with its direction noted and fill at 10% of key or less.
7. Fog is on and matches the background. The figure is either a silhouette or modelled by the key, chosen on purpose.
8. The palette is one dominant hue plus black from the scene's row, with no stray colours.
9. The shot is locked-off unless a motive is written. Any move is a dolly or crane, with constant FOV, at or below the speed limits.
10. A frame within the frame is used when a character is trapped or watched.
11. Dialogue faces may sit in shadow, and the listener may be a silhouette.
12. There is one angle per beat, with no safety coverage.
13. The hold length is logged. Scale wides run 6 s or more, with one or two long holds per sequence.
14. The frame holds 1–2 s after the action ends.
15. Violence is shown off-frame, in silhouette, as aftermath or as distant scale, never as a lingering close-up.
16. Action is a long build, a burst of 0.5–1.5 s cuts, then a hold.
17. The shot has a sound note: silence, wind, drone or a single hit.
18. Any visible fire, torch or Crown glow is the motivated key.
19. The 2.35 frame lines are on, with nothing essential in the outer 5% of frame.
