# Sound audit of movement I, cut v8: the mix as a technical object

Reviewer: re-recording mixer, quality control. 26 November. Review only: nothing changed, nothing spent on fal, nothing committed.

Everything is **measured** on `out/edits/I_bell_v8.wav` and its layers unless marked as a **listener's report** (earshot, or Gemini given sound only) or my **inference**. Nobody has heard this track. The numbers behind each defect, and where each fix goes in the tools, are in the tables at the end.

## 1. Verdict

Nothing is clipped and the true peak is −2.1 dBTP, but all six picture cuts are built with a construction error and five places leave a mark: a reverb tail with no source that switches on over Serath, a 22 ms hole in the bell's ring, a roar that stops 74 ms before its cut, a click in the choir and a notch in the answer. The track is mastered 8 LU under web level, the valley's events are out of scale with the cathedral's (an ox louder than the opening bell, a bowl as loud as ninety tons landing), and a fifth of the film falls under −40 LUFS on a phone. The bell's "long note" is the same seven seconds played twice, not one note decaying.

## 2. Scores

| Axis | Score |
| --- | --- |
| Loudness and dynamics | 4 / 10 |
| Balance and hierarchy | 4 / 10 |
| Tonal consistency between the worlds | 6 / 10 |
| Edits and fades | 3 / 10 |
| Translation to small speakers | 3 / 10 |
| The mix overall as a technical object | 4 / 10 |

## 3. Defects, worst first

**D1. 18.8 and 26.5 s: the answer's reverb is cut off, then returns alone over Serath.** Its layer goes from −23.5 dBFS to nothing in 50 ms at 18.80. At 26.49, 1.2 s into Serath's shot, it returns from silence to −24.8 dBFS in 20 ms, 6.6 dB over the choir; the mix jumps 9.3 dB in 70 ms. It matches v5's stem after the answer exactly: the hall's tail of "Let no hand bring down", without the words. Listeners: earshot, "a cinematic hit with a long tail" (z +3.9); Gemini named the cut-off at 18.8 in 2 of 3 runs. Fix: let the answer ring out under the vale; take the dialogue stem out of Serath's section.

**D2. 46.2 s: a hole in the bell's ring, 0.42 s after the stroke.** −13.1 dBFS, exact zero, then −26.1: 30.7 dB deep, 22 ms more than 10 dB down. Two 40 ms fades end to end; the record's check in 100 ms steps could not see it. Fix: overlap them, or one bell stem with a 60–80 ms ramp.

**D3. 57.1 s: the roar stops 73.7 ms (1.8 frames) before the cut,** in four samples from −16.5 dBFS; the mix sits at −46.1 dBFS until the cup. The take's audio is shorter than its picture. Fix: pad it by reflecting its last 150 ms, or slide the roar four frames later.

**D4. 39.4 s: a click in the choir on the cut up.** The lead-in is cut in one sample (a −24.3 dBFS step), 8.4 dB over its surroundings above 2 kHz. Same build, masked, at 25.3 and 30.1 s. Fix: run each lead-in 5 ms past the join with a 5 ms fade-out.

**D5. 17.7 s: a 10 ms notch mid-phrase in the answer,** 17.4 dB deep. Fix: overlap the two 5 ms fades.

**D6. Hierarchy (table B).** Ox and crows −15.3 LUFS, over the opening stroke (−16.5) and the Hierophant (−17.8); the bowl (−18.7) level with the bell's landing (−18.4), its peak 1.6 dB under the stroke's. The vale's spike limiter sits before +7 dB of gain. Fix: limiter after the gain; bowl at −24 LUFS or lower, ox about −20.

**D7. Level: −22.3 LUFS, 8.3 LU under web level** (section 5).

**D8. The bell's note is seven seconds played twice (table H).** Over the valley it ends on v5's end-of-film fade, gone at 53.2 s. At the cup it restarts 8.4 dB above where it left off, the 382 and 577 Hz partials back from −50 and −67 dBFS to −31 and −37. The prime's level is right; the colour is that of a note 0.4 s old. Fix: rebuild the stem with a 19 s tail and play it through once.

**D9. Small speakers (table I).** Through a phone band the arrival thud loses 54.8 dB as a layer and the last note 15.7 dB: the arrival has no hit and the film ends 2.5 s early. Fix: a thud with a body (recipe, table L); a saturated copy under the last note.

