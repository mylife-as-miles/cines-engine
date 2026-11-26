# Movement I, cut v8: foley and effects review

One of five sound reviews of `out/review/I_bell_v8.mp4`. Review only: nothing in the mix, tools or records was changed, nothing was generated, nothing was spent. I cannot hear. Each statement is marked **M** (measured), **E** (earshot), **G** (Gemini, sound only, with how many passes agreed) or **I** (my inference). G was erratic on quiet single layers (it invented gym floors and trains), so only its repeated answers are counted. Times are film seconds; frames are film frames at 24 fps.

## 1. Verdict

Sync is this track's strength and believability is its weakness: of the video model's audible effects only the three swallows and the grab at the wall pass a listening check (its voices pass for now), and the three that carry the valley's story (the ox, the bowl on the wall, the mountain's roar) fail it. The author is right, and the fault is wider than the model: the cleaning turned the model's hiss into a fluttering residue, and the locally made winds, landing, bell and arrival thud do not pass either. Rebuild the valley's effects from nothing on the frames the model's track already found, and fix two edit faults (26.5 s and 49.7 s) that cost nothing.

## 2. Scores

| Axis | Score |
| --- | --- |
| Realism above (the cathedral) | 4 / 10 |
| Realism below (the valley) | 2.5 / 10 |
| Sync | 7.5 / 10 |
| The model's own audio (10 = it does no harm) | 3 / 10 |
| Effects overall | 3.5 / 10 |

## 3. Problems, worst first

