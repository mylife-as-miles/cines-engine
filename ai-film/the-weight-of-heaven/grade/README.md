# The grade: Movement I, the bell

Shot matching, three looks, accent secondaries, grain and the 2.39:1 matte for the opening of *The Weight of Heaven*, as one tool that grades any cut of these shots from its edit list. Pure post-production on the existing takes: nothing was generated and no paid service was used.

**Status.** Three looks are on `look_board.jpg` for the director to choose from; every cell is saved at full size in `board/`. **Recommended: Orison White** (`--look orison`). The v4 cut graded with it, matted, with the v4 sound: `out/review/I_bell_v4_graded_orison.mp4` (not committed: `out/` is ignored).

## Grade a cut

```
cd ai-film/the-weight-of-heaven
python3 tools/grade_bell.py --in out/edits/<cut>.mp4 --edl <cut>.edl.json --look orison --out out/edits/<cut>_graded.mp4 --matte 2.39
ffmpeg -i out/edits/<cut>_graded.mp4 -i out/edits/<cut>.mp4 -map 0:v -map 1:a -c copy out/review/<cut>_graded_orison.mp4
```

- **The edit list** needs a top-level list `picture`; each item has `start` (timeline seconds), `duration` (seconds) and `grade_key`. The keys are the entries of `shots.json`: `Q01:nave`, `Q01:hierophant`, `Q01:reverse`, `Q01:gallery`, `Q02A:unread`, `Q02A:seal`, `Q02B:below`, `Q02:wide`, `Q02B:hammer`, `Q02:cup`, and `black` (title card and black frames: passed through). `I_bell_v4.grade_edl.json` is the v4 cut written this way.
- **Q01 is four keys, not one.** The take cuts inside itself at 6.667, 10.542 and 13.833 s (frames 160, 253 and 332 of the take): an edit list that uses Q01 as one item must split it there.
- **Looks:** `orison`, `belliron`, `vellum`; also `matched` (correction only) and `source` (re-encode only). `--no-grain` leaves the grain off. `--matte 2.39` paints the bars (8 rows top and bottom at 992×432).
- **The output** is video only: H.264, yuv420p, crf 14, tagged BT.709 limited range, with exactly the input's frame count, rate and size (the tool stops with an error if they differ). The second line above puts the cut's own sound back.
- **Frames and cuts.** A frame takes the grade of the item that holds it. Boundaries are rounded to the nearest frame, then moved onto the picture's own hard cut if there is one within three frames, with a warning: v4's own edit list puts the cut to Serath at 16.292 s (frame 391), the picture cuts at frame 392, and the tool finds it. A frame under an unknown key, under `black`, or outside every range passes through with a warning.
- **Time.** The whole v4 cut (834 frames) took 90 s of wall time and 170 s of CPU with the encoder on two threads, while other jobs were running on the machine.
- **Needs** python3 with numpy, and ffmpeg. The board also needs Pillow. The face checks of `--qa` need OpenCV and the YuNet model (`YUNET=/path/face_detection_yunet_2023mar.onnx`); without them the rest of the QA still runs.

Other modes of the same tool:

```
python3 tools/grade_bell.py --measure                                          # re-measure the takes, re-solve the CDLs into shots.json
python3 tools/grade_bell.py --in <cut>.mp4 --edl <edl> --board grade/look_board.jpg   # the look board and its cells
python3 tools/grade_bell.py --in <cut>.mp4 --edl <edl> --qa <graded>.mp4 --matte 2.39 --report grade/qa_<name>.json
```

## The colour path

- **The takes are display-referred Rec.709**, 8-bit, untagged. No log-to-709 transform or display transform is applied anywhere, and no dynamic range is claimed that is not in the file.
- **Untagged video of this size is read as BT.601** by ffmpeg and by players, and that is the picture the reviewers measured. The tool reads an untagged input the same way, grades it, and writes BT.709 with BT.709 tags, so the graded file looks on a tag-aware player as the grade looked here. A tagged input is read by its tag.
- **The correction is an ASC CDL in ACEScct**, as the studio's method asks: decode with a pure 2.4 gamma, Rec.709 to AP1, ACEScct, the CDL, and back by the same road. It is written in numpy and was checked against OpenColorIO 2.6's built-in ACES config (`Gamma 2.4 Encoded Rec.709` to `ACEScct`, then a `CDLTransform`): on real frames of six shots with their own CDLs the two agree to 0.0002 of 255 at the 99.9th percentile and 0.02 at worst. The one deliberate difference: where a CDL lifts white past 1.0 the tool rolls the top off from 0.90 instead of clipping (up to 6 of 255 on about 1% of the pixels of the shots whose white is raised), so that the correction adds no clipping.
- **Each shot's correction and look are baked into one 97-point 3D LUT.** Against the exact maths on real frames of eight shots the LUT is off by 0.04 of 255 on average, 0.53 at the 99.9th percentile and 1.2 at worst (Orison White; the worst pixels are dark, faintly coloured ones).
- **Honest labels.** The correction is colour-managed (known input, transform, output, measured). The looks are *looks*: "after Villeneuve" means inspired by, at the level of controls; no reference still was matched and no film stock is emulated.
- **Order:** correction, look, accents, shaping, grain, matte. No halation and no bloom: the scene is overcast daylight with no practical light.