**D10. Width follows the source (table G).** Choir and winds are fully decorrelated; the video model's sound is mono, so the mountain's roar is the narrowest sound in the film. The last 3.5 s lean right by 3.3–4.8 dB. Fix: widen the roar; centre the bell's hum and prime.

**D11. Cleaning residue (table J).** The cleaned layers show the signature of musical noise. The wind covers it in the vale, not in the run at 53.2–54.3 s. Listeners: earshot weak (z +2.6); Gemini a "whine" or "whistle" at 54.5–55.5 in 3 of 3 runs. Fix: a gentler floor; mute the layer under the roar.

**D12. Housekeeping.** Last sample −48.1 dBFS after a tail at −100. Thud cut at 55.96 s while at −49.5 dBFS. Stems 0.31 dB under the master. Choir heard twice: 17.3–18.9 again at 24.9–26.5; 29.6–30.1 again at 38.9–39.4.

## 4. Looks like a fault in the numbers, probably intended

- The drops of 12.5 dB at 46.2 s and 10 dB at 57.1 s (not the hole and the early stop inside them).
- The valley's empty bottom: −53 dBFS under 120 Hz, against −29 to −43 above.
- Stretches at −36 to −48 LUFS (water, dust, two hushes); a range of 11 LU.
- The 20 LU jump at the ox, as a startle.
- The video model's 16 kHz ceiling: the full-band layers hold only −73 to −96 dBFS above it, so nothing changes at the cuts.
- The bell wandering between the ears; the thud as pure sub; the bell 14 dB over the "silent" fall.

## 5. Delivery level

Master to **−18 LUFS integrated, true peak −1.5 dBTP**; do not chase −14. A trial sum of the layers (everything up 6 dB except the stroke, which has 0.6 dB of room; bowl, ox and roar trimmed; quiet beds 3 dB more) gives −18.3 LUFS with a limiter taking 1.3 dB off the stroke and 2.2 off the roar. The cost: the stroke's lead over the Hierophant falls from 7.0 LU to 2.1; at −16.6 LUFS they are equal. To buy it back without crushing, re-voice the strike with a softer first 50 ms.

Inference, assuming a phone at normal volume gives 70 dB SPL for −14 LUFS material: this track averages 59 dB, the water and the hushes 45, the last note 36, in a room of 35–45. A laptop loses 1.6 LU and keeps the quiet.

## 6. What works and must be kept

- No clipping; the master limiter takes 1.7 dB at most, on the stroke only.
- The three spoken lines within 0.2 LU of each other.
- The AAC track: no offset, true peak −2.07 dBTP.
- Beds that never go digitally dead; a clean first 100 ms.
- No pre-echo from the cleaning; no hum line left in the valley.
- Mono-safe: nothing cancels.
- The arrival's order: thud, then the roar rising over 0.37 s.

---

## Tables

### A. Loudness by section (measured)

Whole film: −22.3 LUFS integrated, range 11.0 LU, true peak −2.1 dBTP, loudest 400 ms −11.1 LUFS at 46.0 s, loudest 3 s −18.7, quietest 3 s −36.9 at 32.4 s. Above, all sections together: −21.9 LUFS; below: −23.3. The worlds differ by 1.4 LU.

| Section | Integrated (LUFS) | 400 ms max / min | 3 s max / min | True peak (dBTP) | Phone band, change | Share under −40 LUFS on a phone |
| --- | --- | --- | --- | --- | --- | --- |
| 1 the rite, 0–17.7 | −21.3 | −16.5 / −63.8 (file start) | −19.0 / −28.6 | −7.4 | −3.6 | 8 % |
| 2 the vale, 17.7–25.3 | −24.3 | −17.6 (the answer) / −31.5 | −22.0 / −29.2 | −3.7 | −3.5 | 0 % |
| 3 the seal, 25.3–30.1 | −24.7 | −21.6 / −37.5 | −23.7 / −25.0 | −7.8 | −3.2 | 1 % |
| 4 water, ox, dust, 30.1–39.4 | −22.3 (ungated −26.3) | −15.5 / −48.4 | −21.7 / −36.9 | −8.2 | −1.3 | 62 % |
| 5 the bell, 39.4–46.2 | −20.7 | −11.1 / −42.3 | −19.0 / −27.1 | −2.1 | −2.9 | 21 % |
| 6 the mountain, the run, 46.2–57.1 | −23.0 | −15.0 / −33.7 | −19.4 / −28.0 | −2.9 | −4.2 | 6 % |
| 7 the cup, 57.1–64.1 | −29.1 | −25.2 / −50.4 | −26.9 / −34.3 | −16.2 | −6.2 | 52 % |

