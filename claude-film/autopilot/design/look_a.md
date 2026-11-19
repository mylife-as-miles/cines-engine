# AUTOPILOT · LOOK A · WHITE HEAT

**Pitch.** Cut paper in daylight, where the sun is the antagonist. It is drawn as hard white planes that eat into the paper. Shade is where things are kept, and where they are forgotten.

Style frames: `frames/A1_counter.jpg`, `frames/A2_mirror.jpg`, `frames/A3_door.jpg` (sources in `src/A*.html`, helpers in `kit/look_a.js`). All three are 2.00:1 inside a 1920x1080 frame.

## The language

- **The sun is a cut, not a gradient.** Each patch of sunlight is a flat white plane (`#FFFDF7`) with hand-cut edges. Around it sit one or two posterised bands: a warm fringe and a bleached band with a printed dither seam. Its bloom is tinted warm (`#FFE2B8`), so the white reads as *hot*, not merely bright. Where a sun plane lands on something, it takes that edge. The kettle's sunlit side is eaten white, and the window's glare eats Daniel's leading edges. The bloom is masked by whatever stands in front of the light, so a plane eats the edges of the things around it and never washes over them.
- **One motivated light per shot: the sun.** It may come through several apertures, but always from one direction, with matching shadows. Frame 1 traces its full path: through the stair window, past Daniel, through the opening, onto the worktop. A faint hard-edged vellum plane makes that path visible.
- **Shade is cool paper,** posterised in two or three flat steps. It has no black, only blue-grey. The film's two hiding places are both shade: the phone sits in the kettle's shadow, and Emily leans into the shade behind the headrest.
- **Paper craft.** Every shape has the kit's hand-cut edge and stacks as a layer with a few pixels of offset shadow. Grain, fibre, halation and a light tinted vignette are applied by the kit's compositor. Frames are letterboxed to 2.00:1.

## Palette (hex)

| Role | Values |
|---|---|
| The sun (white planes) | `#FFFDF7`; warm fringe `#CDBFA6` / `#EDE4D3`; bloom `#FFE2B8` |
| Bleached paper (noon) | `#F6F1E7` `#E9E0D1` `#D8CEBD` |
| Morning shade (cool) | `#C3CBCC` `#97A4AA` `#66747D` `#3B4851` `#1B242B`; kitchen wall `#2E3A43` |
| The office (refrigerated) | `#D2E5DF` `#93B9B1` `#4F7C75` `#1D3735` |
| Evening copper | `#F6CE93` `#E7A061` `#C27445` `#8E4A2E` `#4A2419` |
| Dusk | `#5C557A` `#3D3A5E` `#2E2843` `#24233E` `#16162A` |
| **Rose: Emily only** | `#E8A3AF`, light `#F5CBD1`, shade `#B97B88` (her socks, her rabbit; nothing else, ever) |
| **Green: the phone only** | `#62E394`, hot `#C9FFD9`, deep `#1F8F52` (the charging pulse) |
| Cold type | `#D6E4EC` `#9DB3C1` `#5F7A8B` |

## Colour script across the day

1. **Dawn, the bedroom (6:14 A.M.).** Blue-grey shade (`#3B4851`). One thin white blade from the curtain gap lies across the bed, and the empty side of the bed sits in it. The phone screen reads BATTERY 7% in cold type. There is no green yet.
2. **Morning: kitchen, bathroom, driveway, car.** The house is in cool shade with selective white planes: the stair window, the front-door panes, the worktop patch, the shower's steam glass burned white. The two accents are both alive here: Emily's rose and the phone's green. **Frame A1** is the green; **frame A2** is the rose, the last time it appears in the film.
3. **Noon heat: roads, the empty kitchen, city streets.** The world bleaches toward white. Sixty to eighty percent of every frame is white plane, and shadows shrink to hard slivers under kerbs, the bus shelter and the dog. The empty kitchen gets "afternoon light on the counter". The phone, screen black, finally sits *inside* a white plane, which has found it. The car in the office car park shows once, from the front: its windscreen is a white plane, and its rear glass is too, burned unreadable.
4. **The cool office.** Refrigerated blue-green with no sun planes indoors. The heat stays outside the sealed windows as flat white rectangles that never touch the floor. This is the only place in the film where the day is comfortable.
5. **Evening copper (5:37 P.M. onward).** The white planes turn copper and lie down long, and every windscreen in the car park becomes a copper plane. The shadows stretch again, now warm-edged and violet.
6. **Dusk, the nursery.** The copper contracts into one last pool around the car while the far car park and the lower wall fall into dusk violet. The sky is flat violet-indigo bands, deliberately free of any pink.
7. **Silence.** The copper drains. The last white of the film is the sun's reflection in the open door's glass, a half disc sinking under the beltline (**frame A3**). Then comes one quick flash: the phone's green pulse on the counter, the only colour left in the world. We fade to `#16162A`.

## Characters

Figures are flat paper cut-outs built from three to five pieces of coloured paper (skin, hair, shirt, trousers). They are posterised into lit and shade versions, with a rim cut on the side facing the sun. Faces are reduced to a few precise cuts and are never cartoon.

