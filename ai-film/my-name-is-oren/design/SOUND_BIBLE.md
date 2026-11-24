# Sound bible: *My Name Is Oren*

The sound half of the film bible, written to `.claude/skills/cines-engine/references/score-and-sound-design.md`. It holds to the screenplay (`design/script.json`) and DECISIONS: **no music under dialogue; one small cue starts on the last blink and carries the corner into the title.** Every sound below is a decision about what the audience hears and why. What is already built is marked *(built)*; the rest is the plan for Q14–Q22 and the finish.

## 1. The soundtrack's job

**We hear a city of polite machines and a woman it has stopped hearing. By the corner, one machine has slowed its pace to hers, and the only music in the film arrives as he does.**

We are in Helena's ears, at street level: close voices, the near pavement, the city at a distance that never stops.

## 2. The sound world

- **The constant bed:** a quiet northern English high street on a grey, damp afternoon in 2041. Distant traffic hiss on wet roads, faraway footsteps, and the laundrette's tumble dryers turning behind the glass. *(built: `street_bed`, `laundrette_hum`, Stable Audio, `audio/sound_plan.json`)*
- **Signature sounds** (only this world makes them):
  - **The polite machines:** the sweepers' brushes and thin electric whine *(built: `sweeper_brush`, `sweeper_bump`)*.
  - **Their voices:** calm, synthetic, apologising ("Apologies."), settling things in measured tones.
  - **The city units' regulation tread.**
  - **The client's voice** through the small speaker at Oren's collar: narrow, tinny, close to his body (DECISIONS, voices).
- **What it never contains:** score under any line, sci-fi hums or beeps around Oren, trailer whooshes, crowd walla that reads as chanting, music from shop doorways.

  Oren passes for human. **The light at his temple is silent** (A41: it "wakes. Goes out."). That silence is a choice: the audience sees what Helena sees, and the street keeps going.

## 3. Point of view and perspective

- **Objective, at Helena's height.** Voices are close and dry. The street sits a little back, and so do the machines.
- **The client's call (B26)** is the one change: the tinny collar speaker, close to Oren's body. We hear what he hears, from his side of her.
- **The corner (B30–B31):** the street thins as they walk at her pace. The bed doesn't stop; it recedes, so the footsteps and the bag come forward.

## 4. Themes and motifs (sound objects first, then one musical cue)

| Motif | Owner | Shape | Arc |
| --- | --- | --- | --- |
| **The paper bag** | Oren, and what he carries for someone else | Its papery rustle and crinkle, and the rhythm of its swing on his stride | **Brisk:** in Q02 it swings at his even, unhurried machine pace. **Still:** while he stands, held at his thigh, it barely moves; when he sets it down between his feet (Q12), one soft crinkle. **Slowed:** at the corner it "swings again, slower now, in time with her" (A54). The rhythm of the bag is whose pace he keeps; at the end it is hers. |
| **The polite machines** | The city | Brush scrape and a thin whine; a calm synthetic "Apologies." | Under everything, indifferent. The sweeper runs into Helena's boot and apologises (B08) before Oren does anything human. The world's politeness is the background his own will be measured against. |
| **Helena's laugh** | Helena | A breath through the nose, held, then breaking (Voice Bible) | It appears once, in B18 (Q13), as the first release. It is never scored, so nothing competes with it. |
| **Oren's even tempo** | Oren | Every line at the same slow, even pace, every sentence finished (Voice Bible) | It doesn't change: his care shows in his footsteps slowing at the corner, not in his voice. |
| **The one cue** | The film | A small, warm, quiet musical figure (§5) | It enters on the last blink (DECISIONS) and carries the corner into the title "MY NAME IS OREN". It has never been heard before, so it lands as a recognition, not as a theme. |

## 5. Musical language (the one cue)

