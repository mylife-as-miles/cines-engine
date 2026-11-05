# LOOK C: THROUGH GLASS

**Pitch.** Every shot is framed through a pane (a screen, chrome, a mirror, a windscreen, a window), so the film is literally about what we look at and what we don't. In the end, the same glass that hid Emily all day is the glass we watch her father through.

Style frames: `frames/C1_counter.jpg`, `frames/C2_mirror.jpg`, `frames/C3_door.jpg`. Sources: `src/C1_counter.html`, `src/C2_mirror.html`, `src/C3_door.html`. Helpers: `kit/look_c.js` (palette, perspective camera, glass compositor, environment-mapped chrome, captions). Full 16:9 (1920x1080) with no letterbox and no slate, Canvas 2D, deterministic.

**The author chose this look**, with three changes, now in the frames: no black bars (the frame is full 16:9 and every set runs to its edges), no title or scene-heading text on screen, and the subtitles sit in the picture the way they do in Look B.

## The grammar

- **Two scenes per shot.** Every shot has a scene *through* the pane and a scene the pane *reflects*. Black glass shows only what is lit, so reflections are true black mirrors, not overlays. Chrome is environment-mapped from the room it stands in.
- **The pane's own artefacts are the texture:** privacy tint, glare streaks, backlit dust, wiper arcs, the windscreen's frit dot-matrix, a day/night mirror's prismatic ghost, a refracted lip at a glass edge. There is no paper and no outline. The finish is fine grain, halation on light sources, and a teal vignette.
- **Graphic realism.** Flat shapes, three values per surface, posterised glare rings around the sun, true perspective (sets are laid out with a pinhole camera), and one motivated light per shot.
- **Warmth lives behind or inside glass.** Interiors are cool teal. The amber sun and the life of the house reach us as reflections, through windows, or in a mirror.

## Palette

| Role | Hex |
|---|---|
| Teal shadow scale | `#081011` `#0D181A` `#142427` `#1F3538` `#30494A` `#506A69` |
| Teal light scale (glass, distance) | `#7A918C` `#A9BAB4` `#CBD6D0` `#E3E9E3` |
| Amber (sun, wood, lamplight) | `#24170F` `#563720` `#9A6535` `#CF9A5C` `#EBC68D` `#F6E3BC` `#FFF6E6` |
| Copper (evening, dusk) | `#B25F2D` `#E4894A` (dusk sky `#232D38` → `#6A5A5C` → `#E39A5C`) |
| Captions: white, V.O. bone, halo | `#FFFFFF` / `#E6E0D2` / `rgba(4,10,11,0.6)` |
| Daniel skin (light / mid / shade), hair | `#BE8C6C` `#9C6D55` `#5F3F33`, `#15100D` |
| Emily skin (light / mid / shade) | `#D6A47F` `#B27E62` `#7B5240` |
| **Phone green** (the key object, the only recurring accent) | `#7BE6A0` |
| **Emily's yellow** (cardigan, socks, her dialogue type) | `#E0B34F` |
| The rabbit / its worn ear | `#CBBDA2` / `#9C8E78` |

## Colour script

- **Dawn (6:14, bedroom).** A teal-black room. The phone's cold white screen is the only light, and its glass is the first pane of the film.
- **Morning (kitchen, bathroom, breakfast).** Cool teal interiors backlit by north-west windows. The east-facing front door blazes amber, but we only ever see that sun as a reflection: in the phone's black glass, the kettle's chrome, and the shower glass, where steam burns it off. (C1)
- **The mirror (driveway).** A warm white windscreen with the sun in the frit's dot-matrix. Through the mirror, the cabin is cool teal, crossed by one hard white band. (C2)
- **Noon heat (city streets, through the windscreen and shop fronts).** Bleached cream-white. Heat shimmer is drawn as refraction ripples in the glass. Glare streaks stand in for shadows, which shrink to slits.
- **The cool office.** A refrigerated teal-grey behind sealed, blue-tinted glazing. The outside world is a white rectangle, and fluorescent tubes reflect in the laptop's screen.
- **Evening copper (office car park, 5:37 P.M.).** Every windscreen turns copper. All glass now reflects and nothing can be seen through it, including the rear window of Daniel's car.
- **Dusk (nursery).** A copper sun, a violet-teal sky, and long teal shadows on copper tarmac. Through the car's privacy tint the same world turns darker and colder, and the frame shows both at once. (C3)
- **Silence.** The sun's last sliver leaves the glass and the frame drops to teal-black. The only colour left is the phone's green pulse in the flash, seen in the black glass of its own screen.

## Characters