Film time with 400 ms loudness under −35 / −40 / −45 LUFS: full band 9.0 / 2.4 / 0.8 s; phone band (300 Hz–8 kHz mono) 21.9 / 12.6 / 4.8 s; phone with a 500 Hz corner 28.6 / 17.6 / 6.9 s; laptop (180 Hz high-pass, half width) 13.6 / 3.2 / 1.4 s.

### B. Hierarchy: the loudest 400 ms of each event (measured, LUFS)

| Event | Full band | Phone band |
| --- | --- | --- |
| THE STROKE, 45.8 | −10.8 | −14.2 |
| The roar, 55.0–57.05 | −14.7 | −19.5 |
| Ox and crows, 35.0–36.3 | −15.3 | −16.2 |
| Opening stroke, 0.5 | −16.5 | −19.7 |
| The answer | −17.6 | −22.5 |
| Lines 1 and 2 | −17.8, −17.7 | −19.7, −19.2 |
| The bell's landing, 42.4 | −18.4 | −21.4 |
| Bowl on the wall, 23.4 | −18.7 | −19.8 |
| Arrival thud, 54.4 | −21.1 | −27.7 |
| The press, 27.5 | −22.2 | −24.6 |
| The lift, 29.1 | −24.9 | −28.4 |

### C. The six picture cuts (measured on the mix)

| Cut (s) | 50 ms before → after (dBFS) | Hole | Sample step | Reading |
| --- | --- | --- | --- | --- |
| 17.667 | −23.0 → −21.1 | 17.6 dB; over 6 dB for 10 ms in the voices; floor −50 | none | notch in a word (D5) |
| 25.292 | −37.7 → −41.0 | 10.1 dB for 1 ms | choir 0.0091 (−41 dBFS), 3.8 × its surroundings; highs 9 dB under them | masked |
| 30.083 | −36.5 → −37.1 | 11.5 dB for 3 ms, in the wind | none | negligible |
| 39.375 | −28.6 → −29.1 | 8.9 dB for 1 ms | choir 0.061 left / 0.029 right; highs +8.4 dB | click (D4) |
| 46.208 | −16.5 → −29.0 | 30.7 dB; 22 ms over 10 dB; 8 ms over 20 dB; exact zero | none | dropout (D2), then the intended drop |
| 57.125 | −48.4 → −27.5 | 74 ms at −46.1 between −13.2 and −27.0 | roar ends in 4 samples at 57.0513 | gap, sound early (D3) |

File head: first sample zero, beds rise from −126 to −60 dBFS over 0.47 s, no step. File tail: −60 dBFS at 63.9 s, −100 at 64.11, then the last 12 samples rise to −49.6 (left) and −48.1 (right).

### D. Every other fade (from the tools, checked against the layers)