**What the cue is for:** recognition and earned warmth, not triumph. FME-24's finding applies here: tension follows density and texture, not tempo. So the cue stays sparse, sustained and low in density, and its warmth comes from mode and register rather than from adding.

**How it moves:**
1. It enters with no attack.
2. It holds while they turn the corner.
3. It opens in register as the picture cuts to black.
4. It resolves under the title.
5. It fades out with the picture (A56–A58).

| Control | Choice |
| --- | --- |
| Length | about 20–25 s, from the last blink through the title card to the fade |
| Tempo | free and rubato; no audible pulse, matching the walk without driving it |
| Mode | major, or a major-leaning mode with suspended tones that resolve late (valence is carried mostly by picture and story; the mode tilts it) |
| Harmony | open intervals; consonance arriving gradually; one held suspension that resolves on the title |
| Instruments | one exposed solo voice (felt piano, or a single bowed or plucked string) over a soft sustained bed (strings or harmonium) |
| Register | mid to low at entry, opening upward on the title |
| Density | very low: few attacks, sustained tones, low spectral activity |
| Dynamics and space | close and dry at entry, the room widening slightly on the title |
| Ending | resolves under the title, then a natural decay into the fade-out, so no hard button |

**To generate it:** Lyria 3.5 (`sound.md` §7), prompted with these controls. Window the best passage with earshot `find`, check its mood with `earshot describe` against "warm, tender, hopeful, quiet", and judge it in the order of `score-and-sound-design.md` §8. Ears decide.

## 6. Spotting map

There is no music anywhere except the last cue. "Sound" below means the soundtrack's focus.

| Beat (sequence) | Focus | Sound decisions |
| --- | --- | --- |
| A01–A02 **Over black** (opening, before Q01) | The city's voice | Black screen. Layered polite synthetic voices over traffic; chimes; a traffic post settling an argument in calm, measured tones. Sound alone sets the world before any picture. *(Not built yet: the current cut opens on Q01's first frame. To build: Stable Audio traffic and chimes, plus synthetic voices from TTS. The voices are background texture with no legible words.)* |
| B02 The street that works (Q01) | The machines | Sweepers scrubbing the gutter *(built)*; the city units bagging the bin *(built)*; the street bed comes in *(built)*. |
| B03–B04 Helena; the bag (Q01–Q02) | Helena, then his approach | The laundrette hum from the first sight of its window *(built)*. Oren's approach: even footsteps and **the bag's brisk swing** (motif, first statement). |
| B05–B09 Excuse me … Mercer Street (Q03–Q05) | Dialogue | Close dry voices; the street behind. B08: the sweeper runs into her boot, scrubs to a stop, and says "Apologies." *(brush built)*. |
| B10–B13 The pain … Somewhere to be (Q06–Q07) | Dialogue, her body | Her breath catching when her back bites (Voice Bible); her hand on the pillar; boots shifting on wet stone. |
| B14–B15 Not the recordings; Second Lieutenant (Q08–Q11) | Dialogue | Q10's score removed; its voices over the beds *(built)*. **The light at his temple is silent.** |
| B16–B17 Didn't attend; Sit with me (Q12) | Dialogue | Her accusing lines close and dry. When he sits and sets the bag down: **one soft crinkle** (motif: the bag at rest). |
| B18 Speaking simply (Q13) | The laugh | Nothing competes with the laugh: no effect within 2 s of it, and the bed stays low. |
| B19–B22 No promise … Yes (Q14–Q16) | Dialogue | Her boot touching the bag: a faint paper touch. The light at his temple stays silent. |
| B23–B24 You haven't stood up; the doors (Q17–Q18) | Dialogue (the one-take hero beat) | No added effects in the one take. The street bed only; the take's own sound owns it. |
| B25–B26 Walk me in; the call (Q19) | The call | The client's voice through his collar speaker: narrow, tinny, close to his body (the one change of perspective). |
| B27–B29 Ten past two; the arm; standing (Q20–Q21) | Her effort | Her breath as she stands; cloth and the grip of fingers on his arm. Quiet, physical, close. |
| B30–B31 Slow down; the corner (Q22) | Footsteps and the bag | He slows: his steps fall into her rhythm, and **the bag swings slower, in time with her** (motif, final statement). The street recedes. **The cue enters on the last blink**, carries the turn of the corner, and holds over CUT TO BLACK into the title. |
| A56–A58 Black; title; fade out | The cue | The cue resolves under "MY NAME IS OREN", then decays with the fade. Nothing else. |