- **Daniel, 38.** Tall, with a parent's stoop and short dark hair greying at the temples. Tiredness sits around the eyes. He is built from flat shapes in three skin values, rimmed by the shot's one light. His face stays quiet: downcast or closed eyes, and never a cartoon expression.
  - In the morning (C1, before his shower) he wears a grey tee and pyjama trousers and goes barefoot.
  - By day he wears a pale-blue oxford shirt and a navy tie. The collar is crooked until Emily straightens it, and it is crooked again at the door (C3's silhouette).
- **Emily, 4.** A big head on a short body, soft dark curls with a puff at the crown, heavy sleepy lids and full cheeks. She wears a mustard cardigan and uneven socks (one up, one slouched) in her yellow. Her rabbit is oatmeal felt with button eyes and a stitched nose: one ear stands up, the other is worn almost flat, darker and shiny with handling.
- **Sarah and Priya** use the same construction (not drawn in these frames).
- **This look meets its people through glass.** Figures are mostly reflections (Daniel in the phone, C1), images in a mirror (Emily, C2) or silhouettes (Daniel, C3). That is both the idea and a production saving.

## Time stamps and V.O.

- **Time stamps are diegetic and always read off glass:** 6:14 on the phone's alarm screen, 8:32 on the dashboard clock reflected in the windscreen, and 5:37 in the corner of the laptop screen before the lid closes. The conference-room clock (10:18 to 11:43) is seen in the glass of a framed print. C1's screen shows the 7% charge, not a clock.
- **No title or scene-heading text appears on screen.** The only words are the subtitles and what the world itself shows (the phone, the clocks, the nursery's notice).
- **Subtitles sit in the picture, as in Look B** (`LC.caption`): sentence case, Libre Franklin, bottom centre, a soft dark halo and no box, at most two lines.
  - Scene dialogue is only ever type, so it is set bold (700), 40 to 46 px. Daniel's lines are white and Emily's are in her yellow (C2: "Better?" / "Mm-hmm.").
  - Daniel's V.O. is voiced, and its caption is the lighter 500 weight in bone, 36 to 42 px (C3: "My phone was on the counter.").
- "Mm-hmm." is the last yellow type in the film. From then on, every word on screen is cold.

## How Emily's absence is carried after the mirror

- **The mirror stays in shot.** After Daniel "adjusts the rear-view mirror to see the traffic", the mirror appears in every car shot and shows only the road behind. The audience has learned that this frame means "the back seat", and it simply never shows her again.
- **The car's rear glass only reflects.** From outside, the rear windows always give back sky, office blocks or copper. That is how glass behaves in daylight, and it is the alibi: neither we nor Daniel can see in, and nobody thinks to look.
- **Her colour leaves with her.** Her yellow and her yellow type go, and the film's warmth carries on in the sun on glass, so nothing reads as missing. The phone's green is the only accent that keeps returning.
- She is never seen in the car again: no seat, no strap, no rabbit, no sock.

## At the nursery door

- **Before the door opens.** The dark rear passenger window is a pure mirror: "From where he stands, he can see only his own reflection." The grammar closes here, because the glass that showed everything else now shows him only himself.
- **C3, THE DOOR.**
  - We look through the glass of the open rear door, the same privacy glass that hid her.
  - The camera crouches against the car's flank, so the doorway is seen exactly edge-on and there is physically nothing to see into. The door stands square to us while the flank rushes away behind the hinge, and the front door's glass, at that grazing angle, is a dark mirror.
  - Beyond the pane, Daniel kneels as a silhouette against the sun, head bowed, his near arm reaching into the car past the window frame.
  - The camera's eye sits at the beltline, so the horizon falls on the window's lower edge and the sun sinks out of the glass.
  - Outside the glass, untinted and copper, the empty swings hang still and their long shadows rake across the tarmac.
- **Rules.**
  - No reverse angle from inside the car.
  - No pane ever shows the interior.
  - No face at the door: the grief is in the posture and the light.
  - When the sound goes, the light goes with it, and we hold on the darkening glass.

## Cost to build all 11 minutes (estimate)

**Scope.** Roughly 120–140 shots at an average of about 5 s each, around 14 sets, and 4 characters.

**What drives the cost.** The glass layer: every shot is two scenes plus the pane's artefacts, which roughly doubles layout compared with a single-plane look. Much of it is procedural and reusable, though. The camera, chrome environment mapping, glass compositor and matte type in `kit/look_c.js` already exist, and sets are reused across shots (the kitchen appears four times, the car interior three).

**Animation load is light:**
- most shots are locked-off or slow push-ins;
- reflections slide against the through-layer, which is cheap and very convincing;
- characters often appear as reflections or silhouettes, which cuts character animation;
- holds suit the film's stillness.

**Team.** A director, an art director (this look), 2 layout/background artists, 1 character animator, 1 compositor/TD (glass and type pipeline), and sound.

**Schedule (about 18 weeks):**

| Phase | Time |
|---|---|
| Boards and animatic | 3 weeks |
| Set and character build | 5 weeks |
| Shot production | 8 weeks |
| Sound, grade and finish | 2 weeks |

**Budget.** Roughly £160–220k at UK independent rates. The figure assumes the existing kit and is mostly labour. Render cost is negligible: a still renders in about 3 s at 1080p, and a full 24 fps pass of 11 minutes (about 16,000 frames) is a few hours on one machine.
