# Hall v22, critic A: cinematography

File judged: `out/review/film_v22_hall.mp4` (48 s, 992×432, picture area 992×416, 24 fps, H.264 at 907 kb/s).
Standard: Fraser (Dune One and Two), Deakins (Blade Runner 2049), Young (Arrival).

## Verdict

No. As cut, the sequence does not pass for a Villeneuve film. Two hall frames pass at a glance (32.5 Karst at the opening, 44.96 Serath's face in the dark) and two yard close-ups (7.83, 12.54). The rest fails for one reason above all others: **there is no single light plan**. The same carved slab is shown at three exposures inside 15 seconds, Serath's face moves through six stops, the daylight outside drops four stops between take Q09 and take Q10, and the one shot that should be the heart of the scene (29.21, she turns into the daylight) is lit like a studio portrait. Fraser and Deakins light a room once and every shot obeys it. Here every shot was lit for itself. That is what reads as "staged".

Most of it can be mended in the grade. One shot (29.21) needs new footage to reach the standard; one (20.71) needs new footage to be more than acceptable.

## How it was judged

Every frame was extracted (1,151 PNGs). For each shot I looked at 4 to 6 frames at full size and enlarged crops, and measured them. I did not watch playback; motion was judged from frame differences. The proposed grades were tried on single frames only (stills in the scratch folder), not rendered as video.

Units: **L** = 8-bit Rec.709 luma, 0 to 255. **Stops** are taken from linearised values. **R−B** = mean red minus mean blue in code values (plus is warm, minus is cold). **Chroma** = mean Cb/Cr magnitude. The reference stills are small JPEGs (384 or 640 px), so their numbers are good to about ±3 code values; grain cannot be compared from them.

## The numbers

Whole frame, one representative frame per shot.

| Ours | mean | p5 | p50 | p99 | below L16 | above L235 | chroma | mids R−B |
|---|---|---|---|---|---|---|---|---|
| 14.33 profile at slab | 55 | 3 | 53 | 132 | 25% | 0 | 2.2 | −1 |
| 20.71 hall wide | 17 | 2 | 15 | 57 | 54% | 0 (slit peaks 238–248) | 1.6 | 0 |
| 23.62 shutters, closed | 9.5 | 1 | 5 | 38 | 81% | 0.2% | 2.1 | 0 |
| 23.62 shutters, open (26.96) | 70 | 10 | 36 | 252 | 17% | 9.4% (6.3% above 250) | 2.8 | +5 |
| 29.21 Serath turns (31.17) | 69 | 12 | 59 | 228 | 7% | 0.2% | 5.2 | +10 (highlights +24) |
| 32.5 Karst at opening | 126 | 22 | 74 | 250 | 2% | 23% | 2.1 | 0 |
| 36.04 lamp | 39 | 2 | 24 | 216 | 43% | 0.4% | 12.7 | +29 (highlights +75) |
| 40.92 shard | 55 | 16 | 44 | 144 | 5% | 0 | 10.5 | +26 |
| 44.96 face in dark | 19 | 7 | 10 | 127 | 75% | 0 | 8.1 | +15 |

| Reference | mean | p5 | p50 | p99 | below L16 | above L235 |
|---|---|---|---|---|---|---|
| `th/d2_0147` Dune Two, small figure, vast dark hall, one far light | 15 | 5 | 11 | 82 | 73% | 0 |
| `md/d1_0114` Dune One, pale figure on dark steps | 11 | 2 | 10 | 31 | 75% | 0 |
| `th/d1_0036` Dune One, dark hall | 12 | 2 | 7 | 55 | 76% | 0 |
| `md8/d1_0080` Dune One, figures against one opening | 23 | 5 | 15 | 140 | 55% | 0 |
| `th7/br_0007` BR2049, man dark against a window | 45 | 3.5 | 13 | 171 | 59% | 0 |
| `md/d2_0236` Dune Two, figure against white sky | 93 | 11.5 | 36 | 248 | 20% | 24% |
| `th/d2_0042` Dune Two, face lit from one side | 42 | 9 | 23 | 159 | 30% | 0 |
| `md/d2_0124` Dune Two, old man's face on black | 39 | 8.5 | 28 | 110 | 45% | 0 |
| `md/d2_0129` Dune Two, knife insert | 33 | 5.5 | 20 | 191 | 40% | 0 |
| `md/d1_0010` Dune One, lamp insert | 27 | 7 | 18 | 105 | 46% | 0 |
| `th8/d1_0172` Dune One, figure before a carved wall | 28 | 4 | 29 | 59 | 25% | 0 |

Patches (13×13 px means):

| What | Ours | Reference |
|---|---|---|
| Carved slab, shutters closed | 14.33: L 86–111. 20.71: L 26–39. 29.21 first frame: L 53 | carved wall `th8/d1_0172`: L 37–39 |
| Serath's face | 14.33: median L 15. 31.17: L 112–154. 44.96: L 26–67 | lit cheek `th/d2_0042` L 69, shadow cheek L 20; `md/d2_0124` L 59–75 |
| Ratio across the face | 31.17: 0.9 stop. 44.96: 2.1 stops. 7.83 (yard): 2.65 stops | `th/d2_0042` 3.1 stops; `md/d2_0232` 2.1; `md/d2_0127` 2.2 |
| Figure against an opening | 26.96: Karst's back L 59–66, walls L 19–28, sky L 249–252 | `md8/d1_0080`: figure L 7, walls L 25–27, opening L 112–126 |
| Sky over the lit cheek | 32.5: 5.1 stops | `th7/br_0007` 5.5; `md/d2_0236` 5.0 |
| Daylight seen from inside | 32.5 sky L 238–250. 36.04 opening L 61 | — |
| White coat | 14.33 L 98 (R−B +25). 20.71 L 82, peak 144 (+9). 31.17 L 221–231 (+10). 44.96 L 78–125 (−7) | pale shirt `md/d1_0114` L 38 on a surround of L 15 |

## The hall, shot by shot

### 14.33 – 20.71 · her profile at the slab

- **Key:** one soft source behind and left of her, on the far side from the lens. It lights the slab and puts a thin kicker on brow, nose and cheekbone. Nothing lights the side of her face we see. The back of her head is at L 2.
- **Motivated?** No. The shutters are closed and no lamp is in the hall yet.
- **Exposure:** set for the slab, which sits at L 86–111. That is mid-grey. The story calls it a black slab and Fraser holds his carved wall at L 37–39. Her face is 4.3 stops under the slab (median L 15, 90th percentile L 35). It is not a silhouette by decision, because the profile does not sit against the lit stone. Between the slab's edge (x≈650) and her nose there is a dark strip at L 14.5, so the nose and lips are dark on dark and are held only by a rim of L 17–25.
- **Blacks and whites:** blacks hold (p5 = 3), nothing clips. The gold collar peaks at L 197 and is the brightest and only coloured thing in the frame; it pulls the eye off her mouth while she speaks.
- **Colour:** dead neutral (chroma 2.2). Stone (86, 86, 88). Coat warm (110, 96, 85).
- **Lens and focus:** long lens, about 85 mm, wall raked, focus on the finger and the face, slab soft beyond. This is right. Stone texture is good.
- **Passes?** Not as graded. The design (long lens, raked inscription, one finger, face in the dark) is Villeneuve's. The balance is not.
- **Closest frame:** `th7/br_0007`. It puts the dark profile on the bright field, face 5.5 stops under, and lights nothing else. Ours puts the profile beside the bright field.

### 20.71 – 23.62 · the hall wide

- **Key:** unknown source at frame right, front. It lights Serath's coat to L 82 (peak 144) and throws her shadow, arm included, 1.1 stops deep onto the wall to her left.
- **Motivated?** No. The only source in the room is a slit 2 to 3 pixels wide. Her coat peaks only 1.7 stops under a direct view of the sky through that slit. A slit cannot do that at ten metres. It is a follow-spot.
- **Exposure:** the level is correct. Mean 17, median 15, 54% below L16 sits with `th/d2_0147` (15, 11, 73%) and `md/d1_0114` (11, 10, 75%), a little high in the median. Blacks hold (p5 = 2).
- **What gives it away:** (1) the spot on Serath. Fraser's pale figure on dark steps is 2 stops over its surround at L 38; ours is up to 4.8 stops over at L 144. (2) Every stone joint of every wall is readable at L 20–28 from corner to corner, and the papers in the bottom left are lit for no reason. A room lit by one slit falls to nothing away from it. (3) No air: the slit throws a faint streak on the floor (L 19 against 14) and no blade in the room. (4) Everything is sharp from 2 m to 20 m. With flat ambient and no haze it reads as a game level.
- **Colour:** neutral, chroma 1.6. Fine.
- **Passes?** No.
- **Closest frame:** `th/d2_0147`. Its one light is in the picture, the figure beside it is a shape, and the walls take their glow from that light alone.

### 23.62 – 29.21 · Karst pulls the shutters open

- **Key:** the sky. Motivated and correct. The lit door faces (L 100–120) and the cold stone reveals (L 94–124, R−B −14) are right: opened inward, the doors show their outer faces to the sky.
- **First 1.2 s (23.62–24.8):** 53–81% of the frame below L16, his back at L 17–23, a blade of sky widening. This is at the standard.
- **Open state (from 26.0):** two faults. (1) The sky is a flat clipped panel: L 249–252, 6.3% of the frame above 250 at 26.96. (2) Karst's back is lit from the camera side at L 59–66 with full cloth detail. That is 2.5 stops brighter than the walls beside the door. He faces the sky; nothing can light his back. In `md8/d1_0080` the figure is 2.2 stops darker than the walls and the opening is held at L 112–126 with texture in it. Ours has neither a silhouette nor a held exterior; it shows everything.
- **Lens:** about 35 mm, dead centre, deep focus. The symmetry is in family with the reference.
- **Passes?** The first second, yes. The open state, no.
- **Closest frame:** `md8/d1_0080`.

### 29.21 – 32.5 · Serath turns from the slab into the daylight

This is the worst frame in the sequence and it is the one the scene turns on.

- **Key:** a large soft source at front left, close to the lens axis. Forehead L 154, near cheek L 152, far cheek L 112: a ratio of 0.9 stop. Her head's shadow lies on the slab to the right of her head (L 9 against slab L 64).
- **Motivated?** No, three times over. (1) Direction: her eyes go to frame right, toward Karst and the opening, and the light comes from frame left. She looks away from the daylight she is supposed to turn into. (2) Level: her lit cheek is at 0.32 linear. A face ten metres inside a dark hall, lit through one doorway, sits five stops under the sky; the sky is 0.90–0.97, so her cheek belongs near 0.03. She is 3 stops over. (3) Quality: it is a beauty key. The skin is glossy on forehead, nose and both cheeks, and smoother than in 44.96 or the yard.
- **Against the standard:** 2.35 stops brighter than the lit cheek in `th/d2_0042`, with 0.9 stop of ratio against 3.1. Six stops brighter than her own face at 14.33. 2.5 to 2.9 stops brighter than her face at 44.96.
- **Whites:** coat at L 221–231, collar peaks at 253. Not clipped, but the coat is the largest bright shape in a scene called dark.
- **Colour:** warm. Coat (226, 220, 215), skin (193, 143, 112). The daylight it claims to be is neutral (244, 244, 244) at 32.5.
- **Level within the shot:** the coat ramps from L 123 to L 213 between 29.21 and 30.83 and the slab from L 53 to L 73. Before any daylight arrives the slab is already 0.85 stop over the wide shot.
- **Passes?** No. It is a portrait sitting.
- **Closest frame:** `th/d2_0042`. One side of the face is lit to L 69, the other falls to L 20, the room behind stays out of it.

### 32.5 – 36.04 · Karst at the opening turns his head

- **Key:** the sky behind and to the left of him, a rim on skull and shoulder, the face held by bounce off the door. Motivated.
- **Exposure:** a decision. Sky 5.1 stops over his lit cheek (L 44); Deakins has 5.5 in `th7/br_0007`, Fraser 5.0 in `md/d2_0236`. Cheek to cheek 1.2 stops. The sky holds cloud at L 221–251, 0.8% above 250.
- **Blacks:** a little lifted (p5 = 22; the references have 11.5–12). With a white sky filling 60% of the frame that passes as veiling flare.
- **Lens:** about 75 mm, shallow, the plain soft, the horizon at 61% of the height, he holds the right fifth. Neutral, chroma 2.1.
- **Passes?** Yes, at a glance, as Blade Runner 2049.
- **Closest frame:** `th7/br_0007`. What that frame has and this lacks is grain and a tint in the white.

### 36.04 – 40.92 · the lamp, the rolled sheet, Serath far off

- **Key:** the lamp. Motivated, and the low lens with the object large in front and the person it binds soft beyond is the staging of `md/d1_0014`.
- **Faults:** (1) The lamp-lit sheet (L 115–130) is 2.3 stops brighter than the sky in the opening behind (L 61). Four seconds earlier that sky was at L 238–250. Daylight has fallen 4.3 stops across one cut. (2) The globe is clipped (L 250–252 across the glass); the flame has no value of its own. In `md/d1_0010` nothing rises above L 105 and the ember keeps its colour. (3) Two hues in one frame: orange (R−B +87 on the sheet) against blue (−12 in the opening). Fraser's Dune interiors hold one hue to a scene. (4) Every fourth frame repeats (see fault 8); the hand stutters. (5) The wax seal comes round three times (37.0, 37.5, 39.6–40.4) on a roll that does not travel across the floor; it spins in place under his fingers.
- **The lamp is not in the wide shot at 20.71.** If it is in the hall it is the motivating source of the whole scene and must be seen there.
- **Passes?** No. It reads as a fantasy-series lamp insert.

### 40.92 – 44.96 · the shard on the sealed sheet

- **Key:** lamp from frame right, warm (R−B +62), with cold fill (−11 to −14) in the shadows and the floor behind.
- **Exposure:** not a decision. The whole frame lives between L 16 and L 144. Only 5% is below L16; the reference inserts have 40–69% (`md/d2_0129` 40%, `md/d1_0010` 46%, `th7/br_0013` 69%). There is no black in a shot set on the floor of a dark hall, and nothing in frame to flare the lens. It is milky and flat.
- **Lens:** macro, shallow, a slow push. Correct.
- **Passes?** No.
- **Closest frame:** `md/d2_0129`: one object, one hand, black around it, one cold hue.

### 44.96 – 47.96 · Serath's face in the dark

- **Key:** soft, from camera right and a little above. Lit cheek L 58, nose L 67, far cheek L 26: 2.1 stops. Background L 7–9, not crushed, not milky.
- **Against the standard:** the levels are those of `md/d2_0124` (face L 59–75 on L 10) and the ratio is that of `md/d2_0232` (2.1). Skin texture is the best in the sequence.
- **Faults:** the coat at the bottom edge is L 78–125, up to 2.2 stops brighter than her face, and cold (R−B −7) where the Q09 coat was warm (+10). A cinematographer cuts the light off the costume. The background has 10 code values in all (L 3–12); at this bit rate it blocks.
- **Passes?** Yes, at a glance, as the Emperor's close-up in Dune Two.

## Does the light hold across the hall

No. One table says it.

| Shot | Light on Serath or Karst comes from | Slab or wall | White coat | Daylight |
|---|---|---|---|---|
| 14.33 | behind left, far side; face unlit | L 86–111 | L 98, warm | — |
| 20.71 | frame right, front; hard | L 26–39 | L 82–144, warm | slit L 238–248 |
| 23.62 | sky; his back filled from camera | L 19–28 | — | L 249–252 |
| 29.21 | front left, on the lens axis; soft | L 53 → 73 | L 123 → 213, warm | — |
| 32.5 | sky behind | — | — | L 238–250, neutral |
| 36.04 | lamp; opening dim and blue | — | — | L 61, blue |
| 40.92 | lamp from right, cold fill | — | — | — |
| 44.96 | soft from camera right, cold | L 7–9 | L 78–125, cold | — |

The slab is 2.7 stops brighter at 14.33 than at 20.71. The light on Serath comes from behind her, then from her right, then from the lens. The white coat is cream in Q09 and blue-white in Q10. The sky is noon in Q09 and dusk in Q10. Only 20.71 → 23.62 matches (Karst L 21 → 17–23, walls near black on both sides of the cut).

## The yard, briefly

Three grades are cut together. Mids R−B: −11 at 0.5, 1.21 and 3.54; −0.6 at 5.29; +10.8 at 7.0 and 11.71; −5.5 at 7.83; −3 at 12.54. From 5.29 on the colour temperature flips at every cut. The white coat is L 120, 127, 184, 168 in four shots: 1.2 stops between the wide at 5.29 and the close-up at 7.83.

- **7.0 and 11.71, Karst in the doorway.** A cut-out on black. 46% of the frame is below L8 and 5% is at exact zero (no reference frame reaches zero; the darkest have p5 = 2). His coat is at L 150, which is 3.9 stops brighter than the cloak of the figure in dark stone in `md8/d1_0082` (L 40), and his face 2.6 to 4.4 stops brighter than that face (L 23). Top light: forehead L 151, cheek L 64. Frontal, centred, warm, while the yard around him is cold. This is the "staged" shot.
- **1.21 and 3.54, the spear and the watchers.** Eye-level two-shot on a moderate wide lens, sharp from the spear to the gate, flat overcast, extras standing in rows behind. Whites reach only L 178 (the references reach 197–221). It is television fantasy coverage. This is the "low budget" shot. At 3.54 both turn and look just off the lens.
- **0.5, the boot.** Sound idea (seen from among the watchers, `md8/d1_0062`) but the coldest frame of the eight (highlights R−B −28; the coat is blue-grey at L 120).
- **5.29, white between two dark backs.** The best wide. The `md8/ar_0087` idea works. Neutral, blacks hold (p5 = 5).
- **7.83 and 12.54, Serath close and in profile.** At the standard. Shallow, long lens, shaped as if with negative fill (2.65 stops across the face under an overcast sky), whites held at L 184, skin true.

Against the standard the yard has no decided cast. Fraser's Caladan frames sit at mids R−B −31 with green 27 above red and chroma 14–15 (`md/d1_0013`, `_0015`, `_0012`); the yard is a weak blue-grey at chroma 4.7–6.4.

## Faults, most serious first

**1. No light plan for the hall (14.33 – 47.96).** The slab at three exposures, her face over six stops, three key directions. By the standard a room is lit once.
**FREE**, a matching grade to these targets: slab near her L 35–45 with shutters closed and L 45–55 once open; white coat L 80–90 closed and at most L 130 open; her face L 30–40 at 14.33, L 75–85 at 31.17, as it is at 44.96. The per-shot numbers are in faults 2, 4, 5, 6.

**2. 29.21 – 32.5: studio light on the turn.** 2.35 stops over the reference cheek, 0.9 stop of ratio, light from the side she looks away from, warm where the daylight is neutral.
**FREE** (tried on the frame at 31.17; it brings the shot into the scene but does not move the light): whole frame −1.75 stops; a gradient falling a further −0.8 stop from x=250 to the right edge; highlights red ×0.97, blue ×1.04; a window on the collar −0.7 stop. Result: mean 31, median 23, p99 131, 25% below L16, slab at L 28–36, which meets the wide shot.
**NEW FOOTAGE** to reach the standard: the same turn with one soft source at 90° to the lens on the side her eyes go to; lit cheek near L 70, far cheek at least 2 stops under; no light on the slab behind her; the coat flagged to 1 stop under her cheek; 65–85 mm.

**3. Daylight drops 4.3 stops between Q09 and Q10 (cut at 36.04).** Sky L 238–250 at 32.5, opening L 61 at 36.04; lamp-lit paper brighter than the sky. It reads as a jump to dusk.
**FREE:** window on the opening at 36.04 (x 366–446, y 8–160, feather 6 px) +2.5 to +3 stops, which puts it at L 150–165 (tried at +2.5); cool Q10's daylight to neutral, shadows and mids red +3%, blue −4%, so the opening goes from R−B −12 to about −4.
**NEW FOOTAGE** if the grade breaks at full resolution: the lamp shot with the opening at L 200 or more and the globe unclipped.

**4. 20.71 – 23.62: follow-spot on Serath, even ambient, no air.**
**FREE** (tried): everything outside the slab around her and the shutters −0.8 stop (soft ellipse centred 400, 210, radii 150×120, feather 60, plus the shutter area x 700–790, y 100–300 kept); window on Serath (x 352–396, y 170–305) −1 stop. Result: median L 15 → 10, 54% → 74% below L16, which is `th/d2_0147` and `md/d1_0114`. Optional reframe: remove 15% from the left, 3% from the top, 12% from the bottom (a 1.18× push). It loses the wooden door and the lit papers and puts Serath at 26% and the slit at 70% of the width.
**NEW FOOTAGE** to reach the standard: the wide with the brass lamp on the floor by the slab as the only source inside, plus the slit; Serath lit by the lamp alone, walls below L 10 beyond three metres from it, haze in the room so the slit throws a blade.

**5. 26.0 – 29.21: Karst's back is filled and the sky is a clipped panel.**
**FREE:** a window on Karst limited by a luma key to pixels below L 150 (x 428–566, y 105–424, feather 10), −2 stops, ramped in between 24.8 and 25.8 s. A plain rectangle spills onto the sky; I tried it. Sky: set the ceiling at L 245 and add highlight diffusion (blur about 12 px, 30% screen, on L above 230) so the clip edge blooms. Trim the tail: the doors are fully open at 27.1 s and nothing changes after; cut to the next shot at about 27.5 s instead of 29.21.

**6. 14.33 – 20.71: the slab is grey, the face is lost, the profile is dark on dark.**
**FREE** (tried on the frame at 16.88): window on the slab (x below 640, feather 25) −1.5 stops; soft ellipse on the face (centre 775, 190; radii 105×185; feather 30) +1.3 stops; collar −0.7 stop. Result: slab L 55–70, face readable, frame mean 38. Check banding on the lifted face from the master, not from this draft.
**NEW FOOTAGE** only if the lifted face breaks up: the same set-up with her profile in front of the lit part of the slab.

**7. 40.92 – 44.96: no black, flat.**
**FREE** (tried): black point down 11 code values; vignette −1 stop outside a soft ellipse (centre 520, 230; radii 420×200; feather 90); halve the saturation of the blue fill. Result: p5 16 → 3, 5% → 29% below L16.

**8. Q10 has a repeated frame in every four (36.04 – 47.96).** Mean frame difference by phase at 36.04: 1.82, 0.23, 2.74, 1.80. At 40.92: 0.89, 0.36, 0.93, 1.41. Faint at 44.96 because she barely moves. Motion runs at 18 pictures a second and the hand stutters. No Q09 shot and no yard shot has it.
**FREE:** re-conform Q10 without frame repetition, at its native speed or with a motion-interpolated retime.

**9. Yard: three grades, and Karst as a cut-out (0.5 – 14.33).**
**FREE:** (a) Match to the close-ups at 7.83 and 12.54. At 0.5, 1.21, 3.54: mids red +3, blue −3; highlights red +8, blue −7. At 5.29: mids red −2, blue +2; highlights +0.65 stop so the coat reaches L 165–175. (b) 7.0 and 11.71: figure −1.3 stops (window x 330–660, feather 25); black floor raised to (3, 4, 6); mids red −8, blue +8 after the exposure change (tried: p5 0 → 4, coat L 150 → 100). (c) Then one look over the whole yard: mids red −5, green +2, blue +3; highlights +0.3 stop so p99 reaches L 200–210. (d) 3.54 "they watch": remove 15% left, 11% right, 5% top, 21% bottom (a 1.35× push). It loses the sacks and the rows of extras. Do not push 1.21; the bowl is at the bottom of the frame.
**NEW FOOTAGE** to reach the standard: the watchers on a 75–100 mm lens, two faces filling the frame as in `md8/d2_0217`, the crowd one soft texture behind, the camera side flagged dark. Karst in the doorway lit from one side only, at L 40–60, with the dark behind him holding texture, as in `md8/d1_0082`.

**10. 44.96: the coat outshines the face.** **FREE:** gradient on the bottom 18% of the picture (y above 350) −1 stop; warm the coat to match Q09, red +4%, blue −4% in highlights.

**11. 36.04: the lamp globe is clipped.** **FREE:** soft knee from L 225 so the glass sits near L 235 and the flame core at 250, with the same diffusion as fault 5.

**12. No grain, and the darks block.** Temporal noise in flat areas is 0.3–0.5 code values, which is none. The background at 44.96 has 10 code values. Dune was finished through a film-out and carries grain and soft highlights; this is clean video. **FREE:** add 35 mm grain after the grade (about 1.3 code values in mids, 0.7 in shadows), and encode the final at 1080p, 8 Mb/s or more.

## At the standard: keep

- **32.5 Karst at the opening.** As it is. Do not regrade the sky.
- **44.96 Serath's face.** The level, the ratio, the skin. Only cut the light off the coat.
- **23.62 – 24.8, the first 1.2 s of the shutters:** black frame, a blade of sky widening behind a shape.
- **14.33, the design of the profile shot:** long lens, raked inscription, finger in the glyph, kicker from the far side. Keep the take; grade it.
- **20.71: the level** of the wide, the slit and its streak on the floor, and the match across the cut to 23.62.
- **36.04: the low lens** with the sealed sheet large in front and Serath soft at the opening.
- **Yard: 7.83 and 12.54** (both close-ups of Serath) and **5.29** (white between two dark backs).

## Scores against the standard

| | Score | Why |
|---|---|---|
| 14.33 profile at slab | 6 | A Villeneuve design exposed for a grey wall, with her face 4.3 stops under it and off the bright field. |
| 20.71 hall wide | 4.5 | The level is right, but she is follow-spotted by nothing and the room is evenly readable and airless. |
| 23.62 shutters | 5 | The first second is the film; the open state has a clipped sky and a back lit from the camera. |
| 29.21 Serath turns | 3 | A beauty key 2.35 stops hot from the wrong side, in a different film from every shot around it. |
| 32.5 Karst at opening | 7.5 | Sky 5.1 stops over the cheek, as Deakins and Fraser do it; it lacks only grain and a tint in the white. |
| 36.04 lamp | 5.5 | Good depth staging undone by a dusk sky, a clipped globe, two hues and stuttering motion. |
| 40.92 shard | 5 | Correct lens and subject, no black anywhere in the frame. |
| 44.96 face in dark | 7 | Levels and ratio match the Dune Two close-ups; the coat is brighter than her face. |
| **The hall as a whole** | **4.5** | Fair single frames that do not share one room's light: three exposures of one wall and two times of day. |
| **The yard as a whole** | **5** | Two close-ups at 7 carried by television-grade wides, three colour casts and a figure cut out on black. |

With the free grade in faults 1 to 12 applied, I put the hall at about 6 and the yard at about 6. With new footage for 29.21 and 20.71 the hall can reach 7 to 7.5.

## Working files

Frames, contact sheets, measurements and grade trials are in `/tmp/claude-0/-home-user-cines-engine/7b4ce7dc-5a75-55b7-bc06-62a57fcd6546/scratchpad/critics_v22/A/` (`metrics_out.txt`, `sheets/`, `grid/`, `ref/`, `tests/grade_A.jpg`, `tests/grade_B.jpg`). Nothing else in the repository was changed.