## 7. Shot-by-shot soundscape: cue list conventions

Effects are cues with IDs in `audio/sound_plan.json` (sweepers, bin, the two brushes). New ones follow the same form: `id`, the sound, `at` (a take's clock, e.g. `Q12_t1@26.4`), `level`, and `why`. Each sound is described as source, material, action, size, distance, room, transient and decay; `audio/gen_plan.json` holds the generation prompt, seeds, and earshot's match and alternatives.

**Rules:**
- **Every on-screen physical action gets a decision,** including silence.
- **Footsteps land on the heel taking weight.**
- **Effects sit 11–14 dB under the voices.** The author wants few, quiet effects.
- **Tiny foley** (paper crinkle, cloth, the grip of fingers on a sleeve) comes from recordings: Freesound CC0, or earshot's bank (`cloth/rustle`, `paper/*`). Stable Audio is weak at tiny foley.

## 8. Dialogue and voice

- **Voices** are as written in the Voice Bible (DECISIONS): Helena's flattened Greater Manchester vowels and dry rasp; Oren's even, warm southern calm, with no audible breaths.
- **Intelligibility over everything.** No effect within 2 s of a line unless the picture demands it.
- **The video model's voices are kept when they are right.** A line the model mangles or drops is re-voiced and lip-synced (DECISIONS).
- **Every take is checked with `earshot describe` for slipped-in music** (Q10's was removed: lesson 53).
- **Captions carry the meaningful non-speech sound** alongside the lines, in short consistent labels: "[city voices, chimes]" over black, "[sweepers scrubbing]", "[brush stops]", "[Helena laughs]", "[quiet piano]" for the cue.

## 9. Mix hierarchy and delivery

**One focus per beat** (§6). Beds sit 22–29 dB under the voices, and the generator's dead air between lines is filled by the beds *(built)*.

**Levels and loudness:**
- Sequences are levelled on dialogue (lesson 52), with eases at the joins *(built)*.
- The cue sits under nothing: it plays alone, at about −20 LUFS short-term.
- The master is −18 LUFS integrated with true peak at −1.5 dBTP or lower (`sound.md` §8). Today's −18.5 LUFS and −1.4 dBTP is within that.
- Consider gentle master compression if phone playback loses the quietest lines (`audio/LISTEN.md`).

**Stems for the final:** dialogue (DX: the takes and the voice stems), music (MX: the cue), effects (FX), Foley, ambience (the beds), and an **M&E** (music and effects without dialogue) in case the film is dubbed. Keep every word, the city voices included, in the dialogue stem.

## 10. Sources and licences

- **Dialogue and sync sound:** Seedance 2.5 (fal) and Higgsfield (Q01–Q02).
- **Beds and effects:** Stable Audio 3.0 Small SFX (Stability AI Community License).
- **Q10's voice stem:** Demucs (MIT).
- **Planned:**
  - Lyria 3.5 for the cue (SynthID-watermarked)
  - TTS for the over-black synthetic voices (ElevenLabs or Gemini, with consent rules in `sound.md` §6)
  - Freesound CC0 (or CC-BY, credited) and earshot's bank for the tiny foley

Everything is listed in `audio/CREDITS.md` as it is added. That file works as a rights ledger, recording for each sound its source type, terms, attribution, commercial use, whether it was modified, the date it was checked, and whether it is final or temporary.