| Time (s) | Layer | Fade | Finding |
| --- | --- | --- | --- |
| 3.75–4.65 | room, crowd | 0.9 s in | clean |
| 10.55–11.5 | choir | about 1 s in | clean |
| 17.67–18.92 | choir | 1.25 s linear out | clean |
| 17.67–18.17 | cathedral beds out, vale in | 0.5 s linear each | clean |
| 18.75–18.80 | the answer | 50 ms out, tail removed | D1 |
| 24.89–25.29 | choir lead-in, +5 dB | 0.4 s in, hard end | D4 (masked here) |
| 25.26–25.29 | vale | 30 ms out | clean |
| 25.29–26.49 | choir | +5 dB ramped to 0 over 1.2 s | clean |
| 26.49–26.51 | stems to master | 20 ms crossfade; dialogue stem enters | D1 |
| 29.48–30.08 | choir | 0.6 s out | clean |
| 29.73–30.08 | vale lead-in | 0.35 s in, hard end | 3 ms dip |
| 34.92–35.0 | vale production (the ox) | 80 ms in | clean |
| 36.5–36.75 | vale production | 0.35 s out | clean |
| 38.88–39.38 | choir lead-in | 0.5 s in, hard end | D4 |
| 39.08–39.38 | vale | 0.3 s out | clean |
| 40.7–41.2 | choir | 0.5 s out | clean |
| 46.17–46.25 | all, then far bell | 40 ms out, 40 ms in | D2 |
| 49.69–49.76 | Q03B production | 70 ms in | clean |
| 52.46 | Q03B, nine frames removed | 20 ms crossfade | clean (20 ms dip in one layer, covered) |
| 52.4–53.2 | far bell | v5's end fade, 44 dB/s | D8 |
| 54.34–54.71 | roar | 0.37 s in | clean |
| 55.96 | thud | hard end at −49.5 dBFS | D12 |
| 57.0513 | roar, production | source runs out | D3 |
| 57.125–57.145 | the cup | 20 ms in | clean |
| 63.1–64.1 | all | about 1 s out | spike on the last 12 samples (D12) |

### E. Spectrum by section (measured, octave bands, dB relative to the section's total)

| Section | 31 | 63 | 125 | 250 | 500 | 1k | 2k | 4k | 8k | 11–16k | Under 120 Hz (dBFS) | Centroid (Hz) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 rite | −36 | −26 | −7 | −5 | −5 | −11 | −17 | −22 | −26 | −39 | −40.9 | 466 |
| 2 vale | −50 | −41 | −19 | −9 | −8 | −12 | −16 | −19 | −21 | −30 | −52.7 | 759 |
| 3 seal | −32 | −20 | −10 | −5 | −2 | −4 | −14 | −11 | −21 | −26 | −43.4 | 1071 |
| 4 water, ox, dust | −51 | −32 | −9 | −2 | −2 | −5 | −7 | −14 | −15 | −28 | −53.1 | 785 |
| 5 bell | −9 | −10 | −13 | −9 | −12 | −16 | −18 | −23 | −17 | −43 | −29.4 | 451 |
| 6 mountain, run | −14 | −13 | −12 | −7 | −7 | −13 | −18 | −22 | −24 | −35 | −33.4 | 358 |
| 7 cup | −33 | −10 | −9 | −4 | −9 | −11 | −15 | −26 | −34 | −44 | −37.5 | 321 |

Notes. The choir lives between 355 and 1400 Hz (third-octaves 400–1250 Hz within 8 dB of each other; 250 Hz at −30, 1.6 kHz at −31): no chest, no air. The seal is the brightest section (2–5 kHz 9.8 dB under its total; 16–21 elsewhere): the press and lift carry +3 dB shelves. The landing's 5.6–11 kHz band reaches −31 dBFS for 0.4 s (chains, grit). After 61 s nothing is left above 500 Hz. No narrow line stands out in either valley section.

### F. Bandwidth of each layer (measured over its audible spans)

| Layer | Top edge, 50 dB under its loudest band | Level in 16–20 kHz (dBFS) |
| --- | --- | --- |
| choir | 8.2 kHz | −96.1 |
| dialogue and cathedral production (video model) | 13.0 kHz; cliff at 16.0 kHz | −92.5 |
| bell | 4.1 kHz | −95.3 |
| cathedral effects | 15.6 kHz | −84.8 |
| cathedral beds | 22.0 kHz | −77.2 |
| vale production (video model, cleaned) | 16.4 kHz; floor from 18 kHz | −81.2 |
| vale wind | 21.7 kHz | −72.7 |
| Q03B production (video model, cleaned) | 15.9 kHz; floor from 18 kHz | −80.6 |
| Q03B wind | 21.7 kHz | −75.2 |
| Q03B roar (video model, raw) | 15.7 kHz; floor from 18 kHz | −74.4 |
| arrival thud | 0.43 kHz | −150.7 |

The source takes are AAC-LC, 32 kHz, 130 kb/s. In 1 kHz bands the model's layers read −74 to −84 dBFS at 15–16 kHz, −81 to −93 at 16–17, and their floor above 18 kHz.

### G. Stereo (measured)

