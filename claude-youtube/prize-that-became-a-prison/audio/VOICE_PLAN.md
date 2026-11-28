# The Prize That Became a Prison: voice plan (for the author's approval)

Prepared 27 November 2026. **Nothing paid has been generated.** No call has been made to ElevenLabs or Gemini for this
film. Each gate below is generated only after the author says "go" for that gate, and a "go" covers only the gate it
was given for.

## The rules this voice follows

- **The narrator is the only voice.** No voice for Dawn, Tim, Gene, an officer, a judge or any other real person; no
  cloned or imitated voice. Quotations ("When would she be released?", the ministry's words) are read by the narrator
  as narration, in the narrator's own voice, as the script and DECISIONS already require.
- The text is spoken **exactly as written** in `design/script/SCRIPT_V2.md`. Pronunciation help (a dictionary entry or
  a phoneme hint) may change how a name sounds, never which words are said or what the subtitle shows.
- Directions in italics are never spoken. The pauses they set (a *(beat)* 0.8 s, *(silence, N s)* as written, 0.35 s
  between ordinary paragraphs) live in `audio/vo/scratch/lines.json` and carry over unchanged to the final read.
- No on-screen credit or "AI voice" tag (DECISIONS: no labels, ever). The voice is credited in `audio/CREDITS.md` and
  the YouTube description.

## The script, counted

101 spoken paragraphs, **1,689 words, 9,477 characters** (spaces and punctuation included, as ElevenLabs counts them).

| Chapter | Words | Characters | Scratch length | Scratch pace (target) |
| --- | ---: | ---: | ---: | ---: |
| 00 Cold open | 207 | 1,128 | 1:35.3 | 161.3 wpm (150–165) |
| 01 The winner | 239 | 1,339 | 1:32.0 | 159.9 (150–165) |
| 02 Eighteen days | 119 | 661 | 0:44.3 | 164.7 (150–165) |
| 03 The gift | 151 | 832 | 0:55.6 | 163.8 (150–165) |
| 04 Yes | 169 | 938 | 1:07.3 | 158.4 (150–165) |
| 05 Three years | 158 | 896 | 1:02.2 | 156.3 (150–165) |
| 06 The sentence | 140 | 837 | 0:57.8 | 150.6 (150–165) |
| 07 The wait | 182 | 1,095 | 1:24.7 | 131.2 (120–135) |
| 08 The father | 104 | 544 | 0:55.2 | 124.2 (120–135) |
| 09 When? | 220 | 1,207 | 1:45.5 | 131.1 (120–135) |
| **Total** | **1,689** | **9,477** | **12:00.0** | 159.1 (00–06) / 129.7 (07–09) |

The scratch read is `audio/vo/scratch/narration_scratch.wav` (Kokoro `am_michael`, local and free; 10:51 of voice
plus 1:09 of the script's pauses, including the 15 s montage after the cold open). Use it to time the edit now. A
chapter's length includes the hold after its last line. Pace is words / (voice + the ordinary 0.35 s gaps), leaving
out the designed beats and silences. The scratch voice was chosen from three Kokoro auditions on the cold open
(`audio/vo/scratch/audition/`, measurements in `audition.json`). It is a timing guide, not a proposal for the final
voice.

## The options

| | **ElevenLabs George** | **ElevenLabs Brian** | **Gemini TTS** |
| --- | --- | --- | --- |
| Model, voice | `eleven_v4`, George `JBFqnCBsd6RMkjVDRZzb` | `eleven_v4`, Brian `nPczCjzI2devNBz1zQrb` | `gemini-3.8-flash-tts`; Daniel `en-gb-training-10`, radio presenter `en-gb-podcaster-3`, dispatcher `en-gb-concierge-5` |
| Character | British, mature, warm grain; a storyteller | American, deep, smooth, middle-aged | British voices; the direction is given in words per line |
| Used before in the house | The Crownfall narrator and the House Ealdholt trailer (long narration, the closest job to this one) | FloWell (a product film) and a herald in the Crownfall prologue | Autopilot's short character lines and radio voices |
| Flow from line to line | `previous_text` / `next_text` on each request, so 101 separate lines read as one reading (proven in `narrate_elevenlabs.py`) | the same | None: each line is an independent call, so pitch and energy can drift between paragraphs; the style annotation has to hold the read together |
| Direction | Voice settings per chapter (stability, style, speed); audio tags in square brackets for v4 if ever needed | the same | A `speech_metadata` style annotation per line, never spoken (for example "low, controlled urgency, close") |
| Output | MP3 44.1 kHz 192 kbps (the Creator plan has no PCM), cut to 48 kHz mono WAV | the same | 24 kHz mono |
| Fit for this film | Gravity and restraint; a British narrator on an American story is common in documentary | Native to the story's places (Chicago, Congress, the State Department); one of the most heard stock voices on YouTube, which can read as "AI channel" | Cheapest by far and the most steerable in words; weakest continuity over 12 minutes |
| Cost of the whole package (below) | about 15,200 credits; USD 1.22 to 4.56 | the same | about USD 0.25 |

## Cost

Characters sent as text to speak (ElevenLabs bills every letter, number, space and punctuation mark):

| Item | Characters |
| --- | ---: |
| Gate 1, audition: the cold open (chapter 00, 14 paragraphs, 1,128 characters) in George and in Brian | 2,256 |
| Gate 2, the full read in the chosen voice | 9,477 |
| Gate 2, two more takes of each of the 27 lines that carry the film (1,026 characters) | 2,052 |
| Reserve for retakes the author asks for (15 % of the script) | 1,422 |
| **Total** | **15,207** |

- **ElevenLabs `eleven_v4`**: about one credit per character, so about **15,200 credits**, some 15 % of the Creator
  plan's monthly 100,000 credits. In money, between **USD 1.22** (v4 listed at USD 0.08 per 1,000 characters on
  ElevenLabs' API pricing) and **USD 4.56** (Creator overage, reported at about USD 0.30 per 1,000) if the month's
  credits are already spent. Gate 1 alone: 2,256 credits, USD 0.18 to 0.68.
- **Unknown, checked on the first request**: whether the `previous_text` / `next_text` context is billed. The docs do
  not say. If it were, the package would cost up to about 67,000 credits (USD 5.36 to 20.10): still inside one month's
  Creator credits. The first audition request returns a `character-cost` header; if it shows the context is billed,
  generation stops and the author is told before going on.
- **Gemini 3.8 Flash TTS**: USD 9.00 per million audio tokens and USD 0.50 per million text tokens until 31 December
  2026 (USD 18.00 and 1.00 from 1 January 2027), at 25 audio tokens a second. The full read (about 651 s of voice,
  as in the scratch) is about 16,300 audio tokens, about **USD 0.15**; the whole package about **USD 0.25** (0.50
  after 1 January). A cold-open audition costs about USD 0.02.
- These prices were found by web search on 27 November 2026; `elevenlabs.io` itself is outside this session's
  network allowlist, so the official pages could not be opened from here. Check the account's plan and balance before
  Gate 1.

## The per-line method

1. **One source of truth.** `audio/vo/scratch/lines.json` lists every paragraph in order (chapter, index, exact text,
   file, duration, the pause after it). The final read is written as `audio/vo/final/<chapter>_<nn>.wav` with its own
   `lines.json` in the same layout, so the edit swaps scratch for final and keeps every pause; only line lengths change.
2. **Flow.** Each line is sent with the two paragraphs before it as `previous_text` and the one after as `next_text`
   (`claude-game/crownfall-intro/tools/narrate_elevenlabs.py`, copied into this film's `tools/` at Gate 2), so the
   intonation runs on like one reading instead of 101 separate announcements.
3. **Settings by chapter**, from the script's voice map and the scratch's measured pace:

   | Chapters | Delivery (SCRIPT_V2) | Pace target | Starting settings |
   | --- | --- | --- | --- |
   | 00 cold open | present tense, close, quick | about 160 wpm | stability 0.45, style 0.30 |
   | 01–02 | warmer, a little quicker | 155–165 | stability 0.50, style 0.25 |
   | 03–04 | back to present tense in the room | 150–160 | stability 0.50, style 0.25 |
   | 05–06 | slower | 150–155 | stability 0.55, style 0.20 |
   | 07–09 | slowest, most space | 120–135 | stability 0.60, style 0.15 |

   Similarity 0.8 and speaker boost throughout. The voice's `speed` setting is set per chapter from Gate 1's measured
   pace (Crownfall's narrator sat best at a 1.06 tempo, so the pace is measured, not assumed). The scratch shows how
   much the speed has to move: Kokoro needed 0.97–1.05 in chapters 00–06 and 0.78–0.88 in 07–09.
4. **No audio tags by default.** The film's rule is restraint; a tag such as `[quietly]` is tried only as one of the
   three takes of a line, and only on the last three chapters' lines. Tags are directions, never spoken words.
5. **Names.** Checked by ear in Gate 1 and again in Gate 2: Hunt; Dawn Michelle Hunt; Gene; Qingdao (CHING-dow);
   Guangdong (GWAHNG-dong); Baiyun (bye-YOON); Reuters (ROY-terz); Nelson Wells Junior; the years read as years
   ("twenty fourteen"); "January 25th, 2026" as "January twenty-fifth, twenty twenty-six". A name that comes out wrong
   is fixed with a pronunciation-dictionary alias, so the text and the subtitles stay as written. What the scratch
   showed (a speech recogniser transcribed all 101 scratch lines back and compared them with the script): Hunt,
   Qingdao, Guangdong, Reuters and the dates came back right. Kokoro read "Baiyun" as "BAY-yun" until it was given a
   phoneme hint, and even then it is heard as "bayou", so that name is the one to listen for. The American voice's
   "Dawn" was once heard as "Don" (the merged vowel). Guangzhou is not in the version 2 narration.
6. **Three takes of the lines that carry the film**, then ranked with earshot (`earshot rank "<description>" t1.wav
   t2.wav t3.wav --json`), then chosen by the author's ear. The 27 lines:

   | Line | Text | earshot description |
   | --- | --- | --- |
   | 00_01 | The bags are overweight. | a man narrating quietly and tensely, close to the microphone |
   | 00_08 | Yes. | a man saying one word quietly and firmly |
   | 00_12 | The luggage was hers. The drugs, she said, were not. | a man narrating quietly and tensely, close to the microphone |
   | 00_13 | Three years later, a court sentences her to death, with a two-year reprieve. Today, she is serving life. | a man speaking gravely and slowly |
   | 00_14 | And twelve years after that airport, her brother appears before American lawmakers with a question that no one in the room can answer. | a man narrating with quiet suspense |
   | 01_07 | It looked like she had won. | a man narrating quietly, with a note of irony |
   | 02_07 | But before she left China, they had one more gift for her. | a man narrating with quiet suspense |
   | 03_07 | Overweight. | a man saying one word quietly and firmly |
   | 03_08 | She paid the fee. | a man narrating quietly and tensely |
   | 04_03 | Yes. | a man saying one word quietly and firmly |
   | 04_05 | Yes. | a man saying one word quietly and firmly |
   | 04_09 | The same room. The same bags. The same word. Two different meanings. | a man speaking slowly and deliberately |
   | 05_07 | The verdict was worse than anything they had feared. | a man speaking gravely and slowly |
   | 06_01 | 2017. | a man saying one word quietly and firmly |
   | 06_02 | A death sentence, with a two-year reprieve. | a man speaking gravely and slowly |
   | 06_07 | Deceived. | a man saying one word quietly and firmly |
   | 06_08 | And guilty anyway. | a man speaking gravely and slowly |
   | 07_07 | And the man who had waited longest was running out of time. | a man speaking softly and sadly |
   | 08_05 | On January 25th, 2026, Gene Hunt died. He was ninety-two. | a man speaking softly and sadly |
   | 08_06 | He never saw Dawn come home. | a man speaking softly and sadly, almost a whisper |
   | 09_05 | When would she be released? | a man quietly asking a question |
   | 09_06 | Tim could not give her a date. | a man speaking softly and sadly |
   | 09_09 | It was never really his question. | a man speaking slowly and deliberately |
   | 09_10 | It was hers. | a man speaking softly and sadly, almost a whisper |
   | 09_13 | Twelve years ago, in a room at an airport, officers asked her a question. She answered it. Yes. | a man speaking slowly and deliberately |
   | 09_14 | Now she is the one asking. | a man speaking softly and sadly |
   | 09_15 | And no one has an answer. | a man speaking softly and sadly, almost a whisper |

   Alternatives for every rank: "an excited announcer", "a cheerful advertisement voice-over", "a robotic computer
   voice". The takes differ by stability (0.45 / 0.55 / 0.65) and, in chapters 07–09, one take may carry a quiet tag.
   earshot rates synthetic voices nearer "robotic" in forced choice, so its ranking is evidence, not a verdict: all
   three takes go to the author with the ranking, and the author's ear picks.
7. **Finish.** Trim silence at −50 dB, 48 kHz mono WAV, measured durations into `lines.json`; loudness is set in the
   mix (−14 LUFS integrated, loudness range 7 LU or more, SCRIPT_V2).

## Recommendation

**ElevenLabs `eleven_v4`, George, with Brian as the alternate, decided by the author's ear at Gate 1.**

- ElevenLabs over Gemini: the line-to-line context is what makes 101 paragraphs sound like one narrator telling one
  story, and the house has already shipped a long narration with it (Crownfall). Gemini is about 5 to 20 times
  cheaper, but the whole difference is a few dollars, and its lines are voiced in isolation. Gemini stays the fallback
  if ElevenLabs is unavailable.
- George over Brian: this film asks for "low, controlled urgency" and restraint at the worst moments; George's
  grain and storyteller weight fit that, and he is the house's proven long-form narrator. Brian is the more native
  accent for an American story, but he is one of the most widely used stock voices on YouTube and was cast as a
  product voice in FloWell. That is a judgment the author should make by ear, which is why Gate 1 voices both.

## What the author approves

| Gate | What is generated | Cost |
| --- | --- | --- |
| **Gate 1** | The cold open (1,128 characters) in George and in Brian, `eleven_v4`, with previous/next text, chapter-00 settings; optionally the same in Gemini Daniel for comparison | 2,256 credits (USD 0.18 to 0.68); Gemini about USD 0.02 |
| **Gate 2** | The full read in the chosen voice, three takes of the 27 lines above, earshot ranking, the author's picks | about 11,500 credits (USD 0.92 to 3.46), plus up to 1,422 for retakes the author asks for |

Say **"go"** for Gate 1 to start. Nothing is sent before that.
