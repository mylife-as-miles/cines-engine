# The emotional language of *My Name Is Oren*

**The author's direction (2026-11-25):** cinematography, music, editing, symbolism, performance and history work as parts of one emotional language. The film should make you feel something before it makes you understand it.

The reference is *La Bola Negra* (Javier Calvo and Javier Ambrossi; cinematography Gris Jordana; editing Alberto Gutiérrez; music Raül Refree). Its lessons are summarised in our words, and nothing in this document copies it. The author noted that the film barely had music, and that music would carry this language.

**In one line:** we feel how unseen she is before we know why, and we feel her being seen before anyone says so. The music hears her first, then a machine does, and at the corner she lets herself be.

The screenplay is unchanged. Every line stays verbatim (`design/script.json`), and the language is built around the words, never by rewriting them.

## 1. Music: one small ensemble, one theme, one key

- **The ensemble:** a nylon-string guitar (the human voice of the film) and a small string section (the city's distance, later its warmth). Nothing else: no piano, no percussion, no synth, no choir. It is the same family as **M01c**, the end cue the author chose.
- **The key's arc:** everything is in **A**. Early cues are bare or minor (an open fifth, A minor). The harmony warms as she is seen (the C sharp enters, A major). The end is **M01c**, in A major, the only full statement of the theme.
- **The theme, planted, developed and resolved.** A small falling figure in M02 (her past, on the boot sketch) becomes a rising phrase in M04 (on her rank) and the whole warm figure in M01c (the corner). The ending lands as recognition, because we have heard it grow.
- **Feel before understand.** Every cue enters *before* the moment it belongs to is explained:
  - M02 starts on the fade-in, before we meet her.
  - M04's strings warm under the share menu, before the light wakes and before he says her rank.
  - M06 waits until her laugh has broken, then joins it.
- **Silence is part of the score.** M05 cuts out hard after "Didn't attend.", so the next line ("Can you sit? Here. With me.") lands in quiet. Her laugh is first heard dry.
- **Under dialogue:** 12–16 dB under the voice, ducked further while anyone speaks, with a gentle dip around 2.5 kHz to leave room for the words. Every line stays clear (`tools/sound_mix.py`).

| Cue | Where (v8) | Its job | Music |
| --- | --- | --- | --- |
| M02 Unseen | 0:06–0:37 | Her solitude, before we meet her | A barely audible low string drone on A minor. The guitar's three falling notes land on her boot sketch (her past). |
| M03 Her hand | 2:26–2:38 | The wordless gesture: her hand stays on his shoulder (A45–A46) | A few hesitant guitar notes and one string swell, unresolved. |
| M04 Recognised | 3:34–4:10 | The turn: someone sees her | The strings warm from a bare fifth to A major under the share menu and the temple light. The guitar's rising phrase answers "Yes, Second Lieutenant Helena Duncan." |
| M05 Didn't attend | 4:16–4:37 | Weight, injustice, dignity | A low cello pedal, then a hard cut to silence. |
| M06 The laugh | 4:57–5:14 (into Q14) | The film's first warmth | A light, bright guitar figure in A major, after the laugh has broken. |
| M01c The corner | Q22, the last blink to the title | Recognition: she lets him keep her pace | The whole theme (already chosen). |
| Q14–Q22 | to plan with those sequences | The walk, "No promise?", the desk's reply, "Slow down, Oren." | Fragments only: the theme waits for the corner. |

## 2. Symbols: things carry the story

| Thing | What it means | Where it appears | How it is used |
| --- | --- | --- | --- |
| **Her boots** | Her soldier self. Worn, with the sole coming loose: what's left of her. | A07 (under the window), A10 (the sketch: "Hers. The laces unfinished."), A76 (she moves her boot for the bag), A85 (her boot touching the lunch bag again) | Cut from her boots to the drawn boots (in v8). The unfinished laces are a life paused. Her boot drifts back to the bag: hunger she won't ask about twice. |
| **The paper bag** | Care for someone else, her hunger, and his purpose | A14 (her POV, swinging), Q08 (held level with her face), Q12 (between his feet), A54 (at the corner, swinging in time with her) | Its swing is whose pace he keeps (SOUND_BIBLE). The music's pulse at the end can match its swing. |
| **The temple light** | His inner life: silent, never explained | A34–A35, B20, B30 | Never a sound effect. The music warms under it (M04) instead. |
| **The seam** | He is made, and honest about it | B06 | She looks, then looks him in the eye. |
| **The cracked handset** | Her damage. It snags on the lining (A12). | A09–A12, A31–A34 | Her life is on a cracked screen: the boots she draws, the folders she guards. |
| **Grey regulation shoes and his slippers** | The system's uniform, and a care worker's feet | A05, A16 | She notices the slippers first: he's not one of them. |
| **The window signs** | History. The new decals offer free, machine-run services; the old sign's lost kindness ("FREE WASHES FOR SCHOOL UNIFORMS") is half peeled away. | A06 (in v8) | The street's history in one frame, no exposition. |
| **Her rank** | The history she carries, spoken aloud at last | L33 | The film's turn. M04 lifts here. |

## 3. Editing: association before explanation

- **Cut on meaning, not only on continuity.** Her boots, then the sketch of her boots (v8). For Q14–Q22: her hand on his shoulder (A45) echoes her hand tugging his sleeve ("Slow down, Oren.", B30).
- **Let faces finish their thoughts.** After "Yes, Second Lieutenant Helena Duncan." the cut stays on her as her head comes up. The music says what she won't, before "Do you know how long it's been…".
- **Sound leads picture.** Music enters a beat before the image explains it (J-cuts); her laugh is heard before the warmth arrives.
- **Silence as a cut.** The hard out after "Didn't attend." is an edit in the score, not a fade.
- **What existing footage allows:** music, holds within the takes, split edits. What needs new takes: wordless reaction shots and inserts the takes don't have (for example a close-up of her boot touching the bag for A85, and Oren's hands setting the bag down in Q12). They'll be packaged before any generation.

