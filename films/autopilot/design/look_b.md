# LOOK B: BRIGHT DAY

**Pitch.** *Autopilot* in the idiom of the big story-animation channels: round-headed near-black characters with big white eyes, living in a bright, saturated, flat world with soft cel shading. The style makes the audience feel at home, so when the colour drains out of the world, it drains out of them too.

Style frames (1920x1080, full 16:9 with no letterbox, made for YouTube):

| Moment | Source | Frame |
| --- | --- | --- |
| 01 THE COUNTER | `src/B1_counter.html` | `frames/B1_counter.jpg` |
| 02 THE MIRROR | `src/B2_mirror.html` | `frames/B2_mirror.jpg` |
| 03 THE DOOR | `src/B3_door.html` | `frames/B3_door.jpg` |

Shared helpers are in `kit/look_b.js`: clean vector paths, a metre-based perspective camera, mask-based cel shade and rim for the characters, seamless big eyes, captions and a coloured vignette. The frames use `kit/otm.js` only for its compositor (halation, grain), its seeded noise and its type loader. They make no edits to the shared kit.

---

## 1. The look in one paragraph

Shapes are chunky and clean: no outlines, rounded corners and no cut-paper roughness. Every surface has two tones, a local colour and one cel shadow, and the shadows are coloured (lilac in the morning, deep violet at dusk), never grey. Each shot has one motivated light. The morning sun throws hard window shapes and long cool shadows, and dusk is a low, colourless light. Backgrounds take a gentle depth-of-field blur, so the sharp plane is always the story. The finish is light: grain at 3 to 4.5%, halation only on things that emit light (screens, the sun, windows), and a vignette coloured to the scene (warm plum in the morning, near-black violet at dusk) instead of black. The staging is cheerful and readable, the way the channels do it: objects face the camera, silhouettes read at thumbnail size, and one idea goes in each frame.

## 2. Palette (hex)

**Characters (constant all day)**

| Role | Hex |
| --- | --- |
| Character ink (near-black, violet lean, never pure black) | `#1D1B29` |
| Ink, cel shade / lifted side | `#121019` / `#2E2B40` |
| Eye white / pupil | `#FFFDF6` / `#15131D` |
| Daniel's collar / loose tie / tie stripe | `#FFFFFF` / `#F2B23A` / `#D88D1C` |
| Emily's bobbles | `#FFD23F` |
| Emily's socks (pink stripe / blue spot) | `#FF8FB4` / `#62C3FF` |
| Rabbit / belly / inner ear | `#FFA9C6` / `#FFD6E4` / `#FF7DA7` |
| Blush | `#FF78A5` (60%) |
| **The phone's charging green / glow** | **`#45E27C` / `#A6FFC4`** |

**Morning (B1 kitchen, B2 car)**

| Element | Hex |
| --- | --- |
| Kitchen wall / shade / window light | `#FFE0A0` / `#F5C27F` / `#FFF4D6` |
| Hall walls (cool contrast) | `#C3C4F4` / `#A9A8E6` |
| Floorboards / in sun | `#E8A15E` / `#FFD48A` |
| Front door / glass / brass | `#3A74DA` / `#FFF3CF` / `#F8C24B` |
| Work bag / in sun / shade | `#C27840` / `#EBA25F` / `#9A592D` |
| Counter / cel shadow (multiply) | `#FFF4E4` / `#C9B3D6` |
| Cabinets | `#4B78DA` / `#3961C2` |
| Kettle / shade / highlight | `#F2553F` / `#BE3A31` / `#FF9A7E` |
| Sky (car) | `#5DBBFF` to `#DDF3FF` |
| Street brick / render / doors | `#F0915F` `#FFD7A0` `#EE7C61` / `#2F8FD8` `#FFC93C` `#8A6BE0` |
| Car body (cherry) | `#C8474A` to `#8A2A3A` |
| Cabin (dark frame) | `#3A3243` / `#2A2331` |
| Rear seats / child seat shell / padding | `#A38DBE` / `#FF6F59` / `#C2B0CC` |
| The strip of sun | `#FFF9EC` |
| Vignette | `#5B2C3E` |

**Dusk (B3 nursery car park): every colour of the day, drained toward violet**

| Element | Hex |
| --- | --- |
| Sky bands (top to horizon) | `#29253F` `#352F52` `#443D64` `#5A5278` `#776C8F` `#968AA6` |
| Treeline / nursery wall / painted animals | `#3A3452` / `#5C5373` / `#6E6589` |
| Plywood on the front door / notice | `#9089A3` / `#B9B2C7` |
| Tarmac / far / cast shadows | `#8A7F9C` / `#7A7091` / `#4D446A` |
| Car (the cherry red, drained) / shade / deep | `#8E7889` / `#685770` / `#43384F` |
| Open door / dark glass | `#9C8697` / `#2C2639` |
| The sun in the glass | `#F4F0F8` |
| Caption | `#E3DDEE` |
| Vignette | `#130F1C` |