1. **54.4–57.1, the roar (model, raw).** The movement's payoff does not read as rock. E: "rockslide" no match (z +0.4 alone, +1.9 in the mix), "a jet engine" 93–99 %. G: engine, motor, buzzing phone, creature; a rockfall in 0 of 12 passes. M: mono (correlation 0.997), 95 % of its energy under 1 kHz, its low band pulsing at 3.4 Hz, the rate of his boots. The synthetic thud before it is a sine sweep: E "sub bass drop" 99 %. Fix: R1.
2. **35.15–36.5, the ox and the crows (model).** The loudest effect below: −15.3 LUFS, 2.5 LU *over* the Hierophant (M). E: an ox weak (z +2.2), "a lion growling" 79 %; wings no match. G: an ox or cow in 0 of 9 (dog, big cat, creature, a man's cough). The raw take reads the same: this is the model, not the cleaning. In sync. Fix: R2, R3, 8–12 LU under the dialogue.
3. **23.35, the bowl on the wall (model).** The story's object lands as a box lid (E 96 %); G a wooden bowl in 0 of 12. M: −18.7 LUFS, level with the dialogue; sample peak −3.7 dBFS, third highest in the film. On its frame. Fix: R4.
4. **18.46, 19.26, 20.20, the hoe (model).** These are the far farmer's strokes, in sync, not the girl's steps. A man the size of a match head sounds like a click at the lens: E "a stick snapping" 100 %; G in the mix "blade drawn, metallic click, latch" 3 of 3. A 2.4 kHz squeak at 20.2 is in the raw take (M). Her own steps cannot be made out. Fix: R5, R6.
5. **49.73–50.4, a rumble with no cause (edit).** The model's layer opens on the cut to the wall and lets in the last 0.7 s of the model's rumble for the fall: −20.6 LUFS, 8–13 dB over the bell note (M). It breaks the designed silence four seconds before the sound arrives. Fix: keep that layer shut until 50.45.
6. **26.49, a reverb tail with no voice (edit).** The hall tail of "bring down", chopped at 18.80 in 40 ms, returns under Serath: digital silence to −28 dBFS in 20 ms, ringing 3.4 s, the answer's own partials (M). E: "a big drum hit". Fix: drop the dialogue stem there; let the tail ring out over the vale.
7. **The valley's wind (local, synthetic), about 28 s.** E: "static white noise hiss" 68–95 %, realness 0.02–0.08. G: ocean surf 3 of 3. Fix: R17.
8. **27.54–29.25, the seal (model and local).** Four transients in 0.4 s (the take's click on the touch, three bumps from the generated squelch) and two ticks 80 ms apart on the lift (M). E: press no match, lift "camera shutter click" 100 %. G: wax in 0 of 12; "cocked firearm, latch, ratchet" in 5. Fix: R12, R13.
9. **42.4 and 45.8, size (local).** The landing passes E with the cue sheet's words (z +6.0), but "a wooden crate dropped" beats the ninety-ton wording (79 %) and G hears a door, 6 of 6. The bell: G "singing bowl, meditation bell, chime" 4 of 4; a 191.6 Hz strike note belongs to a bell of about 8 tonnes (I). Fix: R14–R16.
10. **Cleaning residue under all valley Foley.** M: between events the 1–4 kHz floor flutters three times more than in the raw take. E: "being underwater". G: squeaks, 6 of 6 on the mixed vale. Fix: cut kept events from the raw take with a gate.
11. **The run's boots (model).** G: shoes on a hard floor, 6 of 6; thin (M). Fix: R11.

## 4. What works and must be kept

- The frames. Press 661, lift 699, landing 1018, bowl 559–560, the hoe, the ox's head: each within about a frame. The stroke is up to a frame late (contact on frames 1097–1098, sound at 45.76): move it to 45.75.
- The three swallows (E strong, z +4.7; +5.4 raw) and the grab at the wall (E strong, z +3.7).
- The silences: before the landing (−40.7 LUFS), the water, the dust, the fall itself.
- The voices, which pass for now: every word right in 6 of 6 G passes, three of them in the mix; E "a man speaking in a huge cathedral" z +4.7. The answer is clear but small (G: "a group" 5 of 6, "one woman" once) and E prefers "synthetic robotic voice" to a crowd: thicken it (R20), do not replace it.
- The whoosh (E z +4.1), and the stroke 6.9 LU over the dialogue.

---

## Appendix A. Inventory, in order

Source: **model** = the video model's own audio; **SA** = made locally with Stable Audio 3.0 Small; **synth** = synthesis; **lib** = CC0 or earshot catalogue.

| Film time (s) | Sound | Layer | Source | Believable? | Sync |
| --- | --- | --- | --- | --- | --- |
| 0.50 | Opening stroke | `bell` | synth, with the model's strike 15 dB down | a bell to E (z +4.3, 72 % against gong); G small bell or gong 2 of 2 | none needed |
| 0–17.7 | Altitude wind | `cathedral_beds` | synth | no: see appendix D | |
| 3.75–17.7 | Crowd presence | `cathedral_beds` | SA | reads as people talking (E; G "distant chatter" 3 of 3); very low | |
| 4.0–19.0 | Q01's room and its own low drone | `dialogue_and_cathedral_production` | model | G "continuous low drone" under the lines, 6 of 6 | |
| 5.95–10.31 | Line 1 | same | model voice, local hall | yes | lip sync not checked |
| 11.72–12.76 | Sleeves | `cathedral_effects` | SA | E no match; −48 dBFS, inaudible | |
| 14.30–15.84 | Line 2 | `dialogue…` | model | yes; E leans "robotic" 65–80 % (a known bias of the ear model) | |
| 16.32–18.80 | The answer | same | model | intelligible; small; chopped at 18.80 | |
| 18.46, 19.26, 20.20 | The hoe, and a squeak at 20.2 | `vale_production_seedance_cleaned` | model, cleaned | no | on the strokes, as far as a tiny figure shows |
| 17.9–20.6 | The girl's steps | same | model | not readable: seen, not heard | |
| 18.0–25.5, 29.75–39.0 | Ground wind | `vale_wind_synth` | synth | no | |
| 21.28, 21.52, 22.03 | Three swallows | `vale_production…` | model | yes (E) | bowl at his mouth |
| 22.35–22.9 | His breath out, a low grunt | same | model | a voice to G (6 of 6); E "bubbles underwater" | as he lowers the bowl |
| 23.35 | Bowl on stone | same | model | no: box lid; too loud | frames 559–560; sound +1 frame |
| 24.2, 25.0 | Boots going away | same | model | weak (z +2.4); quiet | feet out of frame |
| 25.33–25.75 | Paper, the take's own (FX-02a) | `cathedral_effects` | **model** (the brief's table does not list this one) | E cloth 90 %; buried | by construction |
| 25.35–26.76 | Paper | same | lib | weak (z +2.2) | |
| 26.49–29.9 | Hall tail of the answer | `dialogue…` | model voice, edit fault | a sound with no cause | |
| 26.5–30.0 | Q02A air | same | model | cannot be told from the tail above in this layer; low | |
| 27.555 | Press: the take's click (FX-03b) | `cathedral_effects` | model | E mouse click 91 % (raw) | on frame 661 |
| 27.70, 27.845, 27.95 | Press: squelch (FX-03a) | same | SA | three bumps | fullest at 27.85, not at 27.69 where the ring is down |
| 29.115 | Lift tick (FX-04a) | same | SA | camera shutter | on frame 699 |
| 29.21 | Lift, the take's own (FX-04b) | same | model | a second tick | 2 frames late |
| 32.25 | The ring on the water | none | | silent by the approved prompt | |
| 35.15–35.7 | The ox | `vale_production…` | model | no | onset as the head starts up (frames 842–844) |
| 35.7–36.45 | Wings | same | model | no | lift-off (frame 851) is under the grunt; peak at 36.15 as they land |
| 39.4–40.0 | Paper raised, sleeve | `cathedral_effects` | lib, SA | fine, low | |
| 40.64–41.44 | Timber strain | same | SA + lib | weak (z +2.1) | |
| 42.39 | The landing (FX-07a), with the take's thud (FX-07b) | same | SA + synth sub; model thud 10 dB under | not for size | frame 1018 |
| 42.49–43.74 | Chains | same | SA + lib | with the words yes (z +4.5); unprompted "coins, door" | |
| 43.25–43.8 | Grit | same | synth | cannot be told from the chains | |
| 43.72–45.77 | Rope, timber, hush (DX-07) | `dialogue…` | model | E strong (z +3.4); −41 dBFS, barely there | |
| 43.84–44.94 | Rope creak | `cathedral_effects` | lib + SA | yes (z +3.4), knocky | |
| 45.36–46.06 | The swing | same | synth | yes | apex on the contact |
| 45.76 | THE STROKE | `bell` | synth, with the model's strike 15 dB down | a bell at the hit (97 %); small | 1 frame late |
| 46.2–53.0 | The note "from far above" | `bell` | synth, low-passed | E gong 99 %; realness 0.3 | arrives at once, while the mountain's sound takes 8 s |
| 46.5–57.25 | Ground wind | `q03b_wind_synth` | synth | no | |
| 49.73–50.4 | Tail of the model's rumble for the fall | `q03b_production_seedance_cleaned` | model, edit fault | a sound with no cause | |
| 50.67 | A low knock | same | model | unexplained; could pass as his boots off screen | |
| 51.1 | The bowl taken | none audible (−46 to −39 dBFS) | | seen, not heard | |
| 51.69, 51.97 | He takes her: boots, cloth | same | model | yes (E), with a squeak | he enters on frame 1243 |
| 52.6–57.1 | The run: boots every 0.31 s, breath | same | model | no: thin, hard floor | feet out of frame; a crude track of his head gives the same cadence |
| 54.36 | Arrival thud | `q03b_arrival_thud_synth` | synth | no | |
| 54.4–57.13 | The roar | `q03b_roar_seedance_raw` | model, raw | no | |
| 57.13–64.1 | The note, the gloved applause, air | `bell`, `cathedral_effects`, `cathedral_beds` | synth, SA, synth | applause yes, gloved no | |

M, all the model's audio: the takes carry AAC at 32 kHz and about 130 kb/s, so nothing above 16 kHz; the local layers run to 20 kHz and more. The model's layers are near mono (correlation 0.97–1.0) under winds that are fully decorrelated (0.04). No clipped samples in the raw takes.

## Appendix B. The model's sounds ranked, most harmful first

1. The roar (54.4–57.1): the climax, and nothing in it says rock.
2. The ox (35.15): loudest effect below, wrong animal.
3. The bowl on the wall (23.35): the story's object, wrong material, as loud as the dialogue.
4. The hoe and the squeak (18.5–20.3): close clicks from a distant man, 7.7 LU under a sermon.
5. The rumble's tail at 49.7: breaks the designed silence.
6. The press click and the take's own lift (27.56, 29.21): with the local squelch they make a ratchet.
7. The residue the cleaning left under everything below.
8. The run's boots (52.6–57.1).
9. The answer: a small group, and its tail chopped at 18.80 and returning at 26.49.
10. Boots going away; the knock at 50.67; Q01's drone under the lines.
11. Harmless or good: the swallows and the breath, the grab, the take's paper, thud and strike, the hammer's production sound (all buried or passing).

**What the author is most likely hearing:** the first vale passage and the ox. From 18.4 to 23.4 s there is only wind under four exposed model sounds (clicks, a squeak, gulps in a watery residue, a loud clack), and the ox is louder than anyone speaking. The roar is the next candidate: it is the one model sound left unprocessed.

## Appendix C. The replacement list

Level is the loudest 400 ms in the mix, given as LU under line 1 (line 1 is −17.8 LUFS). Check rule, the handbook's: the description beats every alternative and z ≥ 3, or holds 60 % and twice the best alternative. Prompts are untested: I was told to make nothing.

The prompts carry no "no music, no voices". The assignment asked for that ending, but the production's own handbook (`sound.md`, section 3) and `tools/sfx_make.py` (line 714) both say this model's text encoder ignores negation and that "no music" can bring music in. Add it if the lead prefers; I advise against. The handbook also says this model is poor at tiny Foley, so each small sound has a fallback from earshot's catalogue (`earshot make`, local, free).

| # | Sound | Sync (film s, frame) | Stable Audio 3.0 Small SFX prompt, or recipe | Generate | Level and treatment | earshot check: description against alternatives |
| --- | --- | --- | --- | --- | --- | --- |
| R1a | The arrival: the boom | onset 54.36 (frame 1305) | "One enormous distant rockfall boom heard across a wide valley, a deep heavy impact that rolls like thunder and dies slowly, outdoors, far away". Fallback: `explosion/far` or `thunder/roll` at 0.8 speed | 6 s | about −16 LUFS (2 LU over line 1, 5 under the stroke); high-pass 28 Hz, low-pass 2.5 kHz; widen above 200 Hz | "a huge rockfall boom far away" against a kick drum, a sub bass drop, a door slam, a close explosion |
| R1b | The arrival: the body | 54.6 to the cut at 57.125 (frame 1371) | "A mountainside collapsing far away: thousands of tons of rock and boulders sliding, tumbling and grinding, a continuous heavy roar of stone with cracks and knocks inside it, outdoors, heard across a valley" | 10 s, two seeds layered for width | rising from −22 to −15 LUFS; low-pass 4 kHz; stereo; cut dead on the cut, as designed | "the roar of a rockslide, an avalanche of rock" against a jet engine, strong wind in a microphone, a train passing, thunder, ocean waves |
| R1c | The arrival: the pressure | 54.36 | Recipe, no generation: keep the 80→34 Hz sweep 6 dB lower and add a 0.3 s burst of noise band-passed 35–140 Hz (8 ms attack, 0.35 s decay) and partials at 38 and 54 Hz detuned ±0.7 Hz. Or drop it once R1a exists | | under R1a | with R1a: "a deep distant boom" must beat "a kick drum" and "a sub bass drop" |
| R2 | The ox | onset 35.15 (frame 844), over by 35.7 | "A big ox startled, snorting and giving one short deep grunt, breath blown hard through the nose, close, outdoors in an open field". Fallback: `cow/moo`, first 0.6 s at 0.8 speed | 3 s, use 0.6 s | 8 LU under (it is 2.5 over); high-pass 70 Hz; dry | "an ox or a cow grunting, snorting" against a lion growling, a man coughing, a dog barking, a pig oinking |
| R3 | The crows | lift-off 35.46 (frame 851), busiest 35.55–35.9, settling 36.25–36.45 | "Four crows bursting up off the ground together, heavy wings flapping hard, then settling again, outdoors, a few metres away". Fallback: `wings/flap` three or four times, 60–120 ms apart, speeds 0.9–1.1 | 3 s | 12 LU under; low-pass 7 kHz | "birds taking off, wings flapping" against cloth flapping, a whoosh, applause, paper rustling |
| R4 | The bowl on the wall | 23.31 (between frames 559 and 560) | "A heavy wooden bowl half full of water set down on a wet flat stone, one dull woody knock with a low thump, close, outdoors, quiet". Fallback: `knock/hollow` at 0.6 speed, with `dumbbell/place` 10 dB under it, low-passed 300 Hz | 2 s | 10 LU under (it is 0.9 under); sample peak no higher than −14 dBFS; dry | "a wooden bowl set down on stone" against a box lid closing, a metal pan clanging, a door knock, a plastic object dropped |
| R5 | The hoe | 18.46, 19.26, 20.20 (frames 443, 462, 485); 3 frames later each if distance is to be heard | "An iron hoe chopping into wet heavy soil, one dull earthy chop with a little grit, slow steady work, heard from far across an open field". Fallback: the first 0.2 s of `step/mud` with `knife/chop` 8 dB under, low-passed 1.5 kHz | 4 s, cut single chops | 17 LU under (it is 7.7 under); low-pass 2.5 kHz, high-pass 150 Hz | "a hoe chopping into soil, far away" against a stick snapping, a camera shutter click, a sword being drawn, a metal latch |
| R6 | The girl's steps (missing) | 17.9–20.6, about six steps 0.48 s apart; her feet are a few pixels, so place by gait | "A small child walking slowly along a wet muddy path, light soft squelching footsteps, outdoors, a little way off". Fallback: `step/mud` at 1.2 speed, six, pitch alternating ±4 % | 6 s | 18 LU under; low-pass 4 kHz | "light footsteps in wet mud" against a clock ticking, footsteps on a hard floor, water dripping, paper rustling |
| R7 | The swallows and the breath | 21.28, 21.52, 22.03; breath 22.35–22.9 | Keep the model's, cut from the raw take (`out/edits/Q03A_t2_fixed.wav`) with a gate and a 150 Hz high-pass, not from the subtracted layer. If none of the model is wanted: "A man drinking deeply from a wooden bowl, three slow gulps of water and one breath out, close, quiet" | 4 s | as now, 11 LU under | "a man drinking, gulping water" against footsteps, mouth clicks, cloth rustling |
| R8 | Boots going away | about 24.0, 24.55, 25.05 | "A heavy man in leather boots walking away on wet muddy ground, three slow squelching steps, getting farther". Fallback: `step/mud` three times at 0.85 speed, each 2 dB lower | 4 s | 14 falling to 18 LU under | "heavy boots walking in wet mud" against cloth rustling, a horse walking, a knock on wood |
| R9 | The bowl taken (missing) | hands on it frame 1221 (50.875); off the stone frame 1227 (51.125) | "Small hands lifting a wooden bowl of water off a wet stone, a soft woody scrape and a little slop of water, close, quiet". Fallback: `tick/wood` with `splash/plunge` 10 dB under | 2 s | 14 LU under | "a wooden bowl lifted off stone, water slopping" against a footstep, a door knock, a heavy thud |
| R10 | He takes her | boots 51.69 and 51.97; cloth fullest on frame 1245 (51.875) | "A heavy man running up through mud and snatching up a child, two hard squelching boot steps, thick wool cloth whipping, one grunt of effort, close" | 3 s | 6 LU under (it is 0.6 under) | "a man running up in heavy boots and grabbing a child, cloth and breath" against a door slamming, a horse galloping, furniture moved, a rubber squeak |
| R11 | The run | boots on the model's own onsets: 53.27, 53.61, 53.93, 54.25, 54.55, 54.87, 55.17, 55.48, 55.77, 56.11, 56.46 | Three sounds: "A heavy man sprinting across a wet ploughed field in leather boots, fast heavy squelching footsteps in mud, close"; "A man panting hard while running, heavy fast breaths, close"; "Water slopping in a wooden bowl carried at a run, small splashes". Fallback for the boots: `step/mud`, pitch alternating ±4 % | 6 s, 5 s, 4 s | boots 8 LU under before 54.36, 12 under after; breath 14 under | "a man running in wet mud" against footsteps on a hard floor, sneakers squeaking on a gym floor, a horse galloping, hands clapping |
| R12 | The press | starts frame 661 (27.542), fullest 27.69 (ring down, frames 664–665) | One event in place of four: "A metal ring pressed slowly into warm soft wax, one soft thick squelch, dull, very close, quiet". Take the one with a single swell. Drop the take's click | 2 s | 8 LU under (it is 4.6 under); low-pass 4 kHz, high-pass 90 Hz; dry | "a soft wet squelch" against a camera shutter click, a gun being cocked, a mouse click, a match being struck |
| R13 | The lift | frame 699 (29.125) | Free: drop the take's own lift (FX-04b; its bump lands at 29.21) and low-pass the tick at 5 kHz. If remade: "A metal ring peeled slowly off sticky warm wax, one short soft tacky pull, dull, very close, quiet" | 2 s | 12 LU under | "a small sticky peel" against a camera shutter click, a keyboard key press, a finger snap |
| R14 | The landing | frame 1018 (42.417) | "An enormous bronze bell weighing many tons dropping onto a massive oak beam in a stone tower, one colossal deep boom, the timber groaning under the load, stone dust falling, long low decay", played at 0.6–0.7 speed, a 30–45 Hz sub 1.2 s long under it, ringing at least 2 s | 6 s | level as now (−18.4 LUFS): size from length and low end, not from level | "a colossal weight landing" against a door closing with a latch, a wooden crate dropped, a drawer closing, coins dropping |
| R15 | The chains | from 42.49 | "Four massive iron anchor chains going slack and swinging, huge heavy links clanking slowly against each other, deep heavy iron, in a stone tower", at 0.5–0.6 speed | 5 s | as now; low-pass 5 kHz | "heavy iron chains going slack" against coins dropping, keys jingling, a door latch, a small light chain |
| R16 | The bell | onset 45.75 (frame 1098), one frame earlier than now | Recipe: the octave-down ring (prime 96 Hz, hum 48 Hz; `--bell-octave-down`) as the body, the present 191.6 Hz ring 9 dB under it as the strike tone. In place of the bright clang, the first 0.25 s of: "A huge timber and iron ram striking an enormous bronze bell once, a colossal deep metallic boom, heavy impact" | 4 s | as mixed | "an enormous bronze bell struck once" against a gong, a singing bowl, a doorbell, a cinematic boom |
| R17 | The valley's wind | 17.67–25.5, 29.75–39.0, 46.2–57.1: one file for all three | "Cold steady wind blowing across a wide open ploughed field and low stone walls, a low soft moan with slow gusts, grass hissing faintly, outdoors, wide". Better if it fails: a CC0 field recording from the opus-sound-layer library | 30 s, or two of 20 s | as now (−36 to −43 dBFS) | "wind blowing across an open field" against static white noise hiss, ocean waves on a beach, a waterfall, rain; and realness (now 0.02–0.08) |
| R18 | The altitude wind | 0–17.67, 25.3–30.1, 39.4–46.2, 57.1–63 | "High thin wind moaning through tall open stone arches at great height, hollow and airy, steady with slow swells". Or a CC0 recording | 30 s | as now | "wind in an open high place" against ocean waves, static hiss, a waterfall, rain |
| R19 | The gloved applause | 57.2–61.2 | Free first: four copies of the present file 37, 71 and 113 ms apart, each ±3 % in speed, low-passed 2.5 kHz, into the hall. If remade: "Ten thousand people clapping softly in thick gloves in a vast stone cathedral, a dense dull padded patter, far away, very reverberant" | 10 s | as now | "a huge crowd applauding softly, far away" against a small group clapping, sharp loud hand clapping, rain, horses galloping |
| R20 | The answer | 16.32–18.8 | No new voice: four copies under the present one, 20–45 ms apart, ±2–3 % in speed, two low-passed 3 kHz and panned wide | | as now | "thousands speaking in unison in a huge hall" against a few people speaking together, one woman speaking, a synthetic robotic voice |
| R21 | The ring on the water (the author's call) | frame 774 (32.25) | "One drop of water falling into a still bowl of water, a single tiny soft plip, very close, quiet". Fallback: `water/plop` at 1.3 speed. The approved prompt asks for wind and nothing else here | 2 s | 22 LU under | "a single drop falling into water" against a mouse click, a knock, a footstep |
| R22 | The ox's halter chain (optional) | 35.2–35.5 | `chain/rattle`, 0.3 s at 0.7 speed | | 20 LU under | |

Edits that need no new sound:

- **49.71–50.45:** keep the model's layer shut (the rumble's tail).
- **26.49–29.9:** take the dialogue stem out from under Serath (it is the answer's hall tail, v5 clock 18.87 on). **18.76–18.80:** let that tail ring out over the vale for a second or more instead of a 40 ms chop.
- **Any model event that is kept:** cut it from the raw take with a short gate (10 ms open, 120 ms close), not from the spectrally subtracted layer.

## Appendix D. The locally made sounds

| Sound | Verdict | Evidence |
| --- | --- | --- |
| Valley wind (both) | does not pass | E: wind strong or plausible as words (z +2.8 to +3.1) but "static white noise hiss" 68–95 %; realness 0.02–0.08, "likely code-synthesized". G: ocean surf 3 of 3; wind in a microphone or surf 2 of 2 |
| Altitude wind | does not pass | E: "ocean waves" 97 %; realness 0.20. G: waterfall once, a rattle once |
| Arrival thud | does not pass | E: "sub bass drop" 99 %, kick drum z +3.4, realness 0.05; AudioSet "drum machine" 0.34. M: 99 % of its energy under 82 Hz, so a phone plays none of it |
| The landing | does not pass for size | E: z +6.0 with the cue sheet's words; unprompted "dominoes, coins dropping, drawer closing"; "a wooden crate dropped" 79 % against the ninety-ton wording. G: a door, 6 of 6 |
| The chains | marginal | E: z +4.5 with the words; unprompted "creaking door, coins". G: chains in 0 of 6 |
| The bell | a bell, too small | E: opening stroke z +4.3 (72 % against gong); the hit alone 97 %, but its nearest words are "success chime, doorbell"; the stroke with its low-passed valley tail loses to gong (80 %). G: singing bowl, meditation bell, chime or gong, 4 of 4. I: by founders' scaling (pitch falls as the cube root of mass; a 24-tonne bell strikes near 131 Hz, a figure from memory, not checked) a 191.6 Hz strike note is a bell of about 8 tonnes, and 90 tonnes would strike near 85 Hz |
| The gloved applause | applause yes, gloved and vast no | E: applause z +3.0, AudioSet 0.62; "sharp loud hand clapping" 82 %. G: "a small crowd" once, wind over a bottle twice. Low enough to live |
| The wax squelch | does not pass | M: three bumps of its own (27.70, 27.845, 27.95) |
| The lift tick | does not pass | E: "spacebar press, camera shutter click" |
| Whoosh, rope creak | pass | E: z +4.1 and z +3.4 |
| Strain, paper, sleeves, grit, crowd presence | weak, but low enough to do no harm | E: z +2.1, z +2.2, no match; the crowd reads as talk |

## Appendix E. The voices as recordings (the model's)

| Voice | Intelligibility | Tone | Room | Artefacts | Verdict |
| --- | --- | --- | --- | --- | --- |
| Line 1, 5.95–10.31 | G: every word, 6 of 6 (3 on the layer, 3 in the mix) | G: "deep, authoritative, natural, no noticeable distortion". E: "a clear natural recording of a man's voice" z +4.4, 94 % | E: "a man speaking solemnly in a huge reverberant cathedral" z +4.7, 99 % | M: 95 % of the energy under 1.3 kHz, nothing above 16 kHz (the take is 32 kHz AAC). G: "a continuous low drone" under it, 6 of 6: that is the take's own bed, which cannot be lifted out by level | passes |
| Line 2, 14.30–15.84 | G: 6 of 6 | natural to G; E prefers "robotic text-to-speech" (65–80 %), which the handbook lists as a bias of this ear model | as line 1 (z +3.0) | the same drone | passes |
| The answer, 16.32–18.80 | G: 6 of 6 | G: "a group", mostly women's voices, 5 of 6; "one woman" once; never a large crowd. E: "thousands speaking in unison" z +3.4 but "a synthetic robotic voice" takes the forced choice (100 %, z +4.9) | wide and reverberant | M: tonal near 206 Hz; 99 % of the energy under 2.2 kHz; its hall tail is chopped at 18.80 and returns at 26.49 | passes for words, not for ten thousand: thicken it (R20) |

A free test worth one try: separate the Hierophant from Q01's bed with Demucs (the handbook's method for replacing a voice) and lay the clean voice over the local hall and crowd. I did not try it.

## Appendix F. Method and limits

- Each sound was cut from its layer in `out/review/v8_sound/` and given to earshot (`describe`, then `match` with my own alternatives, then `realness`). My alternatives are harsher than the cue sheet's (they include clicks, doors and small objects), which is why the press and the landing do worse here than there.
- Gemini: 33 clips, 2 or 3 passes each, sound only, one neutral question ("list every distinct sound ... what produced it ... natural or artificial"); the key clips were asked again with the level raised. Its answers changed from pass to pass on the same file. Counts are given; none is proof.
- Picture sync was read from every frame around each event (`ffmpeg`, cropped and enlarged).
- Not checked: lip sync; the phase of the run's steps (feet out of frame); the girl's footfalls (too small); whether any prompt above works. Nobody has heard this track, including me.