| Section | Correlation L/R | Side under mid (dB) | Left minus right (dB) | Mono fold-down (dB) |
| --- | --- | --- | --- | --- |
| 1 rite | +0.39 | 3.6 | +0.3 | −1.6 |
| 2 vale | +0.31 | 2.8 | +0.3 | −1.8 |
| 3 seal | +0.12 | 1.0 | +0.3 | −2.5 |
| 4 water, ox, dust | +0.86 | 11.1 | −0.1 | −0.3 |
| 5 bell | +0.75 | 8.5 | +0.6 | −0.6 |
| 6 mountain, run | +0.88 | 11.9 | −0.4 | −0.3 |
| 7 cup | +0.29 | 2.6 | −0.5 | −1.9 |

| Layer or event | Correlation | Side under mid (dB) | Left minus right (dB) |
| --- | --- | --- | --- |
| choir | +0.03 | 0.2 | +0.4 |
| vale wind, Q03B wind | +0.04, +0.05 | 0.4 | ±0.2 |
| the answer | +0.03 | 0.3 | +0.8 |
| lines 1 and 2 | +0.62, +0.67 | 6.3, 7.0 | +0.4, −0.2 |
| gloved applause | +0.17 | 1.5 | +0.3 |
| bell: the stroke / its tails | +0.78 / +0.30 | 9.0 / 2.7 | swings −5.4 to +4.5 in 50 ms windows |
| vale production | +0.99 | 21.6 | −0.1 |
| Q03B production | +0.97 | 17.7 | −0.4 |
| the roar | +1.00 | 26.2 | −0.4 |
| rope creak / whoosh / paper | +0.98 to +1.00 | 9.5 to 12.4 | +5.8 / +4.3 / +5.0 (panned left) |
| press, lift | +1.00 | 16.0 | −2.8 (panned right) |