## 4. Cinematography: the camera's behaviour changes, the grade does not

As in the reference, the **grade stays one look** (look C, 250D Daylight, on every shot). What changes is how the camera behaves as she is seen:

| Movement | Beats | Camera | Feeling |
| --- | --- | --- | --- |
| **Unseen** | Q01–Q06 (until "Are you in pain?") | Long lenses, observational, often from across the street. Passers-by cross between the camera and her; she is small in a busy frame. | Nobody sees her. |
| **Seen** | Q07–Q13 (from sitting down to the laugh) | 35–40 mm at eye level, steady. Closer singles, then the two-shot that shares the frame. | Intimacy. |
| **Together** | Q14–Q22 (the walk and the corner) | Wider, moving with them at her pace, the street opening around them | Belonging, with the world still going on. |

The current Q01–Q13 takes partly follow this. Regenerations (and Q14–Q22) should push it: the Q13 wide pickup first, then any sequence the author picks. A package (board, refs, prompt, cost) comes before each generation, and nothing is generated without the author's go.

## 5. Performance: gestures instead of explanations

DIRECTION.md already holds this. Her hand stays on his shoulder and she looks at her palm. Her head comes up at her rank. The laugh breaks through her trying to stop it. Oren is still: the light is his only expression. Generations keep to wordless gestures; nothing new is said.

## 6. History: in the frame, never explained

2041: the technology stopped improving and only got cheaper, and polite machines run the public services. A veteran of two tours is failed by a lift and a form. The film carries this history in things: the window's signs, the regulation shoes, the benefits notice, her rank, the boots. It also carries it in **crowds**: busy streets that go on outside the frame (the house rule: the street is never empty; for new takes, ask for twice the passers-by you think you need).

## What is built now, and what waits

- **Built now (no video generation):**
  - the score for Q01–Q13 (M02–M06), placed, ducked and mixed into v9
  - the symbols already on screen (window, sketch, handset)
- **Waits for the author's go and fal funds:**
  - the Q13 wide pickup
  - regenerations under §4's camera plan
  - the new inserts in §3
  - Q14–Q22 with their cues
