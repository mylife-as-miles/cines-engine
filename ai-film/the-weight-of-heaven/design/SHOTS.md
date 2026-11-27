# The Weight of Heaven: generation sequences

Split as *My Name Is Oren* was (`design/SHOTS.md` on branch `ccr-a1ca9fd6-0m96vq`). The film's **42 beats** (`BEATS.md`) become **26 generations, Q01–Q26**, covering B02–B42. B01 (the bell over black), the supers and the title card are made in post. Each generation gets one auteur prompt (`prompts/Qnn.md`), written and costed before anything is generated, and generated only on the author's go.

**Model (proposed, as for Oren): Seedance 2.5 on fal, 21:9.** Oren's final takes ran about $0.22 a second. These 26 generations come to about 7½ minutes of material, so one final take of everything is in the region of **$100**, plus 480p drafts. That is a rough figure; each prompt file carries its own quote.

**For every generation (Oren's rules, and the Oren lessons that apply):**
- **Length.** Generations run 4–30 s; most here are 12–22 s. The planned content never fills the clip, because the slow first and last half-second are trimmed.
- **Two kinds of generation:**
  - *Held* generations (movements II, IV, VI, VIII) follow the story in order and chain: each opens exactly on the previous one's last frame. They are joined with a 2–3-frame dissolve, and frame 0 is checked for a stray frame.
  - *Montage* generations (movements I, III, V, VII) are made **by place, not by time**. Each one is a reel of short shots (1–3 s, one clear action each), intercut with the others in the edit on the song's bars. They do not chain, and the song is laid in the edit, never asked of the model.
- **Splits** fall at the end of a beat. Where a beat has to be split, the split falls between two lines, never inside one (listed below).
- **Draft at 480p**, choose a take, then make the final from that draft. Keep a good shot, and regenerate only a failed one as a short pickup from the frame at the cut.
- **The prompt:**
  - It carries the film bible's colour and camera blocks and the Voice DNA (`VOICE_BIBLE.md`) unchanged.
  - Every line is quoted whole from `design/script.json` with its length in seconds. Never a speed word, and never a single word of a line quoted in the direction.
  - Eyes are written open, with a named gaze. Held props are placed in body terms ("arm straight down, the shard in her left hand at her hip").
  - Locks are written as what we want, not as a list of what to avoid.
- **Identity** comes only from the locked high-resolution sheets in `refs/`. Generated frames are used only as start frames, never as identity references; Oren's faces aged from copy to copy. Grain is added once, in the grade.
- **Attach at most eight images**, in a stated order. Prop and ship sheets have their printed labels cropped off first.
- **Board and silent animatic** for every sequence before it is generated: it is free, and it catches the impossible shot.

**Running time:** the content below covers 0:03–6:40. B01 (3 s over black) is made in post, so the cut runs **6:40**, with the four montages cut to the song.

## Index

| Seq | Beats | Content | Starts at | Lines | Images to attach | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **I. The bell (montage)** | | | | | | |
| Q01 | B02 The rite | 16.33 s (t1, kept to its cut) | 0:03 | L01–L02 | ENV_E01, CHAR_C05, CROWD_K01, CHAR_S01, CHAR_S02, PROP_P01, SHIP_V05, PROP_P21 | **Done: t1, shots 1–4 kept (0–16.33 s).** The nave, the Hierophant, the couple and the tilt to the bell, the gallery response. Its missed release, hammer and strike moved into Q02 (the author, 25 November). |
| Q02A | B04 Unread | 15 s, 4 shots | 0:19 | none | Block-out `refs/blockout/Q02A_blockout.mp4`; CHAR_C01, CHAR_C10, CHAR_S03, CROWD_K02, PROP_P13, PROP_P04, PROP_P03, ENV_E01 | **v2, restaged, waiting for the author's go.** A cut from the gallery to Serath, frontal and centred; the basket taken out of the air in profile; the warrant low in the frame, her eyes on the tower; the ring into the wax, hands only. Generated silent. t1 (26 s, one generation) was rejected whole. |
| Q02B | B06, B07b The bell · the still cup | 16 s, 3 shots | 0:34 | none | Block-out `refs/blockout/Q02B_blockout.mp4`; CHAR_S03, PROP_P04, PROP_P01, SHIP_V05, PROP_P07, ENV_E01 | **v2, restaged, waiting for the author's go.** From the sealed warrant, a tilt up the tower; the barge lets go; two ringers haul a hammer longer than they are tall; the stroke, held; the cup from straight above, still. |
| Q03A | B03, B05 Built to bear · the water | 16 s, 5 shots | 0:13 | none | Images only: CHAR_C09, CHAR_C12, PROP_P06, PROP_P16, ENV_E03 relit (`refs/relit/`) | **t1 rejected by the author (26 November): not cinematic; the previs is never attached again. t2 (v2, images only) generated 26 November, waiting for the author's verdict** (`prompts/Q03.md`, `prompts/sent/Q03A_v2.txt`: the auteur prompt as sent). Exposed for the pale band under the mass, figures dark against it, shallow focus. The vale, extreme wide; at the wall in profile, he drinks and sets the bowl down; the water trembling, her eyes beyond the rim (framed as the cup was); the ox hauls at its rope and the crows cannot climb; a seam of dust on the Anvil, over his bent shoulder at 135 mm. Camera low and locked off. |
| Q03B | B07a The mountain lets go | 12 s, 3 shots | 0:35 | none | Images only: CHAR_C09, CHAR_C12, ENV_E03 relit, two opening frames from Q03A take 2 (`refs/frames/Q03B_open_*.jpg`), PROP_P06 | **t1 generated 26 November: shots 2 and 3 good; in shot 1 the rock falls from the mass above, not from the mountain (free re-cut in `out/edits/Q03B_t1_fixed.mp4`); shot 1 then composited on the author's word and the sequence cut into movement I (cut v8)** (`prompts/Q03.md`, `prompts/sent/Q03B_v2.txt`, `design/boards/Q03B_board_v2.jpg`). The face lets go in silence, the Anvil filling the frame, the farmer small before it; he takes his daughter under his arm, she has the bowl; then **the only handheld shot in the film** as the valley runs and the sound arrives. |
| **II. The council (held)** | | | | | | |
| Q04 | B08–B09 Three days later · Six hundred feet | 24 s, 6 shots | 0:40 | L03–L05 (trimmed, approved) | Images only: ENV_E02, first frame `refs/frames/Q04_open_cup.jpg`, CHAR_C06, CHAR_C08, CHAR_C05, CHAR_C01 | **t1 generated 26 November on the author's go; mended free and cut into the film on the author's word (`out/review/film_v10.mp4`, `edit/film_v10.md`)** (all six shots and all three lines came back as asked; the wine's trembling is too faint and the model added a low drone, both mendable free). v1 package built and revised after three checks (`prompts/Q04.md`, `prompts/sent/Q04_v1.txt`, `design/boards/Q04_board.jpg`). Opens on the cup trembling, built from the very frames of the still cup that ends movement I (a high three-quarter view, not top-down). "THREE DAYS LATER." in post. The Engineer in the middle of the room with nothing to lean on, first with his back to us; the Hierophant frontal, from the collar up; the Engineer stops and looks at Serath; "Sarn Vale." is heard over her back and her head turns, where Q05 opens. About $5.29. |
| Q05 | B10, B11a The arithmetic · "Give me until the evening bell" | 23 s, 6 shots | 1:00 | L06–L09 (trimmed, approved) | Images only: ENV_E02, first frame `refs/frames/Q05_open_serath.jpg` (Q04's last frame), CHAR_C01, CHAR_C05, CHAR_C06, and Q04's two close-ups as set-up frames | **t1 generated 26 November on the author's go; chosen by the author with two changes and cut into the film (`out/review/film_v14.mp4`, `edit/film_v14.md`)** (all six lines and shots came back as asked; the Hierophant's shot has a long silent head to trim; the two women's voices are close in pitch) (`prompts/Q05.md`, `prompts/sent/Q05_v1.txt`, `design/boards/Q05_board.jpg`). Serath turns to the room and speaks for the first time; the Hierophant answers facing forward, and his kindness is heard on her face; the Chancellor looks at her only to give the order; Serath waits, then asks for time. Ends on her close shot, where Q06 opens. About $5.07. |
| Q06 | B11b Until the bell | 22 s, 6 shots | 1:16 | L10 (trimmed, approved) | Images only: ENV_E02, first frame `refs/frames/Q06_open_serath.jpg` (Q05's last frame), CHAR_C01, CHAR_C05, CHAR_C04, the Hierophant's close-up and the film's first seal as set-up frames | **t1 generated 26 November on the author's go; accepted by the author less its seal shot and cut into the film (`out/review/film_v16.mp4`, `edit/film_v16.md`)** (`prompts/Q06.md`): six shots and three lines as asked; Cassiel came back centred in the doorway; the seal came back as the wedding's page over again and is cut; listening passes heard an N in his name. His first two sentences are heard off-screen, over Serath and then over Cassiel at the door; "Remember who raised you" is his only line on screen: warm, facing forward as in Q05. She bows her head, seals the order with her own ring (insert, as at the wedding) and goes; Cassiel, who watched the seal, inclines his head as she passes. |
| **III. Below (montage)** | | | | | | |
| Q07 | B12 The underside | 16 s, 5 shots (about four bars used) | 1:30 | none | Images only: ENV_E04, ENV_E05, ENV_E06, ENV_E07, SHIP_V04, CHAR_C01 | **t1 generated 26 November (16 s); shots 1 and 3 remade 27 November as a pickup from two aerial shot plates (8 s); two critics judged the reel on 27 November (both: not at Dune's level) and their fixes were made by editing; a third critic also said no; shot 3 remade from a plate with the cutter in it (`prompts/Q07R.md`, take 1, 27 November) and cut into `out/review/Q07_reel_v5.mp4`; waiting for the author's verdict** (`prompts/Q07.md`, `edit/reviews/Q07_reel_critics.md`, `out/review/Q07_reel_v4.mp4`; earlier copies `Q07_reel_v2.mp4`, `Q07_reel_v3_fog.mp4`): the author found the first take's shots 1 and 3 riding on the floor and not cinematic; Sarn Vale came back half a second long and is stretched by editing; the take's sound had a narrator and is rebuilt locally. The cutter a fleck under the mass; Serath at the window, eyes up then down; the plain from the cutter's height; the wall, the flat grass and the bird that drops like a stone; Sarn Vale held. The underside sits two stops under the band of day. |
| Q08 | B13–B15 Her own weight · spears · "We stopped carrying it" | 18 s | 1:42 | L13 | ENV_E08, CHAR_C01, CHAR_S03, CHAR_C03, CHAR_C09, CROWD_K03, CHAR_C02, SHIP_V04 | Her knees almost go; the aide falls outright. The farmer's hand on the bowl at his belt (from here on). Karst in the door's shadow; the song cuts on his line. |
| **IV. The hall (held)** | | | | | | |
| Q09 | B16–B17 The treaty · stone within forty years | 17 s | 2:00 | L14–L15 | ENV_E09, CHAR_C01, CHAR_C02 | Low key, about two stops under. "It was stone within forty years" lands as the shutters open on the plain. |
| Q10 | B18–B19 Thirty years of her hand · the marriage bell | 22 s | 2:17 | L18–L20 | ENV_E09, CHAR_C01, CHAR_C02, PROP_P09, PROP_P04, PROP_P14, PROP_P05, PROP_P03 | The lamp over the floor: paper takes the light and basalt does not. She walks the rows. The last stone is the shard. |
| Q11 | B20 I did not read it | 12 s | 2:39 | L21–L22 | ENV_E09, CHAR_C01, CHAR_C02, PROP_P05 | **Hero.** Glove off; **the hand, bare, knows**, in the same close shot. A hold. |
| Q12 | B21 Come down | 22 s | 2:51 | L23–L27 | ENV_E09, CHAR_C01, CHAR_C02, PROP_P05 | He turns to the plain. "No. We would have you come down." She puts the glove back on. |
| Q13 | B22 The truce | 22 s | 3:13 | L30–L32 | ENV_E09, CHAR_C01, CHAR_C02, PROP_P08, PROP_P05, PROP_P04 | Ten grey seals and the empty eleventh. She picks up the shard (left hand from here) and walks out into her own weight. |
| **V. The fleet comes down (montage)** | | | | | | |
| Q14 | B23–B24 More ship than sky · in clear | ≈ 16 s of shots | 3:35 | none | ENV_E05, SHIP_V01, SHIP_V02, SHIP_V03, ENV_E11, CROWD_K05, CROWD_K04, ENV_E10 | Amber from below, cold from above. Gunports opening in rows (the sound becomes the song's percussion in the edit). The lamps; officers reading over shoulders. No gun ever fires. |
| Q15 | B25, B27c The Weir · "All nine gates" · the spoke | ≈ 13 s | 3:51 | L35–L36 | ENV_E06, PROP_P12, CHAR_C03, CHAR_C02, CROWD_K04 | **The wheel is P12's, not the one in E06.** Shoulders to the spokes; Karst's hand on the pin; later, Marl throws her weight on the spoke. |
| Q16 | B24b, B26b The road, through the glass | ≈ 8 s of shots | 3:47 | none | ENV_E07, CHAR_S07, CHAR_S05, CROWD_K03, CHAR_C02 | Long lens (100 mm and up), through the sighting glass. The woman with the door; the boy on his father's shoulders looking straight up; Karst very small at the Weir. |
| Q17 | B26a, B27, B28 The bridge · the answer · "Anchors." | ≈ 22 s | 4:02 | L37–L40 | ENV_E10, CHAR_C01, CHAR_C07, CROWD_K05, PROP_P05, PROP_P10 | Silhouettes against the dusk; the Council's lamp a point, not a beam. **The hand raised** (every signal arm rises with it), then **flat** (palm to the deck), both in the same close shot. The song stops dead before "…Guns, Admiral?" |
| **VI. Anchors (held)** | | | | | | |
| Q18 | B29 Relieved | 18 s | 4:30 | L41–L43 | ENV_E10, CHAR_C01, CHAR_C07, PROP_P02, CROWD_K05, PROP_P10 | The collar unclasped and laid on the chart table; she is bare-throated from here. |
| Q19 | B30–B31 A mile of chain · not one gun | 15 s | 4:48 | none | SHIP_V01, PROP_P11, ENV_E05, SHIP_V02, ENV_E11, CHAR_C11, CHAR_S04, PROP_P18 | **Held wides** (the bible's holds 10.1, 10.2 and 10.4). The anchor falls its whole mile; one iron note. Cassiel's chop, then silence on the gun deck. |
| Q20 | B32 Raining iron | ≈ 6 s of shots | 5:03 | none | SHIP_V01, SHIP_V02, SHIP_V03, PROP_P11, ENV_E05 | The song returns. A forest of chain; the banners come down; Cassiel's ship climbs alone into the cloud. |
| Q21 | B33–B34 "Slowly" · the wheel turns | 14 s | 5:08 | L44–L45 | ENV_E06, PROP_P12, CHAR_C03, CHAR_C02, CROWD_K04 | Marl's hands off the wheel as if it burned; Karst draws the pin. The wheel a hand's breadth at a time; gate by gate. |
| **VII. The descent (montage)** | | | | | | |
| Q22 | B35, B37 What cast the shadow · the landing | ≈ 20 s of shots | 5:22 | none | ENV_E12, ENV_E05, ENV_E06, CROWD_K04, PROP_P11, SHIP_V01 | The city wider than the frame; the tower holds the last sun; the armies kneel. Roots meet stone, columns hold, one ring of dust; the ninth gate closes. The hum and the song stop together. |
| Q23 | B36 Inside Orison | ≈ 8 s of shots | 5:33 | none | ENV_E01, ENV_E02, CHAR_C05, CHAR_C06, PROP_P17 | The banners drop and hang straight; the Hierophant sits down; the Chancellor's hands on the stone, green below. |
| **VIII. The first ground (held, silent)** | | | | | | |
| Q24 | B38–B39 Upright · still water | 20 s | 5:50 | none | ENV_E13, CROWD_K04, CHAR_S06, CHAR_C09, PROP_P06, PROP_P19, PROP_P15 | Open sky for the first time. Backs come upright; the boy's one laugh. The bowl, top-down, perfectly still (the water thread's last insert). |
| Q25 | B40–B41 The shard set down · the first step | 21 s | 6:10 | none | ENV_E13, CHAR_C01, CHAR_C02, CROWD_K06, PROP_P05, CHAR_C10, CHAR_C09, PROP_P06 | Something thrown lands short. The shard set among the black. The girl's steps; **two palms flat on the stone** (the hand thread's last close shot). Eye level, level for both peoples. |
| Q26 | B42 Six more | ≈ 9 s | 6:31 | none | ENV_E12, ENV_E13, ENV_E07, SHIP_V06, SHIP_V02 | Wide, and wider: the landed kingdom, the chains of its fleet, Sarn Vale's hearths. Six more on the horizon (six of V06's nine), a lone white ship climbing. Title in post. |
| | **Total** | **6:37 + 0:03 over black = 6:40** | | **37 of 45 lines (proposal)** | at most 8 images in any generation | |

## Where beats are split (always between lines)

| Beat | First part | Second part |
| --- | --- | --- |
| B07 The mountain lets go | A22–A23 (the mountain; the valley runs) → Q03 | A24–A25 (applause; the still cup) → Q02 |
| B11 Until the bell | L09 → Q05 | L10, A30 → Q06 |
| B24 In clear | A61–A62a (the lamps; the armies) → Q14 | A62b (the road black with people) → Q16 |
| B26 They are carrying beds | A64–A67, L37 (the bridge; the count; the evening bell) → Q17 | A68–A70 (through the glass) → Q16 |
| B27 The answer | A71–A74, L38 (the bridge) → Q17 | A75 (Marl on the spoke; Karst's hand on the pin) → Q15 |

## Continuity across sequences

- **Time and weather:**

  | Block | Time and weather |
  | --- | --- |
  | I | Day: cloud light above, grey day below |
  | II | Three days later, day, greyer |
  | III, IV | Day under the kingdom |
  | V | Dusk, amber from below |
  | VI | Dusk, the amber going |
  | VII | Blue dusk, the last sun on the tower |
  | VIII | Last light, open sky |

- **Serath:**
  - Gold collar until B29 (Q18), bare-throated after.
  - Gloved, except her bare right hand on the shard in B20, glove back on at the end of B21.
  - The truce folded into her coat from B22.
  - The shard in her **left** glove from B22 to B27 (the script's own words); her **right** hand raised in B27.
- **The farmer:** the child's bowl at his belt from B14 (Q08) on. A spear from B14; at the end, the spear and the bowl.
- **Karst:** ink on his right hand; the coat with the insignia cut away; his lamp only in the hall.
- **Marl:** the hull-plate armour, dust in her hair; her hands always on something (spears, the spoke, the wheel) until B33.
- **The fleet:** the ships as locked in V01–V03. Cassiel's ship is the second of the line (V02), and keeps its banner and height after B32. The lone white ship in B42 is his.
- **The Weir's wheel** is P12's: no buckets, a lock-pin at chest height. E06 still shows the old wheel and is fixed before Q15.
- **Supers** ("THE KINGDOM OF ORISON. YEAR 800 OF THE ASCENSION.", "ANVIL VALE.", "THREE DAYS LATER.") and the title are made in post. The models are asked for no text.
