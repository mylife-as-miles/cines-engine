# Movement I, the bell: cut v5

Made after the five reviews of v4 (`edit/reviews/I_bell_v4_review.md`) and the author's instruction of 25 November: fix the sound, the rhythm and the look by editing, build the script's opening, and have several agents work on it. Nothing was generated on fal. Four agents and the editor: the picture re-cut (the editor), an original sound library and choir, the colour grade, and the mix.

**Review file:** `out/review/I_bell_v5.mp4` (36.29 s, 871 frames, 992×432 matted to 2.39:1). Master: `out/edits/I_bell_v5_C_orison_snd.mp4`.

**How it is built** (`tools/finish_bell.py`): `tools/cut_bell.py --flat` (the cut, frame-accurate, with nothing that moves the frame) → `tools/grade_bell.py --no-grain` (correction, look, accents, shaping) → the push, shakes and fades → grain once → the 2.39:1 matte → the mix from `tools/mix_bell.py`.

## Picture

| # | Starts | Shot | Take | Source (s) | Length (s) | Purpose |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0:00.00 | Black, the stroke, the super | (made in the edit) |  | 3.75 | A01 and A05: one bell stroke over black; "THE KINGDOM OF ORISON. YEAR 800 OF THE ASCENSION." |
| 2 | 0:03.75 | The nave | Q01_t1 | 0.00–6.67 | 6.67 | Fades up out of the black on the stroke's decay; a slow push toward the bell; the first line plays over it. |
| 3 | 0:10.42 | The Hierophant | Q01_t1 | 8.00–10.54 | 2.54 | Enters as his eyes open; his arms rise. |
| 4 | 0:12.96 | From behind him, up to the bell | Q01_t1 | 10.54–13.83 | 3.29 | Carries "What heaven has raised". |
| 5 | 0:16.25 | The gallery | Q01_t1 | 13.83–15.25 | 1.42 | Only as long as the answer needs; its last words land on Serath. |
| 6 | 0:17.67 | Unread | Q02A_t2 | 8.67–10.54 | 1.88 | Her hand goes out, her eyes stay up; out while the hand is still moving. |
| 7 | 0:19.54 | The seal | Q02A_t2 | 11.50–14.42 | 2.92 | The ring into the wax; the seal left on the page. |
| 8 | 0:22.46 | The warrant raised, up to the bell | Q02B_t1 | 0.46–2.25 | 1.79 | In with the warrant already rising, so the red seal carries the eye across the cut. |
| 9 | 0:24.25 | The release, from below | Q02B_t1 | 2.25–4.62 | 2.62 | The tilt carries on: the four chains go slack and swing, dust falls on the bell. Slowed to 80%. A small shake as the weight lands. |
| 10 | 0:26.88 | The hammer and the stroke | Q02B_t1 | 7.21–9.62 | 2.42 | Hauled back in near silence, the stroke two seconds in, out ten frames later while the note blooms. A shake on the stroke. |
| 11 | 0:29.29 | The still cup | Q02_t1 | 24.75–26.04 | 5.50 | Half speed, played forward, back and forward again: 5.5 s of perfectly still wine, locked off, fading to black. |
| 12 | 0:34.79 | Black | (made in the edit) |  | 1.50 | The note rings out. |

The release exists in three versions of the same length (`--release A|B|C`): A the wide as it was, B the wide enlarged 1.5 times on the tower and slowed, C the bell from below as the chains go slack (in the main cut). `out/review/I_bell_v5_release_options.mp4` shows all three.

Not changed, and why: the bell is in the first frame because the script puts it there ("still slung in the chains of the fleet barge that lifted it"); what the script stages is the barge letting go, not the bell arriving. The girl and the basket stay out, and the ringers stay cropped out, as the author directed.

## Grade

Look **Orison White** (`--look orison`), the grade agent's recommendation: neutral whites, the bell as the dark anchor, the three accents at full strength (wax (79,47,48) → (121,41,46); collar (145,115,79) → (165,129,57); wine (21,4,7) → (50,8,16)). Across the ten shots the neutral cast went from −1.0…+2.7 to 0.0…+0.2 (R−B). All shots pass QA: no new clipping, crushing +0.17 points at worst, skin hue within 1° on Serath, the aide and the Hierophant. Two other looks are on `grade/look_board.jpg`: **Bell Iron** (cooler, denser, after Villeneuve) and **Illuminated Vellum** (warmer, storybook). Details: `grade/README.md`.

## Sound

Cue sheet and every measurement: `audio/I_bell_v5_cues.md`. Sources: the takes' production sound, sixteen original or CC0 sounds (`audio/sfx/manifest.json`, `audio/CREDITS.md`), and an original non-looping choir (`audio/choir/choir_1_mixed_sustained.flac`; the alternate mix uses `choir_2_low_men_drone.flac`: `out/review/I_bell_v5_choir_options.mp4`).

| The review's fault | v4 | v5 |
| --- | --- | --- |
| The stroke no louder than dialogue | 0.2 LU under line 2 | 7.0 LU over the loudest dialogue; 5.6 on a simulated phone |
| Less low end than the landing | 4.8 dB less | 3.5 dB more |
| Faded 2.8 s after the stroke | −17.2 dB at 2.8 s | −4.3 dB at 2.8 s; rings to the end |
| The looped choir masking the seal and the answer | one 3.87 s phrase, four times | one pass, no repeat; speech 12.7–14.0 dB over it at 1–4 kHz |
| Mono | correlation 0.995 | 0.372 |
| Dry voice | no hall | reads as a man speaking in a huge reverberant cathedral (earshot, 88%) |
| The seal late and inaudible | 125–150 ms late | on its frame; +5.8 dB over choir and beds (audibility unproven) |
| Two thumps with no cause | present | removed |
| Dead air on the Hierophant's face | about −40 dBFS | −30 dBFS |
| Ended mid-applause | yes | the bell alone for the last 2.3 s |

Loudness: −18.9 LUFS integrated, true peak −2.1 dBTP after AAC, loudness range 12.3 LU, no clipped samples; the limiter works once, on the stroke, by 1.7 dB.

Not fixed or unproven: the wind reads as hiss or surf to earshot (kept low); the applause is ordinary applause, not gloved (kept very low); the bell's strike note is still 192 Hz (an octave down reads as a gong); the track is still dark overall; Q01's own music under the first line cannot be removed; nobody has heard any of it.

## For the author's ear and eye

1. Does the opening stroke say "bell" at once?
2. Choir 1 or choir 2; is it heard under the lines?
3. Is the press of the seal heard, and is it wax?
4. The release: A, B or C.
5. The look: Orison White, Bell Iron or Illuminated Vellum.
6. Wind: height or hiss? Applause: keep or leave out?
7. The ending on a phone: the last two seconds are faint.

## Still open after this cut

The reviewers' two central points cannot be met by editing: a shot in which the bell's weight is seen to be set down, with people for scale, and a shot of Serath alone. Both are proposals in the review; nothing is generated without the author's go.