## 3. Colour script across the day

| Beat | Colour and light |
| --- | --- |
| **Dawn** (6:14 A.M., bedroom) | Lilac room `#8E8CC8` before the sun, with a peach blind-glow `#FFC9A8`. The phone screen is the brightest thing, cool white, and its battery reads **red at 7%**. |
| **Morning** (kitchen, driveway, car) | Full sun, the most saturated part of the film: butter, sky blue, coral, tomato and cobalt, with hard window light and cool lilac shadows. The phone goes on charge and its icon turns **green**: the first appearance of the colour that will be the last. Emily's colours (pink, bobble yellow, coral) are everywhere: on her, on her seat, in her shoes by the door, in the crayon sun on the fridge. |
| **The mirror** | B2: the warmest frame. The coral seat, the pink rabbit and the yellow bobble sit against cool lavender upholstery, with one hard white strip of sun. |
| **Noon heat** (city streets, afternoon) | Bleached: the palette pushed toward white and hot yellow (sky `#F4F1E8`, tarmac `#E8D9B8`). Shadows are short and violet (`#8A5C9E`), the sun is an edgeless white disc, and heat ripples are drawn as wavering bands. No pink, no coral, no bobble yellow anywhere. |
| **The cool office** (8:32 A.M. to 5:37 P.M.) | Refrigerated: aqua `#9FE3EA`, pale ice `#CFEFF0`, fluorescent white `#F5FFFF` and cool grey. The ink characters read crisp and calm. The only warm thing in the building is the desk photo of Sarah and Emily, the one place Emily's pink appears after the mirror. |
| **Evening copper** (car park 5:37 P.M., the drive home) | Saturated copper `#E8894A` and amber `#FFB070` windscreens, long violet shadows `#5B3F6E`. The cherry car glows. Warm, but it is the warmth of tiredness. |
| **"Where's Emily?"** (Daniel's house) | The drain begins on Sarah's line. Saturation drops in steps across the next shots (100 to 60 to 30 to 10%), like a dimmer, through the drive to the nursery. |
| **Dusk** (nursery) | B3: a desaturated violet world. The bright painted animals that blurred past this morning are now grey ghosts. The low sun is colourless. |
| **Silence** (the door, the flash, the end) | Violet sinking toward near-black. The only saturated colour in the whole ending is the **green pulse of the charging icon in the QUICK FLASH**. Back to violet, a long stillness, fade out. |

## 4. Character design

All characters are built the same way: a big round head (1 unit), a soft bean torso, noodle limbs with mitten hands, solid near-black ink with a two-tone cel and a thin rim on the lit side, and big white eyes whose lids do the acting. Eyes are drawn by *subtracting* the lids from the white, so the head itself is the lid and there are no seams.

- **Daniel, 38.** Tall and slightly hunched: 4.2 heads, sloped shoulders, the head sunk forward into them. Small ears. A soft bed-head tuft before his shower (B1), where he wears a T-shirt and pyjama bottoms, shown only as sleeve flares. For the day he wears a shirt with a white collar that sits crooked until Emily straightens it, and a loose mustard tie `#F2B23A`. His eyes are big white ovals with heavy upper lids (a parent's tiredness), small pupils, and a lower-lid line when he is spent. In the last scene his face is never shown: back view, head bowed, no eyes.
- **Emily, 4.** Small and round: 2.2 heads, her head about 0.9 of Daniel's. Two pigtail puffs with sunshine-yellow bobbles, big sleepy eyes drawn as half-moon lids with the pupil resting low, pink blush ovals and a tiny smile. Mismatched socks (one pink-striped, one blue-spotted) and a pink rabbit with one ear up and one worn flat, which flops over her arm. Coral child seat. She is the warmest thing in the film.
- **Sarah, 36, and Priya, early 30s** (not in these frames). Same construction. Sarah has a short bob silhouette and a cobalt work blazer; Priya has a long plait and is always carrying a stack of reports. Neither wears pink, coral or bobble yellow: those belong to Emily.

## 5. Time stamps and the V.O. on screen

- **Time stamps.** Diegetic wherever possible: the alarm screen (6:14), the phone's lock screen (6:17 in B1), the office wall clock (10:18 to 11:43), the laptop clock (5:37). The screenplay's three slugs also appear as a clean channel-style card, top-left: **Archivo Black** 64 px, white, tracked +4, on a soft rounded pill of ink at 60%. The minutes tick in and the card holds for two seconds. "5:37 P.M." arrives tinted copper. There is no card after "Where's Emily?": the film stops telling us the time.
- **Dialogue and V.O.** The channels' caption idiom: bold sentence case, **Libre Franklin 700**, 40 to 46 px, white with a soft dark halo, no box, bottom centre, at most two lines. Speakers are told apart by colour only where it helps: Emily's lines are her pink `#FFC6DA`, and everyone else (Daniel's V.O., the radio, Sarah, Priya) is white. A V.O. line may overlap a cut: in B1, "When did you realise?" carries over from the bedroom onto the phone.
- **After "Where's Emily?"** the captions lose their weight with the colour. They drop to Libre Franklin 500 at 36 px, lilac-white `#E3DDEE`, with a softer halo. The last three V.O. lines ("My phone was on the counter." / "And my daughter was dead." / "Autopilot disengaged.") appear one at a time, alone, in silence, with long holds. "Autopilot disengaged." is the last thing on screen before the fade. Every line is verbatim from the screenplay.

## 6. How Emily's absence is carried after the mirror

1. **The camera stops looking back.** After B2 the film never shows the back seat again. Every later car shot faces forward (windscreen, dashboard, Daniel's hands, the road) or is outside and low, where the rear windows are privacy-dark and hold only reflections. The mirror is seen once more, already re-angled to the traffic: the road behind, no child.
2. **Her colours leave with her.** The morning is full of Emily's three hues: rabbit pink, bobble yellow and seat coral. They are on her, by the door (her tiny pink trainers in B1) and on the fridge (her crayon sun). After the mirror those hues are withheld from the world palette. The streets are bleached, the office is aqua and grey, and the copper evening has no pink. The audience does not notice the absence any more than Daniel does. The single exception is the desk photo he straightens to face him, which we see and he does not read.
3. **Sound agrees.** "No voice comes from behind him": the back of the car is silent in every later shot.
4. **The drain is the reveal.** On "Where's Emily?" the missing warmth becomes total: the whole world loses its colour, not only her three hues.

## 7. At the nursery door (B3)

A locked-off, low, medium-wide shot. We keep our distance. Everything is drained to violet, and the cherry car of the morning is mauve-grey.

- Daniel is **on his knees, his back to us, head bowed**. The near arm hangs, its hand open on his thigh, and the far arm reaches into the car past the open door's edge. His face and eyes are never shown.
- **We do not see inside.** The rear door is open toward the low sun at our left. Its outer face and dark privacy glass are to us, and at this angle the door's free edge lands exactly on the doorway's rear edge, so the door covers the opening and Daniel's body covers the rest. The doorway is painted as flat shadow, so even a sliver would show nothing. There is no seat, no harness, no rabbit and no child, not even in a reflection.
- **The sun sinks out of the glass.** The sun is out of frame behind us. Its reflection in the door's glass is a pale disc already half below the glass's lower edge, the last bright thing in the film.
- **The silent playground.** The empty swings hang dead still at the left, and their long shadows reach across the tarmac to his knees. Behind, the nursery's painted animals are grey, and the plywood on the boarded front door, with its notice, sits far right.
- The caption "My phone was on the counter." sits small and pale beneath him. The only colour left in the ending is the green pulse of the charging icon in the QUICK FLASH that cuts into this shot.

## 8. What all 11 minutes would cost

About 660 s, roughly 110 to 130 shots across 14 locations: bedroom, kitchen and hall, bathroom, driveway, car interior, residential roads, office car park (morning and evening), office, conference room, kitchenette, city streets, the house exterior, and the nursery and its car park.

| Work | Estimate |
| --- | --- |
| Rigs in code (Daniel front, side, back and three-quarter with eye and lid acting; Emily in and out of the seat; Sarah; Priya) | 2 to 3 weeks |
| Sets as parametric perspective scenes (like B1 and B3; one bright day set costs more than a dark one, because the light shows everything) | 4 to 5 weeks, 1 to 2 days each |
| Colour script, animatic, caption and time-card system, the colour-drain grade | 2 weeks |
| Shot animation: limited animation on twos (12 fps characters, 24 fps camera and parallax); eyes and posture carry the acting | about 70 to 80 person-days |
| Render at 1080p24 (about 15,840 frames at 1 to 2 s each in headless Chromium, run in parallel) | under a day of machine time |
| **Total** | **About 4 to 5 months for a lead plus two animator-coders.** This excludes sound and score, which can reuse the *One Too Many* pipeline. |

Why it is cheaper per minute than a painterly look: flat cel shading, reusable rigs, eye-driven acting and simple props. The expensive parts are the number of daylight locations and keeping the morning's warmth consistent from shot to shot, so the drain lands.