## What was wrong, and what the correction does

The hero is `Q02A:unread`: Serath and the aide, the best-exposed face shot. Every other shot is measured on its source range (the cropped and rescaled picture where the film crops) and pulled part of the way toward it.

**What the measurements say.** The reviewers' numbers are right, and most of the spread is content, not grade:

- **Black point.** The 1st percentile runs from 2.5 to 52.5 of 255. The low end is the groom's black hair filling a corner of `Q01:hierophant`; the high end is the wides and the gallery, which have nothing dark in them larger than a head. The darkest 0.1% of the nave is at 21, not 50: it is not veiled, it is empty of darks. Subtracting a veil in linear light that brings its 1st percentile down to the hero's would put everything under 43 of 255 at zero.
- **Tint.** Like for like, the world is the same in every take: ivory cloth, paper and shaded marble sit at R−B +11 to +16, marble in open light at +4 to +6, the open sky at −3 to −4. The "21 points between cool and cream" is mostly how much sky or cloth fills the frame. The one real mismatch is `Q02B:below`, whose sky is at −8.2.
- **Brightness.** `Q02B:below` has the highest median (176 against about 150) because it is mostly sky. Its sky (220) and the aide's coat (141) are no brighter than the hero's (232 and 163).
- **Saturation.** By mean saturation `Q02:cup` is the most saturated shot (0.14 against 0.06 to 0.10 in the cut), because the gold and the wine fill about 15% of the frame. Its median chroma (3.4) sits among the others' (2.6 to 5.2): its marble and cloth are as neutral as everyone else's.

So the correction is small, and the look and the per-shot shaping carry what the reviewers asked for (structure, a dark anchor, accents).

**Per shot, source range → matched** (display code values of 255; neutral cast is R−B of the least saturated 30% of pixels, highlight tint is R−B between the 80th and 98th percentile, chroma is the vectorscope radius):

| Shot | Black (1st pct) | White (99th pct) | Median | Neutral cast (R−B) | Highlight tint (R−B) | Saturation (median chroma) |
| --- | --- | --- | --- | --- | --- | --- |
| `Q01:nave` | 50.0 → 47.3 | 240.1 → 239.2 | 152.9 → 148.0 | +1.2 → +1.6 | +0.4 → +0.5 | 3.7 → 3.8 |
| `Q01:hierophant` | 2.5 → 2.5 | 225.9 → 233.4 | 146.1 → 150.1 | +1.1 → +1.1 | +9.2 → +8.2 | 3.7 → 3.5 |
| `Q01:reverse` | 32.6 → 32.2 | 244.7 → 241.2 | 131.2 → 128.6 | +1.2 → +1.1 | +3.4 → +2.7 | 2.6 → 2.6 |
| `Q01:gallery` | 51.4 → 51.3 | 240.0 → 239.2 | 150.2 → 149.9 | +2.5 → +2.0 | +3.9 → +2.3 | 5.2 → 4.7 |
| `Q02A:unread` | 30.9 → 30.9 | 238.8 → 238.8 | 151.3 → 151.3 | +0.4 → +0.4 | -1.4 → -1.4 | 4.4 → 4.4 |
| `Q02A:seal` | 28.9 → 29.2 | 216.4 → 229.6 | 135.5 → 142.0 | +1.4 → +1.2 | +9.9 → +8.4 | 4.5 → 4.1 |
| `Q02B:below` | 11.6 → 11.6 | 234.3 → 236.8 | 176.2 → 178.2 | -0.0 → -0.1 | -4.4 → +1.0 | 2.9 → 2.5 |
| `Q02:wide` | 52.5 → 49.6 | 241.3 → 239.8 | 153.0 → 147.6 | +0.8 → +0.9 | -0.4 → +0.1 | 3.8 → 3.8 |
| `Q02B:hammer` | 27.5 → 27.6 | 230.8 → 235.4 | 119.3 → 121.1 | +0.6 → +0.9 | -2.6 → -1.9 | 2.9 → 3.1 |
| `Q02:cup` | 6.8 → 6.8 | 219.0 → 219.0 | 143.6 → 143.6 | -0.9 → -0.6 | -0.7 → +0.2 | 3.4 → 3.2 |

**The CDLs** (ACEScct; every one pivots on display black, so black is neither lifted nor crushed):

