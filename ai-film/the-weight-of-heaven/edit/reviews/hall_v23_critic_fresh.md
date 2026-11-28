# The yard and the hall, cut v23: a fresh critic's report

File judged: `out/review/film_v23_hall.mp4` (38.2 s, 917 frames, 992x432, 24 fps). Written 28 November 2026.

How I worked: every frame extracted and looked at shot by shot and across each cut; exposure, placement, motion and
sound measured; the same measurements run on the 271 distinct reference frames from Dune: Part One, Dune: Part Two,
Blade Runner 2049 and Arrival. Stops below are display stops relative to 18 % grey, taken from 8-bit code values with a
2.4 gamma, the same for this file and for the references. Pixel positions are in the 992x432 frame. I scored the shots
and listed the faults from the file alone, without the v22 critics' reports. Afterwards I opened
`tools/combine_film_v23.py` and the source takes, only to learn which shots are retimed and what frames are left over,
so that the free fixes below are ones the takes can actually supply.

## 1. Verdict

No. This passage would be noticed inside any of the four films, and the yard sooner than the hall. Three pictures are
close to the standard (Karst opening the shutters, Karst at the opening, Serath's close shot in the yard) and the hall
has a real idea in its design. But the yard is cut and framed like good television: six eye-level shots in 12.5 s, no
frame with size, and its second speaker shown once as a motionless chest-up on black. The hall opens its doors on a
white sky and then forgets that it did: seconds later the same doorway is two stops darker, a lamp nobody carried
is burning deep in the room, and the scene's last face is lit from above in near darkness. Over a third of the running
time (332 of 905 frames) is motion-interpolated slow motion, and it shows on legs, hands and a face. The sound of the
hall does not change when the doors open and its last 8.6 seconds contain one small noise repeated five times. Most of
what follows can be mended in the edit; the size of the yard and the light after the doors cannot.

## 2. Shot by shot

| # | Time (s) | Shot | Length | Score | Why |
|---|---|---|---|---|---|
| 1 | 0.50–2.79 | The spear | 2.29 s | 5 | Clean, even, well exposed (sky +1.0, wall −4.2); an eye-level medium two-shot with no size and no shape. Television. |
| 2 | 2.79–4.54 | Serath between two dark backs | 1.75 s | 4.5 | The best idea in the yard (white between black), spoiled by a 1.35x push that cuts her at the shins, and by 52 % slow motion: the aide's leg has a ghost double from 4.0 to 4.45 s. |
| 3 | 4.54–6.00 | Two people watch | 1.46 s | 5 | Same take as shot 1 pushed in; both crammed into the left half; the man looks into the lens from 4.9 s. |
| 4 | 6.00–7.83 | Karst in a doorway | 1.83 s | 4 | A photograph: 1.0 code value of change in 44 frames, no blink, 59 % of the frame at code 6 or under, enlarged 1.9x. He belongs to no place we have seen. |
| 5 | 7.83–11.71 | Serath close | 3.88 s | 7.5 | Real performance: eyes come up between 9.5 and 11.2 s. Skin, depth and overcast modelling hold. Key −2.3 rising to −1.2 under a +0.8 sky. |
| 6 | 11.71–12.96 | Her profile | 1.25 s | 7 | A strong image, used for 30 frames. Enters mid-move (2.5 px a frame) and leaves 0.26 s after the scene's last line. |
| 7 | 12.96–15.83 | Her profile at the slab | 2.88 s | 6.5 | Good texture and a readable rim. Mouth hangs open 12 frames before her voice; her coat shoulder (+1.3) outshines her face (key −3.7). |
| 8 | 15.83–22.25 | The hall, wide | 6.42 s | 6 | The design is right (sealed sheets under stones, the slit, two figures) and holding it under her reading is right. Graded to the floor: brightest 1 % at code 44, her white coat at −3.0, lit by a pool with no source. |
| 9 | 22.25–26.92 | Karst opens the shutters | 4.67 s | 7.5 | The one frame that could pass: symmetry, silhouette, a reveal that tells the line. Marked down for a grade box around his legs and a plain that darkens 1.3 stops after the doors stop. |
| 10 | 26.92–27.83 | Serath turns | 0.92 s | 4 | Wrong side of the line, waxy skin, a white of the eye for the last four frames, and her glance goes the same way as Karst's. |
| 11 | 27.83–30.75 | Karst at the opening | 2.92 s | 7.5 | Edge-of-frame figure against sky, face 7.4 stops under it, an unhurried turn. The plain behind him reads as water. |
| 12 | 30.75–32.42 | The lamp | 1.67 s | 6 | Handsome warm against cool. But the doorway is 2 stops under the sky we just saw, the hand floats (about 33 % speed), and no lamp exists in the wide. |
| 13 | 32.42–35.96 | The shard | 3.54 s | 4.5 | A good insert with a stutter in it: one frame held and one step doubled in every four, 21 times. 6.5 once repaired. |
| 14 | 35.96–38.21 | Her face | 2.25 s | 5 | The scene's last look is nearly unreadable: 76 % of the frame at code 16 or under, eye sockets −6.2 and −6.9, lit from above. Ends on a look into the lens. |

## 3. The two scenes

- **The yard: 5 / 10.** Two portraits at 7 and above; everything round them is competent television. With the free
  fixes below, about 6.
- **The hall: 6 / 10.** Three real pictures and a good plan, undone by light that does not follow the doors, a broken
  line, and thin sound. With the free fixes below, about 7.

## 4. Faults, most serious first

**1. The hall's light does not follow its own event (24–38 s).**
Evidence: the doors open on a sky at +2.3 (shot 9, code 244) and +2.2 (shot 11). In the lamp shot the same doorway is
+0.3 (code 135), even after v23 lifted it 2.5 stops, while the lamp globe is +1.8: daylight dimmer than an oil lamp.
The wide shows no lamp anywhere. Karst stands in the doorway at 30.71 s and his hand is at a lamp 8 to 10 m inside at
30.75 s. Her last close shot has a key of −2.8 and a mid of −5.4 (ten dark close-ups in the references: median key
−1.85), and it is lit from above, though the only warm source is on the floor and the daylight is at her side.
- FREE: lamp-shot doorway up to about +1.8 (code 208 to 215). If the pixels will not take another 1.5 stops, matte in
  the shot-11 sky. Last close shot +1.0 stop above code 12 (mid 26 to 35, key 56 to 75), plus +0.5 on the two eye
  sockets (x 50–60 % and 65–74 %, y 31–43 %). I tried the +1.0 on the frames and it holds.
- NEW FOOTAGE: the lamp brought in or lit in view (the unshot lines may cover Karst's crossing, but they must do it on
  screen); the last close shot relit, warm from below and a cool edge from the door.

**2. The yard has no size and Karst is never in it (0.5–13.0 s).**
Evidence: six shots in 12.46 s, average 2.08 s, three of them under 1.9 s; all at eye level from a few metres. Shots 1
and 3 are one take (`Q08B_t1` frames 0–54 and 58–92). Karst and Serath never share a frame. From general knowledge of
these films, not from the stills, they cut an arrival roughly twice as slowly and open it on scale.
- FREE, partly: the takes are wider than the cut shows them. Un-push shots 2 and 4 (faults 3 and 10).
- NEW FOOTAGE: one wide of 5 to 6 s that holds the boat, the white pair, the crowd and Karst's doorway together. The
  build notes already say an edit cannot make this; I agree.

**3. Karst in the doorway is a still (6.00–7.83 s).**
Evidence: 20 take frames stretched to 44 (45 % speed). Change from first to last frame is 1.0 code value on his head;
her close shot changes 14.8 in the same time. No blink. 59 % of the frame at code 6 or under, beyond the 97th
percentile of the references (45 %). The window used is 529 px of a 992 px take. He looks straight into the lens while
Serath answers three-quarter.
- FREE: go back out. The take (`Q08B_t2`, frames 89–264) is a symmetrical three-quarter figure in a tall doorway
  between two lit stone piers, with 28 % of the frame at code 6 or under. Use `crop(0.08, 0.0, 0.92, 0.84)` (1.19x),
  frames 89–112 where his mouth is shut, slowed to 55 % for the same 44 frames, and −0.7 stop on the figure, not −1.3.
- Option, the director's call: a stored note says the author disliked a man reciting from a doorway. If two words on
  his own moving mouth are acceptable, start the line on him at natural speed and leave on the third word.

**4. Shot 10 is on the wrong side of the line and the eyelines do not meet (26.92–27.83 s).**
Evidence: she faces frame-left at the slab in shot 7 and in the wide, frame-right here. Her glance at 27.6 s goes
frame-left; Karst's at 30.4 s goes frame-left too.
- FREE: mirror the 22 frames. Tried on the frames: she then sits right, faces left as in shot 7, and glances right
  toward the door, and Karst's look answers it. Cost: the slab's letters are reversed, at code 25 for 0.9 s. If the
  white of the eye still reads oddly, end two frames earlier (27.75 s).

**5. The join between the scenes (12.96 s).**
Evidence: two left-facing profiles that are not registered: nose tip at (532, 100) on the last yard frame and
(672, 190) on the first hall frame, 140 px across and 90 px down, head pitch about 26 degrees apart, eyes closed on
one side and open on the other. Her mouth is open from the first hall frame; her voice starts at 13.50 s. The last
yard line ends at 12.70 s. From 7.83 to 15.83 s the film is three close shots of one face in a row.
- FREE, two steps. (a) Give shot 6 ten more frames from its take (`Q08A_t2` frames 252–261, where her eyes open again
  and her chin stays up) and take ten off the head of shot 7. Same length; the line gets 0.68 s of air; the dead mouth
  goes; eyes are open on both sides. (b) Recrop: shot 6 `crop(0.0, 0.0, 0.80, 0.80)` of its take (1.25x, now 1.14x),
  shot 7 `crop(0.138, 0.138, 1.0, 1.0)` (1.16x). By calculation the nose tips then fall about 36 px and 9 px apart;
  measure again on the new last frame.
- Alternative, also FREE: go from her profile to the wide first (take frames 153 on), then the slab close shot, then
  back to the wide, closing the 1.2 s pause at 18.9 s to 0.5 s.
- NEW FOOTAGE for an exact match: make shot 7's first frame from shot 6's last.

**6. The wide is too dark and does not match the shot before it (15.83 s).**
Evidence: her coat is −1.0 at the slab and −2.9 in the wide, 1.9 stops down across the cut; the slab goes from −2.5
to −4.9. The wide's brightest 1 % is code 44, darker than 93 % of the reference frames (their median is 148). The lit
patch of wall beside her is code 31 and falls to 8 two metres nearer the slit that is supposed to light it. Her shadow
falls frame-left in the wide, while the slab in shot 7 is lit from frame-left (I read these as opposite; medium
confidence at this size).
- FREE: take back the stop v23 took off Serath and the 0.8 off the surround. That is +1.0 stop above code 12: coat 52
  to 70, wall 31 to 41, top 1 % 44 to 59, a quarter of the frame still at code 6 or under. Tried; it holds. In shot 7
  take a further stop off the coat shoulder at bottom right (its top tenth is code 180, +1.3) and add 0.7 to the face.
- NEW FOOTAGE: one light direction for the slab.

**7. Over a third of the passage is interpolated slow motion.**
Evidence, from the build script: shot 2 at 52 %, shot 4 at 45 %, the wide's first 5.8 s at 40 %, shot 10 at 64 %, the
lamp at about 33 %, her last face at 50 %. That is 332 of 905 frames made from 151 real ones. Seen: the aide's ghost
leg (frames 96–106), Karst as a waxwork, lamp fingers that drift and change length. The wide survives it because its
figures are 70 px tall.
- FREE: shot 2 from take frames 106–131 at 62 % and un-pushed (fault 10); cut the lamp to 1.0–1.2 s.
- NEW FOOTAGE for anything that must run long with limbs in it.

**8. The shard stutters (32.42–35.96 s).**
Evidence: feature motion per frame repeats 0.49, 0.06, 0.66, 1.10 px through the whole shot; no other shot does this.
It is the raw take's cadence, frame for frame (take: 0.52, 0.05, 0.67, 1.11). The build script says the repeats were
removed; the file does not show it. The file was written at 03:42:24 and the script last changed at 03:46:40, so the
render predates the script on disk. And the script's method would not cure it: run in my scratchpad it gives 0.38,
0.43, 0.58, 0.81, because the take does not repeat a frame, it holds one and then jumps two.
- FREE, tested: drop each repeated frame and put one flow-interpolated frame into the doubled step that follows. Same
  85 frames; motion becomes 0.52, 0.71, 0.57, 0.56, and the share of its variation that repeats every four frames
  falls from 69 % to 9 %. The rebuilt frames are softer (Laplacian 25 against 35), so sharpen those lightly.

**9. Sound.**
Evidence: (a) the room tone is −45 to −50 dBFS before the doors and −44 after; opening onto a plain changes nothing.
(b) From 29.6 s one 0.16 s sound occurs at 29.61, 31.49, 33.13, 34.78 and 36.43 s, waveform correlation 1.00; a speech
model hears "How?" five times. It is the 1.9 s air loop (take 22.55–24.45 s) carrying a sound from Karst's turn.
(c) Lamp, hand and paper are silent. (d) The tone drops to −58 and −63 dBFS for 30 to 40 ms at the cuts at 27.83 and
30.75 s. (e) Hall voices are dry: 18 dB gone in 60 ms after "forty years.", 16 dB in 120 ms after "chosen."
(f) The low hit in the yard starts at 7.98 s, 3.5 frames after the cut at 7.833 s.
- FREE, all of it, with effects made locally: air from 23.5 s rising to about −32 dBFS by 25.0 s and held near −34 to
  the end; a bed cut from a stretch without the noise; foley at 29.4–30.4 and 30.75–32.4 s; one continuous tone across
  both cuts; a hall on the three hall lines (1.5 to 2 s decay, 12 to 15 dB under the voice); the hit moved to 7.83 s.
- The five spoken lines are clear and level, and the off-screen ones sit well on the faces they cover.

**10. Shot 2 is cut at the shins (2.79–4.54 s).**
Evidence: the 1.35x push ends the frame at her shins and loses the wall's height; in the take she stands whole on sand.
- FREE: push 1.12 with the bottom edge on the take's bottom edge, window x 0.09–0.98, y 0.11–1.0.

**11. A grade box round Karst's legs, and a plain that darkens (24.4–26.9 s).**
Evidence: the stones beside his legs inside x 428–566 are code 30 to 35; just outside they are 51 to 57, a step of 1.5
to 1.9 stops; the take is even there (50 to 58). The −2 stop window on his back takes the ground with it. Separately,
in the take itself the plain falls from code 57 at 24.83 s to 39 at 26.83 s (−1.3 stops) with the sky fixed.
- FREE: matte the window to the coat (x 452–548 above y 340, legs 458–540). Optional counter-ramp on the ground.

**12. Things that change between shots.**
Evidence: gloves are white in the yard (+1.0 to +1.4) and grey and ribbed at the slab (−4.4, darker than the stone
they touch). Karst's coat is cool grey in the yard (red to blue 0.85) and warm brown in the hall (1.2 to 1.3). The
plain is basalt columns in shot 9 and rippled like water in shot 11. Her hair is fuller and her skin glossier in shot
10. The shard is tan under the lamp while the plain is black: check the prop sheet before touching it.
- FREE: Karst's yard jacket warmed toward 1.1. The rest is NEW FOOTAGE.

**13. Looks into the lens.**
The man in shot 3 from 4.9 s, Karst for the whole of shot 4, Serath in the last six frames (37.9–38.2 s). The
references do use frontal looks, but as a system on both sides. FREE: end the last shot at frame 910 (37.92 s) if the
look is not wanted.

**14. Small.**
Shot 6 cuts from a still frame into a moving one. "Stone" is heard as "stoned" by the speech model in both voices
(21.3 and 26.3 s): check the consonant on the scene's key word. The sung line under 0–7.5 s is read three different
ways by the model.

## 5. At the standard: keep

- **Karst opens the shutters.** The composition, the silhouette, and the action match from the wide (hands on the
  doors at 22.21 s and 22.25 s). Karst walking to the doors during her reading and waiting 2.7 s for her last phrase.
- **Karst at the opening.** Face 7.4 stops under the sky; Blade Runner 2049 does the same at 7.2. His turn comes half
  a second after her line.
- **Serath's close shot in the yard**, whole, and the 1.4 s of silence after "Admiral."
- **Her profile against the sky**: keep it and lengthen it.
- **The wide's design** and her reading carried over it as a voice.
- **The yard's exposure and colour from shot to shot**: skies +0.8 to +1.5, walls −3.4 to −4.2, coat +0.1 to +0.6.
- **Warm lamp against cool door** in the lamp shot, and the light on the shard.
- **A camera that stays still**: twelve of fourteen shots are locked off.
- **Karst's lines laid on her face, and "We were chosen." on his back.**

## 6. Rules for the next scenes

1. Draw the floor plan and the light before any shot: one source for each state of the scene, where it is, and which
   shots fall before and after a change. Anything that gives light must be visible in the wide.
2. Make one wide that holds every player and every object that later gets its own shot, and decide size there. Compose
   in the generation: the takes are 992 px wide, and a 1.3x push throws away four pixels in ten.
3. Write screen direction and eyeline for every shot before generating. Reverse angles are designed, not found.
4. Generate the length you need at the speed you need. No stretch below about 70 %, and none on limbs, hands or faces.
   Test every take for held frames before cutting it.
5. A match cut is generated: the last frame of one shot is the first-frame reference of the next.
6. Set exposure targets per scene and measure each take against them: a close-up key no lower than −2.5; one hot
   accent of +1 or more in every dark frame; the same object within half a stop across a cut.
7. Fewer and longer: average 4 s or more; 0.75 s of air after a scene's last line; never two close shots of one face
   in a row without something else between.
8. Grade with mattes that fit the object, never a rectangle on a figure, and measure again afterwards.
9. Sound follows the picture's events: a door changes the air; no loop shorter than the scene; a room on every voice;
   a sound for every insert.
10. Keep a continuity sheet for each character and set (gloves, coat, collar, hair, stone, lettering) and check each
    take against it.
11. After every build, test the file itself, not the script: timestamps, held frames, and each fix measured.

## Limits

The takes and the file are 992 px wide, so fine texture cannot be judged against a cinema image. Reference stills are
384 to 640 px JPEGs: good for tone and placement, not for texture or shot length. The words were transcribed by a small
local speech model.