Lopsided for more than a second: 3.5–5.5 s, right by 3.4–6.5 dB (the opening bell's tail); 60.0–63.5 s, right by 3.1–4.8 dB. Nothing is hard-panned.

### H. The bell's long note (measured on the bell layer)

| Where | Level (dBFS) | 191.6 Hz | 382 Hz | 577 Hz | Centroid (Hz) |
| --- | --- | --- | --- | --- | --- |
| In the room, 45.95–46.19 | −12.8 | −23.8 | −20.6 | −20.8 | 342 |
| Valley, start, 46.26–46.66 | −26.6 | −35.9 | −30.7 | −37.0 | 301 |
| Valley, 51.6–52.25 | −35.5 | −37.1 | −50.2 | −66.8 | 166 |
| Valley, 52.9–53.1 | −55.3 | | | | |
| Cup, start, 57.18–57.58 | −27.1 | −36.7 | −31.0 | −36.6 | 321 |
| Cup, 62.5–62.9 | −36.0 | −37.9 | −50.5 | −66.4 | 169 |

Decay in the stem: 3.7 dB a second for the first 1.2 s, then 1.4 (the stretch v5 rides up by 4 dB), then 28.7 in its last second. By partial: the prime 0.4 dB a second, 382 Hz 3.2, 577 Hz 5.3. Bell against everything else: +18.3 dB at the stroke, +14.1 over the fall (46.3–49.6), −6.7 at the wall, −11.2 as the run begins, +21.2 in the cup's first second, +5.6 under the applause, +21.1 in black.

### I. Through a phone (measured: 300 Hz–8 kHz, fourth order, mono; RMS, dBFS)

| Event | Full | Phone | Loss | Loss with a 500 Hz corner | Loss on a laptop |
| --- | --- | --- | --- | --- | --- |
| Opening stroke, attack | −19.2 | −22.2 | 3.0 | 5.6 | 1.2 |
| Opening stroke, tail 1.5–3.5 | −22.7 | −30.2 | 7.5 | 12.0 | 3.6 |
| The nave before line 1 | −30.8 | −45.1 | 14.3 | 18.9 | 4.5 |
| Line 1 | −22.0 | −25.1 | 3.1 | 6.1 | 1.6 |
| The answer | −21.7 | −27.7 | 6.0 | 8.4 | 2.7 |
| Bowl on the wall | −20.4 | −21.4 | 1.0 | 4.0 | 0.2 |
| The press | −26.2 | −29.7 | 3.5 | 3.9 | 1.7 |
| Water, wind only | −39.6 | −44.2 | 4.6 | 7.6 | 2.2 |
| Ox and crows | −21.2 | −22.5 | 1.2 | 4.3 | 0.4 |
| Dust | −42.0 | −46.0 | 3.9 | 7.2 | 2.0 |
| Hush before the landing | −43.2 | −48.6 | 5.4 | 8.1 | 3.7 |
| The landing | −21.6 | −27.8 | 6.2 | 8.2 | 4.1 |
| The whoosh | −30.5 | −38.2 | 7.6 | 12.3 | 3.9 |
| THE STROKE | −13.1 | −16.3 | 3.2 | 5.8 | 1.4 |
| Bell over the fall, 46.3–47.3 | −27.6 | −33.2 | 5.6 | 10.6 | 2.7 |
| Bell over the fall, 48.0–49.6 | −30.3 | −42.3 | 12.0 | 16.9 | 5.3 |
| Arrival thud | −19.8 | −33.6 | 13.8 | 14.7 | 12.5 |
| The roar | −20.1 | −25.9 | 5.7 | 7.3 | 3.8 |
| Cup, applause | −30.2 | −37.6 | 7.3 | 8.8 | 4.1 |
| Black, the last note | −35.4 | −51.2 | 15.7 | 26.7 | 4.3 |

On a phone the bell over the fall has sunk to the wind's level by 49 s (both −47 dBFS in band): the note "from far above" lasts about three seconds, not seven. On a phone the ox (−16.2 LUFS) is the second loudest thing in the film, 3.3 LU over the roar and 3.5 over the Hierophant.

### J. Cleaning and limiters (measured)

| Item | Result |
| --- | --- |
| Cleaning, reduction between events | 6.6–8.7 dB in the vale; 7.3–11.5 dB in Q03B |
| Cells more than 13 dB under their mean, raw → cleaned | vale 8–12 % → 34–51 %; Q03B 9–27 % → 34–63 % |
| Bed round the bowl knock, 1–4 kHz | drops 15–25 dB in the 200 ms before the knock (raw: 6 dB) |
| Pre-echo ahead of transients | none: cleaned is at or below raw at every step from −60 ms |
| Vale spike limiter | bowl 5.3 dB for 135 ms; ox up to 4.1 dB over 538 ms, mean 1.2 dB; gain ripple above 30 Hz 0.17 dB |
| Then the level envelope | +7 dB at the wall, +2 at the ox: the bowl leaves at −4.0 dBFS |
| Roar limiter (ceiling −8) | never engages; raw peak −9.4 dBFS. The roar is not processed beyond gain |
| Master limiter | up to 1.7 dB on THE STROKE, nothing elsewhere |
| Clipping | none; 8 and 5 samples within 0.05 dB of the peak |
| Layers when off | digital silence, or 1-bit chatter at −135 to −143 dBFS in the bell layer, 17.4–27.0 s |
| Lowest 100 ms inside the film | −52.3 dBFS at 38.8 s; never digital zero for more than 2 samples |
| DC | under −86 dBFS in every layer |

### K. Listeners (reports, not measurements)

| Excerpt | Known feature | Gemini, 3 runs, sound only, same neutral question |
| --- | --- | --- |
| 15.5–20.5 | answer cut off at 18.8 | 2 of 3 named an abrupt cut-off of the reverb at 18.9–19.0 |
| 23.5–29.5 | tail enters at 26.5 | 0 of 3 called a fault; 1 "heavy cinematic bass impact", 1 "choral swell" |
| 37.5–41.5 | click at 39.375 | 0 of 3 |
| 44.0–49.0 | hole at 46.208 | 0 of 4. None of the 4 called the stroke a bell: "piano chord or chime", "orchestral swell", "brass chord", "latch or door impact" |
| 54.5–59.5 | roar ends early at 57.05 | 0 of 3 called a fault; 3 of 3 heard a whine, whistle or whirring in the first second |
| 5.5–11.0 (control, no known fault) | none | 0 of 3 faults; line 1 transcribed correctly 3 of 3 |

Gemini cannot resolve events of 20 ms; its silence on D2 and D4 is not evidence they are inaudible. earshot: the layer entering at 26.5 s reads "a cinematic hit with a long tail" z +3.9, "a big drum hit" +3.6. Cleaned vale bed "watery warbling noise-reduction artefacts" +2.6 (raw +2.1), "low bitrate mp3 with artefacts" +2.2 (raw +1.1); the Q03B run +1.1 (raw +0.2): all under 3, so weak.

### L. Where each fix goes, and the recipes (all free: re-edit, re-level, or local numpy)

| Defect | File | Change |
| --- | --- | --- |
| D1 | `tools/combine_bell_vale.py`, step 2 | `n_ans` to about 3.2 s after the cut with a 2 s fade-out, so the hall rings out under the vale's opening (it is under the wind, −36 dBFS, within 2 s) |
| D1 | same, step 4 | `rest = M[c1 + n_x:c2] - D[c1 + n_x:c2]`: no dialogue stem under Serath. What goes with it is production air at −50 LUFS |
| D2 | `tools/combine_film_v8.py` | fade cut v7 out across `tE` ± 20 ms and bring the far bell and the valley in over the same 40 ms (the far bell from `B[c3 - 20 ms:]`); the level then moves in one direction, 0 to −13 dB |
| D3 | `tools/mix_q03b.py` | `raw[o2 + len(seg):]` filled by reflecting the take's last 150 ms; or delay the roar's envelope and source by four frames |
| D4, D5 | `tools/combine_bell_vale.py`, steps 1, 4, 5, 6 | every lead-in and the master before a join end 5 ms after the join with a 5 ms fade-out, to sum to one with the 5 ms fade-in that follows |
| D6 | `tools/mix_vale.py` | `prod = limit(prod * g, ceiling_db=-14)` in place of limit-then-gain; wall-shot gain +7 to about +1.5 dB, ox +2 to about −2 |
| D8 | `tools/mix_bell.py`, then `combine_film_v8.py` | build the bell stem 19 s past the stroke (the series synth already runs 20 s); far bell = `B[c3:c3 + 10.92 s]` at −13 dB, low-passed; cup = `B[c3 + 10.92 s:]` at room level, no low-pass; one fade from 63.1 s |
| D9, thud | `tools/mix_q03b.py` | the present 80-to-34 Hz sweep; plus a sine sweep 220 to 110 Hz, 10 ms attack, 0.18 s decay, 8 dB under it; plus noise band-passed 500 Hz–2.5 kHz, 4 ms attack, 60 ms decay, 14 dB under it; the sum through `tanh` with 6 dB of drive. Accept when the loss through 300 Hz–8 kHz mono is under 8 dB (now 54.8) |
| D9, last note | `tools/combine_film_v8.py` | a copy of the cup's bell through `tanh` (drive 12 dB), high-passed at 300 Hz, mixed 12 dB under: the 191.6 Hz prime is then implied at 383 and 575 Hz on small speakers |
| D10 | `tools/mix_q03b.py` | the mixer's own `widen()` on the roar above 200 Hz, amount about 0.5; in `syn_bell_series`, pan 0 for the 95.8 and 191.6 Hz partials |
| D11 | `tools/mix_vale.py`, `remove_steady` | `floor` 0.06 to 0.25 (12 dB of cut at most, not 24), `over` 1.8 to 1.3; in `mix_q03b.py` take the production layer to −60 dB from 54.9 s |
| D12 | `tools/combine_film_v8.py` | a 5 ms fade on the last samples (or an IIR low-pass in place of the circular FFT one); 50 ms fade on the thud's end; drop `MASTER_GAIN_DB` from the stems |

### M. Method, and what was not checked

Loudness by ITU-R BS.1770 (my own K-weighting, checked against ffmpeg's `ebur128`: −22.3 LUFS, 11.0 LU, −2.1 dBTP both ways). True peak at 4× oversampling. Joins read in 1, 2 and 4 ms windows and sample by sample. Layers sum to the mix with a residual of −54.1 dBFS, all of it the 0.31 dB stem offset and the limiter on the stroke. Cleaning and limiter figures by running the tools' own functions on the source takes in scratch. The trial re-level in section 5 is a sum of the existing layers in scratch, not a proposed mix.

Not checked: anything by ear; a real phone or laptop speaker (the phone is a band-pass model, and the sound-pressure figures rest on one stated assumption); how loud the D2 hole and the D4 click are to a person; the AAC encode at any bit rate other than the 256 kb/s already in `out/review/I_bell_v8.mp4`.