- **Daniel, 38.** A long, slightly stooped silhouette whose shoulders carry the day. He has short dark hair, kind but tired. In the morning he wears a T-shirt and sleep trousers, barefoot on the stairs (A1). By day he wears a white shirt and a dark tie, and the collar sits crooked in the morning until Emily straightens it. The camera mostly sees him from behind or in lost profile: his face is turned toward what he is doing, never toward us. At the door his face is turned into the car and away from the audience. His grief is in the kneel and the reaching arm.
- **Emily, 4.** A big round head on a short body: a soft bob with a straight fringe, mussed by sleep, and full peach cheeks (deliberately not rose). Her face is two cuts: a closed-eye lid line and a small slit of a mouth. She wears a pale T-shirt and uneven rose socks, and holds a rose rabbit with one ear upright and one worn almost flat. She is the only warm, saturated thing in any frame she is in. She is drawn tender, never ominous.
- **Sarah, 36, and Priya, early 30s.** Built the same way. Priya lives in the office's blue-green. Sarah is seen at the front door in the evening copper, and her "Where's Emily?" is the first line spoken in copper light.

## Time stamps and V.O. on screen

- **Time stamps** (6:14 A.M., 8:32 A.M., 5:37 P.M.) are large, cold type: Oswald Light, 150 to 200px at 1080p, `#D6E4EC` at 75 to 90 percent. The digits are big, with A.M./P.M. as small tracked caps on the same baseline. Each stamp sits in the deepest shade of its frame and never on a white plane. At noon it squeezes into whatever shade is left. 6:14 A.M. lands on the alarm and holds across the cut into the kitchen, so A1 carries it; it clears as Daniel climbs out of frame. Each stamp holds about three seconds and cuts out without a fade.
- **V.O.** is set small (Oswald Light, about 38px, cold `#D6E4EC` at about 80 percent), one line at a time, low in the frame's shade. It is word for word from the screenplay, as in A3: "My phone was on the counter." It appears with the voice and goes with it. Dialogue is spoken, not typeset.

## How Emily's absence is carried after the mirror

- **Rose leaves the film for good after A2.** No later frame contains it: not a prop, not the painted animals on the nursery wall, not a sunset. The dusk palette is built to avoid pink. Nobody will consciously miss a colour, which is exactly the point. The absence is the clue nobody notices, and on a second viewing it is unbearable.
- **The back seat leaves the frame.** After the mirror, the car is shot only from the front and side or from the driver's seat looking forward. The rear glass is always a burned white plane (noon) or a dark reflection (evening), never transparent. The mirror is now angled to the traffic and shows only road.
- **The white strip recurs, empty.** The hard strip of sun that crossed her empty seat wing in A2 returns on ordinary empty things, such as the office chair Priya leaves and the passenger seat at 5:37. The audience feels a rhyme without knowing what it rhymes with.
- **The green keeps time.** The phone's pulse is the only accent the audience is allowed to keep watching, and it is the wrong thing to watch.

## What the look does at the nursery door (A3)

- **Staging that cannot reveal.** The camera sits low at the car's front-right quarter, looking back at the open right-rear door (behind the driver's seat). From this angle the door's outer skin covers the whole doorway. I verified this with a debug render in which the opening is painted magenta: zero pixels remain visible in the final composite (`src/A3_door.html?debug`). Daniel kneels just past the door's free edge, and his near arm goes behind it into the car. Nothing of the inside is drawn, ever.
- **Light.** The last copper sun lies full on the door's face, so the brightest plane in the frame is the door, not Daniel. He kneels in the dusk with only a thin copper rim on the side facing the door. The door glass is a dark mirror of the west behind us. In it are the empty swings against the sun, and the sun's white half disc sinking out of it. That is the last white plane of the film: the antagonist leaving.
- **The playground stays off-frame.** The swings never appear in person. Their long shadows reach across the tarmac, the chains' shadows run through Daniel's knees, and the empty seats' shadows lie beside him. The boarded front door and its notice sit small in the background.
- **Restraint.** There is no rose, no body, no distress, and no face for the audience to read. The dignity is in the distance and the kneel, and the silence is in the flat, still horizontal bands.

## Cost to build all 11 minutes

- **Scope.** About 100 shots across 14 sets: bedroom, kitchen (morning and afternoon), bathroom, driveway, car interior, roads, office car park, office, conference room, kitchenette, city streets, house exterior, nursery front and nursery car park. There are four characters plus a few extras.
- **Already built.** The set builder exists: a pinhole camera with near-plane clipping, cut-paper planes, and sun planes with masked bloom (`kit/look_a.js`). So do the lighting language, the type system and this palette.
- **Still to build** (about 3 person-weeks):
  - Articulated cut-out rigs for Daniel and Emily: a back and three-quarter view, a seated driver, a kneel, and Emily in the child seat.
  - Sarah and Priya.
  - The sun-plane path animation, so planes slide and stretch through the day.
  - The colour-script tables driven by time of day.
  - The vellum light paths.
- **Per shot.** About half a day on average. Simple inserts (phone, clock, stamps) take an hour or two. The mirror, the door and the copper car park take two to three days each. That comes to about 10 person-weeks for one animator-coder.
- **Finish.** Type, the flash-cut grammar, the timing pass and conform take about 2 person-weeks.
- **Total.** About 15 person-weeks for one person, or about 8 calendar weeks with two people.
- **Render.** Deterministic headless Canvas runs at about 1 to 2 seconds per frame. At 24 fps the 11 minutes come to about 15,800 frames, or roughly 5 to 9 CPU-hours per full render, so it is effectively free and fully repeatable.