| Shot | Slope R / G / B | Offset R / G / B | Power | Sat | What it does |
| --- | --- | --- | --- | --- | --- |
| `Q01:nave` | 1.0273 / 1.0263 / 1.0275 | +0.02162 / +0.02170 / +0.02161 | 1.120 | 1.00 | the wide has nothing dark in it: the 1st percentile comes part of the way down to the hero's by the power (at its limit, 1.12) |
| `Q01:hierophant` | 1.0138 / 1.0145 / 1.0165 | -0.00101 / -0.00105 / -0.00120 | 1.000 | 1.00 | white up (226 → 233, about a tenth of a stop); the crushed hair is left where it is |
| `Q01:reverse` | 1.0011 / 1.0013 / 1.0025 | +0.00502 / +0.00501 / +0.00492 | 1.027 | 1.00 | nearly nothing: white a touch down |
| `Q01:gallery` | 0.9981 / 0.9989 / 1.0010 | +0.00014 / +0.00008 / -0.00007 | 1.000 | 1.00 | cast only; the power is held at 1 by hand (see the trim) |
| `Q02A:unread` | 1.0000 / 1.0000 / 1.0000 | +0.00000 / +0.00000 / +0.00000 | 1.000 | 1.00 | the hero: identity |
| `Q02A:seal` | 1.0240 / 1.0266 / 1.0271 | -0.00175 / -0.00194 / -0.00197 | 1.000 | 1.00 | white up (216 → 230, about a fifth of a stop): the close-up was the dullest exposure |
| `Q02B:below` | 1.0085 / 1.0044 / 1.0015 | -0.00062 / -0.00032 / -0.00011 | 1.000 | 1.00 | a warm white balance by hand (see the trim); exposure left alone |
| `Q02:wide` | 1.0260 / 1.0249 / 1.0256 | +0.02172 / +0.02180 / +0.02174 | 1.120 | 1.00 | as the opening nave |
| `Q02B:hammer` | 1.0093 / 1.0085 / 1.0084 | -0.00068 / -0.00062 / -0.00061 | 1.000 | 1.00 | white a touch up |
| `Q02:cup` | 1.0003 / 1.0000 / 0.9987 | -0.00002 / +0.00000 / +0.00009 | 1.000 | 1.00 | nothing: its 99.9th percentile is already at clipping (the gold's speculars), so white is not raised |

**How the solve works** (`--measure`): white, the 99th percentile, moves 60% of the way to the hero's by the slope, never more than a third of a stop, never so far that the shot's own 99.9th percentile reaches clipping. Black, the 1st percentile, moves 35% of the way *down* to the hero's by the power, limited to 1.12; a shot darker than the hero is left alone. The near-neutral cast moves 70% of the way by per-channel slopes. Saturation is left at 1.00, because whole-frame chroma follows what is in the frame. Two trims by hand, each with its reason in `shots.json`:

- `Q02B:below`: a warm white balance (+0.0011 red, −0.0011 blue at white), which takes its sky from R−B −8.2 to −2.9, beside the hero's −3.1.
- `Q01:gallery`: the power held at 1.0. Its faces already sit where the hero's do (0.24–0.37 against 0.26–0.36); pulling its mid-tones down to "fix" a black point that is only an absence of dark things would darken faces that already match.

**Like for like, source → matched** (one patch at one source frame):

| Shot | Patch | Kind | Luma: source → matched | R−B: source → matched |
| --- | --- | --- | --- | --- |
| `Q01:nave` | floor | ivory | 173 → 168 | +3.8 → +4.0 |
| `Q01:nave` | sky in the far arch | sky | 219 → 217 | -3.8 → -3.9 |
| `Q01:nave` | the bell | dark | 91 → 86 | +2.8 → +2.7 |
| `Q01:hierophant` | his robe | ivory | 186 → 192 | +12.6 → +11.7 |
| `Q01:hierophant` | the groom's hair | dark | 7 → 7 | -4.2 → -4.3 |
| `Q01:reverse` | his hat | ivory | 125 → 122 | +15.7 → +15.1 |
| `Q01:reverse` | the bell | dark | 57 → 56 | +1.3 → +1.2 |
| `Q01:gallery` | the balustrade | ivory | 154 → 154 | +13.9 → +12.7 |
| `Q01:gallery` | sky | sky | 177 → 176 | +2.6 → +1.1 |
| `Q02A:unread` | Serath's coat | ivory | 163 → 163 | +12.7 → +12.7 |
| `Q02A:unread` | the aide's coat | ivory | 165 → 165 | +11.6 → +11.6 |
| `Q02A:unread` | sky | sky | 232 → 232 | -3.1 → -3.1 |
| `Q02A:unread` | Serath's hair | dark | 46 → 46 | +5.5 → +5.5 |
| `Q02A:seal` | the paper | ivory | 191 → 202 | +12.3 → +11.1 |
| `Q02A:seal` | the glove | ivory | 110 → 115 | +2.5 → +1.7 |
| `Q02B:below` | the aide's coat | ivory | 141 → 142 | +13.9 → +16.8 |
| `Q02B:below` | sky | sky | 220 → 223 | -8.2 → -2.9 |
| `Q02B:below` | the aide's hair | dark | 11 → 11 | -4.2 → -4.2 |
| `Q02B:below` | the bell | dark | 18 → 18 | +0.6 → +0.7 |
| `Q02:wide` | floor | ivory | 170 → 165 | +5.1 → +5.6 |
| `Q02B:hammer` | the column | ivory | 128 → 130 | +5.9 → +6.4 |
| `Q02B:hammer` | the bell | dark | 86 → 87 | +6.5 → +6.8 |
| `Q02B:hammer` | the hammer head | dark | 37 → 38 | +1.1 → +1.2 |
| `Q02:cup` | the marble counter | ivory | 179 → 179 | -2.8 → -2.0 |
| `Q02:cup` | the wine | dark | 8 → 8 | +14.5 → +14.6 |

## The three looks

| | A. Orison White (`orison`) | B. Bell Iron (`belliron`) | C. Illuminated Vellum (`vellum`) |
| --- | --- | --- | --- |
| In one line | The script's white, weightless world, with a tonal ladder and the three accents at full strength | Austere, after Villeneuve: cool slate neutrals, dense greys under a held-back white, the deepest blacks | Storybook epic: a soft filmic curve, ivory light over cooler shade, richer skin, gold leaf and vermilion |
| Contrast architecture | High key. Peak white stays at 1.0. A pivot at 0.58 with a slope of about 1.2 through the whites that carry the picture (0.47 → 0.45, 0.70 → 0.73, 0.85 → 0.88). Blacks under 0.12 let down a little (0.07 → 0.052) | Low key. White held at 0.955 (243 of 255); the whites a step down (0.60 → 0.545, 0.75 → 0.70, 0.88 → 0.84); the deepest toe (0.07 → 0.042) | Middle key and soft. A gentler toe (0.08 → 0.07), a slope of about 1.08 through the middle (0.75 → 0.77), a shoulder rolled off to 0.975 |
| Dark skin (0.18–0.35) | Held (0.35 → 0.345) | Slightly down (0.24 → 0.228, 0.35 → 0.325) | Held (0.25 → 0.245) |
| Neutrals | Keep 22% of their chroma: cream goes to white. A trace of cool in the shadows only | Keep 25%, then a cool tint: shadows −0.014 / +0.016, mids −0.009 / +0.011, highlights −0.005 / +0.007 (red / blue) | Keep 55%, then split: highlights warm +0.011 / −0.015, mids +0.004 / −0.006, shadows cool −0.005 / +0.007 |
| Serath's coat, R−B (source +12.8) | +3.5 | -1.1 | +10.9 |
| Skin and other colour | Saturation 1.00; a fifth of the tint reaches it | 1.00; a fifth | 1.10; three tenths |
| Gold | Chroma ×1.5, 10° toward yellow, +10% | ×1.3, 7°, +5% | ×1.55, 11°, +12% |
| Seal red | Chroma ×2.6, 2° toward crimson, +10% | ×2.4, 3° toward crimson, +12% | ×2.8, no turn, +12% |
| Wine | Lifted by a 0.48 gamma under 0.45, chroma ×1.15 | 0.42 gamma, ×1.1 | 0.46 gamma, ×1.2 |
| Collar gold RGB (source (145, 115, 79)) | (165, 129, 57) | (141, 112, 62) | (172, 132, 47) |
| Wax RGB (source (79, 47, 48)) | (121, 41, 46) | (111, 40, 48) | (134, 38, 42) |
| Wine RGB (source (21, 4, 7)) | (50, 8, 16) | (50, 9, 18) | (57, 6, 16) |
| Haze and the dark anchor | Haze ×1.0, a near-neutral veil; deepen ×1.0 | Haze ×1.4, a cool veil; deepen ×1.3 | Haze ×0.8, a warm veil; deepen ×0.8 |
| Grain (sd at mid-grey, size, colour share) | 0.013 (3.3 of 255), 1.1 px, 10% | 0.018 (4.6 of 255), 1.3 px, 10% | 0.016 (4.1 of 255), 1.5 px, 14% |

Every look keeps 0 at 0, so picture black matches the matte and a black title card, and none has a vignette, teal-and-orange, bloom or halation. The board's cells carry the grain and no matte.

**The same patches in the v4 cut, per look** (luma of 255 / R−B):

| Shot | Patch | Kind | Source | Orison White | Bell Iron | Illuminated Vellum |
| --- | --- | --- | --- | --- | --- | --- |
| `Q01:nave` | floor | ivory | 173 / +3.8 | 174 / +0.1 | 154 / -3.8 | 173 / +6.2 |
| `Q01:nave` | sky in the far arch | sky | 219 / -3.5 | 224 / -0.9 | 206 / -4.7 | 220 / +3.7 |
| `Q01:nave` | the bell | dark | 91 / +2.5 | 55 / +0.0 | 43 / -3.9 | 61 / +1.1 |
| `Q01:hierophant` | his robe | ivory | 186 / +12.5 | 200 / +3.1 | 180 / -0.9 | 197 / +10.5 |
| `Q01:hierophant` | the groom's hair | dark | 7 / -4.1 | 6 / -3.8 | 5 / -4.0 | 6 / -4.3 |
| `Q01:reverse` | his hat | ivory | 125 / +15.7 | 118 / +4.7 | 109 / -0.3 | 123 / +11.5 |
| `Q01:reverse` | the bell | dark | 57 / +1.4 | 55 / -1.0 | 53 / -6.7 | 55 / +0.1 |
| `Q01:gallery` | the balustrade | ivory | 154 / +13.9 | 158 / +3.7 | 141 / -0.8 | 158 / +11.0 |
| `Q01:gallery` | sky | sky | 177 / +2.5 | 180 / +0.2 | 163 / -4.4 | 179 / +4.2 |
| `Q02A:unread` | Serath's coat | ivory | 163 / +12.8 | 167 / +3.5 | 149 / -1.1 | 166 / +10.9 |
| `Q02A:unread` | the aide's coat | ivory | 165 / +11.5 | 169 / +3.0 | 152 / -2.2 | 169 / +10.0 |
| `Q02A:unread` | sky | sky | 232 / -3.2 | 236 / -0.5 | 222 / -4.7 | 233 / +3.6 |
| `Q02A:unread` | Serath's hair | dark | 46 / +5.2 | 44 / +4.2 | 40 / +0.1 | 44 / +4.9 |
| `Q02A:seal` | the paper | ivory | 191 / +12.3 | 211 / +2.2 | 191 / -0.3 | 208 / +11.5 |
| `Q02A:seal` | the glove | ivory | 110 / +2.5 | 111 / -0.9 | 103 / -6.0 | 115 / +2.2 |
| `Q02B:below` | the aide's coat | ivory | 141 / +13.9 | 143 / +5.5 | 129 / +1.5 | 144 / +14.1 |
| `Q02B:below` | sky | sky | 220 / -8.2 | 209 / -0.1 | 192 / -4.0 | 206 / +3.4 |
| `Q02B:below` | the aide's hair | dark | 11 / -4.1 | 9 / -3.2 | 7 / -4.2 | 10 / -4.4 |
| `Q02B:below` | the bell | dark | 18 / +0.6 | 14 / -1.9 | 12 / -5.4 | 16 / -2.0 |
| `Q02:wide` | floor | ivory | 170 / +5.1 | 171 / +0.5 | 152 / -3.6 | 170 / +6.9 |
| `Q02B:hammer` | the column | ivory | 128 / +6.0 | 121 / +0.6 | 106 / -3.6 | 126 / +5.7 |
| `Q02B:hammer` | the bell | dark | 86 / +6.6 | 70 / +1.0 | 59 / -2.7 | 73 / +4.2 |
| `Q02B:hammer` | the hammer head | dark | 37 / +1.1 | 18 / -0.0 | 17 / -3.9 | 19 / +0.0 |
| `Q02:cup` | the marble counter | ivory | 179 / -2.8 | 186 / -0.2 | 165 / -5.7 | 184 / +3.2 |
| `Q02:cup` | the wine | dark | 8 / +14.5 | 17 / +33.8 | 18 / +31.4 | 18 / +40.8 |

## The accents

Each accent is keyed on the *matched* picture (so the key does not move with the look), by hue, saturation and value, softened, and limited per shot to a soft rectangle; then the look's push is applied to the looked picture. Only these shots have accents:

| Shot | Accent | Where | Why there |
| --- | --- | --- | --- |
| `Q02A:unread` | gold | a rectangle on Serath's collar (columns 545–642, rows 168–204) | The gold key (hue 27–56°) overlaps skin at its edge: the collar measures 26–37°, and on every face in this shot a few yellow-brown pixels at 22–27° are caught. The rectangle starts below her chin (row 157), so no face is in it |
| `Q02A:unread` | seal | a rectangle on the wax (columns 362–430, rows 355–432) | The seal key (hue 340–9°) covers every face in the shot: red-brown skin and red wax cannot be keyed apart, so the region does it. A small face appears 65 pixels to the right of the wax late in the shot; the rectangle ends short of it |
| `Q02A:seal` | seal | whole frame | No skin: gloves |
| `Q02B:below` | seal | the raised warrant's path (columns 470–992, rows 0–340), with the aide's head cut out (columns 470–636, rows 150–432) | His ear and neck are the wax's hue. Before the cut-out his ear went red: seen in the first render and fixed |
| `Q02:cup` | gold, wine | whole frame | No skin: gloves and cloth out of focus |

No other shot has an accent, so the Hierophant's face and every gallery face are never keyed. The QA checks this on the render's frames: in every shot with an accent, each key inside its region is tested against every face YuNet finds (weak detections included), and none may reach a face pixel.

## The shaping, per shot

| Shot | Shaping | Why |
| --- | --- | --- |
| `Q01:nave`, `Q02:wide` | Whole frame: darks under 0.45 let down (amount 0.5) | The wides have no blacks: the crowd's hair and the gaps between figures. No face in them is more than a few pixels |
| `Q01:nave`, `Q02:wide` | A soft rectangle on the bell and its fall: let down hard (amount 0.9 under 0.75) | The bell as the dark anchor of the pale frame: 91 → 55 of 255 in the nave in Orison White |
| `Q01:nave`, `Q02:wide` | A lighten-only veil over the top half, 10% at the top row | The vault goes into cloud light: depth |
| `Q02B:hammer` | Whole frame: darks under 0.65 let down (amount 0.7) | The bronze as the darkest thing in the frame (bell 86 → 70, hammer head 37 → 18 in Orison White); no skin in the shot |
| `Q02B:below` | Density in the sky only: luma between 0.6 and 0.93 down by up to 0.08 | The shot is mostly sky, so it cuts in brighter than the seal before it and the nave after it. Cloth and hair stay where the hero has them |

## How well the shots now match

| Statistic over the ten shots (v4 cut) | Source | Orison White | Bell Iron | Illuminated Vellum |
| --- | --- | --- | --- | --- |
| Neutral cast, R−B of the least saturated 30% of pixels | -1.0 to +2.7 (spread 3.7) | -0.0 to +0.2 (spread 0.2) | -2.7 to -0.4 (spread 2.3) | +0.8 to +3.0 (spread 2.2) |
| Highlight tint, R−B between the 80th and 98th percentile | -5.7 to +10.0 (spread 15.7) | -0.2 to +6.5 (spread 6.7) | -4.4 to -0.6 (spread 3.8) | +4.4 to +10.7 (spread 6.3) |
| White point, 99th percentile | 216.4 to 244.7 (spread 28.3) | 216.9 to 243.6 (spread 26.7) | 204.1 to 230.8 (spread 26.7) | 214.6 to 240.1 (spread 25.5) |
| Black point, 1st percentile | 2.5 to 53.3 (spread 50.8) | 2.3 to 51.0 (spread 48.7) | 2.3 to 48.7 (spread 46.4) | 2.3 to 49.9 (spread 47.6) |
| Median | 118.3 to 183.0 (spread 64.7) | 106.7 to 175.1 (spread 68.4) | 94.0 to 165.9 (spread 71.9) | 114.8 to 174.0 (spread 59.2) |
| Saturation, median chroma | 2.6 to 5.2 (spread 2.6) | 0.0 to 1.2 (spread 1.2) | 1.5 to 1.8 (spread 0.3) | 2.1 to 4.1 (spread 2.0) |
| Like for like: R−B of the twelve cloth, paper and marble patches | -2.8 to +15.7 (spread 18.5) | -0.9 to +5.5 (spread 6.4) | -6.0 to +1.5 (spread 7.5) | +2.2 to +14.1 (spread 11.9) |
| Like for like: R−B of the four sky patches | -8.2 to +2.5 (spread 10.7) | -0.9 to +0.2 (spread 1.1) | -4.7 to -4.0 (spread 0.7) | +3.4 to +4.2 (spread 0.8) |

- **What now matches:** white. In Orison White the neutral cast of every shot is between -0.0 and +0.2; the four sky patches are within 1.1 of each other (source 10.7); the twelve cloth, paper and marble patches within 6.4 (source 18.5).
- **The highlight tint row** is led in Orison White by `Q02:cup` (+6.5), whose highlights are the gold itself; the next shot is at +2.2.
- **What does not, and should not:** the black point and the median still differ from shot to shot, because a close shot of a bronze bell and a wide of a white nave are different pictures. The like-for-like rows are the test of the match, not the whole-frame ones.

## Recommendation: Orison White

- **It is the only look in which white reads white.** Serath's coat goes from R−B +12.8 to +3.5, the sky behind her from -3.2 to -0.5. Vellum leaves the coat at +10.9, close to the cream the reviewers saw.
- **It gives the frame a ladder without taking its paleness away.** In the nave: sky 224, floor 174, bell 55 (source 219, 173, 91). "A dark anchor in a pale frame" needs the frame to stay pale; in Bell Iron the floor is 154 and the sky 206, a grey frame.
- **The three accents are strongest against neutral white:** wax (79, 47, 48) → (121, 41, 46), collar (145, 115, 79) → (165, 129, 57), wine (21, 4, 7) → (50, 8, 16).
- **It leaves skin alone:** Serath 0.261 → 0.256, hue within 0.8°. Bell Iron takes her to 0.239.
- **It is the script.** Above, everything is white and weightless; the weight is the bell. Bell Iron is the stronger image shot by shot and the closest to Villeneuve's density, but its cool grey leans toward the "dystopian science fiction" the reviewers reported, and it spends in the first 35 seconds the weight the film needs to find later, below.
- **If the director wants more density than Orison has,** the cheapest step is Orison with Bell Iron's shaping (`"haze": {"gain": 1.4}, "deepen_gain": 1.3` in `looks.json`), before changing its curve.

The risk in choosing it: it is the cleanest of the three, and the reviewers' "clean render" was partly the design (blank banners, plain marble), which no grade changes. The grain, the bell and the accents are what it has against that.

## QA of Orison White on the v4 cut

Measured on the render (`qa_I_bell_v4_orison.json`), every second frame of every shot, inside the matte; faces by YuNet on three frames per shot, the centre half of each box. The same report exists for the other two looks.

- **File:** 834 frames from 834; 24/1 fps; 992×432; 34.75 s; h264 yuv420p; tags bt709 / bt709 / bt709 / tv: all as required. The review copy's video stream is bit-identical to the checked render and its sound is bit-identical to v4's (MD5 of both).
- **Clipping and crushing** (any channel at 0.985 or over; luma at 0.015 or under): clipping grows by 0.004 points at worst (`Q02:cup`, 0.242% → 0.246%; the studio's tolerance is 0.3) and falls in most shots. Crushing grows by 0.17 points at worst, in `Q01:hierophant`, where the groom's hair is already crushed in the source (2.09% → 2.26%); the studio's tolerance is 0.5.
- **Accents and skin:** 17 face detections on the checked frames of the shots that have an accent; the accent keys reach 0 pixels inside them. A denser pass on every third frame of those four shots: 116 detections, 0 pixels.
- **Result:** 10 shots, 0 failing.

| Shot (starts at) | Black (1st pct) | White (99th pct) | Median | Neutral cast (R−B) | Saturation (median chroma) | Clipped % | Crushed % | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Q01:nave` (0.00 s) | 51.2 → 45.2 | 240.1 → 242.4 | 153.0 → 150.8 | +1.2 → -0.0 | 3.7 → 1.1 | 0.04 → 0.01 | 0.00 → 0.01 | pass |
| `Q01:hierophant` (6.67 s) | 2.5 → 2.3 | 225.9 → 237.8 | 146.0 → 151.9 | +1.0 → -0.0 | 3.7 → 1.1 | 0.00 → 0.00 | 2.09 → 2.26 | pass |
| `Q01:reverse` (10.54 s) | 33.5 → 31.3 | 244.7 → 243.6 | 131.9 → 125.3 | +1.2 → +0.0 | 2.6 → 0.0 | 0.04 → 0.00 | 0.00 → 0.00 | pass |
| `Q01:gallery` (13.83 s) | 51.2 → 51.0 | 239.8 → 241.3 | 149.7 → 151.9 | +2.7 → +0.2 | 5.2 → 1.2 | 0.01 → 0.00 | 0.00 → 0.00 | pass |
| `Q02A:unread` (16.33 s) | 30.9 → 29.0 | 238.9 → 242.4 | 151.3 → 153.1 | +0.4 → -0.0 | 4.4 → 1.2 | 0.00 → 0.00 | 0.00 → 0.00 | pass |
| `Q02A:seal` (19.00 s) | 28.8 → 27.8 | 216.4 → 234.3 | 136.8 → 143.8 | +1.4 → -0.0 | 4.5 → 1.1 | 0.00 → 0.00 | 0.00 → 0.01 | pass |
| `Q02B:below` (22.38 s) | 11.7 → 9.3 | 229.7 → 216.9 | 183.0 → 175.1 | -0.9 → +0.0 | 3.2 → 0.0 | 0.00 → 0.00 | 0.00 → 0.00 | pass |
| `Q02:wide` (24.50 s) | 53.3 → 46.4 | 241.4 → 242.4 | 153.1 → 150.8 | +0.7 → -0.0 | 3.8 → 1.1 | 0.01 → 0.00 | 0.00 → 0.00 | pass |
| `Q02B:hammer` (28.50 s) | 25.5 → 11.6 | 232.1 → 240.1 | 118.3 → 106.7 | +0.6 → +0.0 | 2.9 → 0.1 | 0.03 → 0.02 | 0.00 → 0.04 | pass |
| `Q02:cup` (32.25 s) | 6.8 → 15.1 | 219.9 → 229.7 | 142.6 → 145.0 | -1.0 → +0.0 | 3.5 → 1.1 | 0.24 → 0.25 | 0.01 → 0.00 | pass |

**Faces** (accepted between 0.18 and 0.88; a grade may not push skin more than 3° further off the skin line once past 8°):

| Face | Frames | Brightness (0–1): source → graded | Hue on the vectorscope: shift | Off the skin line (123°): source → graded | Chroma: source → graded |
| --- | --- | --- | --- | --- | --- |
| Serath (deep brown skin) | 3 | 0.261 → 0.256 | -0.8° to +0.1° | 4.1–6.7° → 4.0–7.6° | 16.1 → 15.8 |
| The aide (brown skin) | 3 | 0.360 → 0.355 | -0.5° | 1.4–2.1° → 1.9–2.6° | 25.1 → 24.8 |
| The Hierophant (warm brown skin) | 3 | 0.347 → 0.353 | -0.9° to -0.4° | 2.0–4.1° → 2.4–5.0° | 18.3 → 18.7 |
| The 31 other faces of 16 px or more | 3 per shot | lowest 0.160 → 0.159; brightest graded 0.337 | -1.0° to +2.3° (median +0.2°) | | |

- 3 of the other faces are under 0.18 in the grade; the same 3 are under it in the source (small gallery faces in shade, lowest 0.160 → 0.159). They are not taken further, and the grade cannot lift them without lifting the gallery.
- 20 detections under 16 pixels wide (far gallery faces) were left out: their centre patch is a few dozen pixels of grain.
- No face is near the top of the range (brightest 0.337).

**The three looks side by side:**

| Look | Serath: brightness, hue shift | Aide | Hierophant | Clipping growth (worst shot) | Crushing growth (worst shot) | Shots failing |
| --- | --- | --- | --- | --- | --- | --- |
| Orison White | 0.261 → 0.256, -0.8° to +0.1° | 0.360 → 0.355, -0.5° | 0.347 → 0.353, -0.9° to -0.4° | +0.00 | +0.17 | none |
| Bell Iron | 0.261 → 0.239, -0.5° to -0.2° | 0.360 → 0.328, -0.7° to -0.3° | 0.347 → 0.325, -0.8° to -0.2° | +0.00 | +0.32 | `Q01:gallery` |
| Illuminated Vellum | 0.261 → 0.258, -0.3° to +0.4° | 0.360 → 0.359, -0.3° to +0.0° | 0.347 → 0.355, -0.3° to +0.1° | +0.01 | +0.02 | none |

Bell Iron's failing shot is the gallery: 1 small face in shade (17 by 21 pixels), already under 0.18 in the source (0.17), goes to 0.15: its denser curve takes what is already dark further.

**Also checked:**

- **Re-render:** the same input twice gives the same file (MD5), so the grain is the same on every render.
- **A cut with a title card:** a test cut of one second of black, two seconds of the nave, half a second under an unknown key and half a second outside every range came out with the same 96 frames; the black frames at 0, the unknown and uncovered frames within 0.7 of 255 of the source (the re-encode), each with its warning.
- **By eye,** on frames from the render at every shot and on both sides of all nine cuts: the grade changes on the right frame at every cut; no edge of a region shows; no banding in the skies under the grain; the wine has no dark specks (an earlier key left some, and the key was widened and softened).
- **The matte** cuts no face and no action. The top of the Hierophant's hat touches the top bar. After the encode the bars average 0.1 of 255 and 99.9% of their pixels are under 4.4; the rows that touch the picture reach 21 at one pixel (chroma interpolation at the edge of a 4:2:0 picture).

## What the grade cannot fix

1. **Softness of the two enlarged shots.** `Q02B:below` (a 76% crop) and `Q02B:hammer` (77%) are softer than their neighbours; by a crude measure the strongest edges in `Q02B:below` are 87 of 255 across two pixels against 100 to 170 in the other shots. The grain evens the texture and adds no detail. No sharpening was added: the cut already sharpens both.
2. **Crushed hair.** The groom's hair in `Q01:hierophant` is at or under 0.015 over 2.1% of the frame in the source. There is nothing in it to bring back.
3. **Shadowless light.** The grade separates values that exist (sky, lit cloth, shaded marble, skin, bronze). It cannot give a figure a shadow side: where cloth and wall share a value in the source they still do.
4. **The wine has little to give.** In the source it is 8-bit code values of about 16 to 35 in red and 0 to 18 in green and blue; Orison White multiplies its red by 2.3 (about 8 times in linear light). It holds as garnet on the frames checked; a brighter wine would show the codec.
5. **The generator's own continuity,** from the review: the bell hangs from a bare beam in the nave, a rig in the wide and a beam with a hammer in the close shots; the chains fall from under it; the aisle group is three figures, then four; the banners are blank. The grade makes the bell consistently dark, not consistently built.
6. **Dark flecks in the sky of the hammer shot** (petals or debris in the take) get darker with the bell.
7. **Without grain** (`--no-grain`) the white gradients are 8-bit and may band; the grain is doing that work.

## What to know before grading a new cut

- **Regions are fixed rectangles in the film's 992×432 frame**, after the film's crop. A new crop, a punch-in, a push or a camera shake on `Q02A:unread`, `Q02B:below`, `Q01:nave` or `Q02:wide` moves what is under them. The reviewers suggest a 150% punch-in on the wide and a slow push on the opening nave: either needs its bell rectangle moved in `shots.json` (or the shot graded before the move). The other six shots have no regions.
- **`Q02B:below` fails safe:** if a new in-point shows the warrant crossing the aide's head, the wax there stays dull rather than his ear turning red.
- **A new part of a take needs its own key** if it is a different shot (Q02A before 8.58 s is a different set-up).
- **The file is large:** crf 14 with grain is about 8 Mbit/s (36 MB for 35 s), against 1 Mbit/s for the cut.

## Files

| Path | What it is |
| --- | --- |
| `tools/grade_bell.py` | The tool: grade, `--measure`, `--board`, `--qa` |
| `grade/shots.json` | Per grade_key: source, measurements, the CDL and its trim, like-for-like patches, accents and their regions, shaping |
| `grade/looks.json` | The three looks, the accent keys, the board's moments |
| `grade/look_board.jpg`, `grade/board/` | The board (source, matched, three looks on five moments) and its 25 cells at full size |
| `grade/I_bell_v4.grade_edl.json` | The v4 cut's ranges with grade keys |
| `grade/qa_I_bell_v4_<look>.json` | The QA of each look on the v4 cut |
| `out/review/I_bell_v4_graded_orison.mp4` | The v4 cut in the recommended look, matted, with the v4 sound (not committed) |
