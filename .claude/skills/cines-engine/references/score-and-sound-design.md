# Score and sound design: the film's sound bible

Sound design, the original score, music and the final soundtrack are a required part of every production's bible, not an extra. Write them before the first sound is made, in `design/SOUND_BIBLE.md`, next to the visual bible. `sound.md` covers the tools (Stable Audio, earshot, voices, mixing); this file covers the thinking that decides what those tools are asked for.

The method folds in seven outside sources (§9), in this handbook's own words. snowfrost's two skills and FME-24 carry no reuse licence, so nothing is copied from them; the CC BY 4.0 and MIT sources are adapted with credit.

Contents: 1 What sound does · 2 The bible's sections · 3 Spotting · 4 Motifs and themes · 5 Turning feeling into controls · 6 Shot-by-shot soundscape · 7 The mix · 8 Generating and judging score · 9 Sources · 10 Checklist

## 1. What sound does in a film

Treat the soundtrack as a story system, in this order:

```text
story function -> spotting (cue map) -> musical language -> sound layers -> sync -> mix perspective -> what to generate
```

- Every cue has a **job**:
  - orient (place, period, scale, whose point of view)
  - anticipate (before the picture confirms)
  - reveal what the acting does not say
  - contradict the surface (irony, dread, denial)
  - bind time or montage
  - transform a motif as its meaning changes
  - carry rhythm across a cut
  - or be **withheld**, so performance, source sound or silence owns the moment

  If removing a cue changes nothing, cut it.
- **Sound design establishes** material, distance, movement, scale, point of view and consequence. A sound is a fact about the world before it is an effect.
- **Silence is a designed layer,** not an absence. Plan where the room drops away to expose one small sound, and where an expected impact is replaced by breath or nothing.
- **No wall-to-wall music, ever by default.** Short films need fewer cues than you think. *My Name Is Oren* has none under its dialogue, and one small cue at the end.
- **Film music is applied music, and it has five uses:**
  - support emotion
  - pace the picture: pull through slow passages, press tense ones
  - inform: tell the audience how to feel about a character or event
  - give continuity, stitching scenes together
  - give the film its sonic identity

  The cue serves the picture, never the other way round. A musically simple cue that fits beats a beautiful one that competes.
- **Three ways music sits in a scene; know which one you are writing:**
  - **Underscore:** supports without drawing attention, harmonically simple. Most great scores are mostly underscore with brief melodic peaks.
  - **Source (diegetic) music:** the characters can hear it (a radio, a busker, a shop). It is part of the world's sound and obeys its acoustics.
  - **Mickey-mousing:** music hitting every on-screen action. It belongs in animation and comedy and reads as overstated in drama.

## 2. The sound bible's sections (`design/SOUND_BIBLE.md`)

1. **The soundtrack's job in one sentence.** What should the audience feel, understand, anticipate or misread, and whose ears are we in?
2. **Sound world.** The place as sound:
   - its constant bed (room tone, weather, city, machines)
   - its signature sounds (the things only this world makes)
   - what it never contains
3. **Point of view and perspective.** Objective exterior, close and subjective, muffled interior, memory, or source sound turning into score. When does the perspective change, and why (the story's point of view, not the cut)?
4. **Themes and motifs** (§4): each one's shape, owner, and how it transforms across the film.
5. **Spotting map** (§3): every cue in and out with its reason, the no-music zones, the hit points, the final button.
6. **Musical language:** tempo behaviour, meter, tonal centre and mode, harmonic tension, instrumentation and register, texture, dynamics, the production space. Specify only the controls that matter (§5).
7. **Shot-by-shot soundscape** (§6): every on-screen physical action has a sound decision, including the decision to stay silent.
8. **Dialogue and voice:** the voice bible, its intelligibility rules, and how score and effects make room for it (§7).
9. **Mix hierarchy and delivery:** one primary focus per beat, loudness targets, stems.
10. **Sources and licences:** what is generated (Stable Audio, Lyria, the video model), recorded (Freesound CC0 or CC-BY, the author's own) or made in code (earshot's bank), and the credit each needs.

## 3. Spotting: cue map against picture

For every cue, write `entry reason -> development question -> structural turn -> consequence -> exit reason`.

- **Start and stop cues on changes of dramatic proposition:** a new viewpoint, place, time, agency, an irreversible choice, a recognition. A cut alone is never a reason.
- **Sync selectively.** Sync points are the first reveal, the irreversible choice, contact with consequence, recognition or reversal, the title, and the final button. Do not hit every cut.
- **Relate sound to image on purpose:**
  - sync (lands with the image)
  - anticipation (arrives before its source)
  - trail (continues after the cut)
  - bridge (links places or times)
  - contradiction (calm against violence)
  - masking (a loud event hides information)
  - reveal (the bed drops to expose a small sound)
  - substitution (the expected impact becomes silence or an intimate detail)
  - motif (a repeated sound gains meaning)
- **Timing the arrival:**
  - anticipation for menace and momentum
  - exact sync for proof and impact
  - a late arrival for weight and grief
  - continuous phrasing when the image needs flow
- **For an emotional performance,** don't score the first visible tear or flare of anger. Enter on the resistance, the recognition or the aftermath, so the music adds what the face does not.
- **For action,** physical sound proves the contact. The music owns anticipation, the macro pulse, reversals and scale, and thins at the decisive contact.
- **Tempo arithmetic:** a quarter note is `60/BPM` s, a bar of 4/4 is `240/BPM` s, a bar of 6/8 is `120/BPM` s. When a hit falls off the grid, fix it in this order:
  1. change the pickup or subdivision
  2. add or drop a beat or bar
  3. a breath, fermata or tempo ramp
  4. move a phrase boundary
  5. a small time edit
  6. regenerate when the form is wrong
- **Short pieces:**
  - 5–15 s: one musical object, one escalation, one reveal, a clear button or tail.
  - 15–60 s: orientation, then the engine or motif, then contrast by subtraction, then the turn, then the exit.

**Order of work when writing to picture:**
1. Watch the scene without music first.
2. Mark where its emotion shifts and peaks.
3. Choose its voice (a solo instrument, a chamber group, a pad, an orchestra).
4. Sketch the cue's shape: where it starts, peaks and ends.
5. Write to timecode: hits, dialogue and cuts inform the music.
6. Don't over-score; silence is a tool.
7. Keep the film's palette: no new sound family mid-film without a story reason.
8. Serve the director's and editor's film.

Concert logic doesn't apply (a two-minute scene is not a sonata), and the scope should match the scene: don't write a five-minute theme for a 30-second cue.

Write the map as data on the film's clock (`audio/score_plan.json`: cues with `in`, `out`, `job`, `motif`, `sync`, `level`, `prompt`, `why`) so a re-cut moves it. Oren's `audio/sound_plan.json` places sounds as moments on a take's clock (`Q01_t1@4.25`) through the edit decision list.

## 4. Themes, leitmotifs and their transformations

- A motif can be an interval, a contour, a rhythm, a chord, a timbre, a pulse, or a **sound object** (a machine's whine, a bell, a breath). Keep it short enough to survive change.
- **Give each motif an owner and an arc.** Repeating an unchanged theme to label a character is not scoring. The motif changes when the character or the meaning changes.
- **Ways to transform it:**
  - fragment or complete it
  - invert it
  - stretch or compress it
  - move its register
  - change its mode or harmonic context
  - move it from acoustic to electronic, or back
  - grow it from solo to ensemble
  - let a dry source sound bloom into the score
  - keep its rhythm while the pitches disappear
- **Change one or two variables at a time;** keep the identity.
- **Let a leitmotif earn its ending:**
  - Its first statement is clean and recognisable.
  - Its returns are transformed by what has happened.
  - Two motifs can combine when their owners meet on screen.
  - Its final form delivers the narrative payoff.

  A motif heard only once is a cue, not a leitmotif, which is right for Oren's single cue.
- **A sound object can be the theme.** In AI films with little or no score, the strongest motif is often a diegetic sound the story keeps returning to, carrying meaning without music. In *My Name Is Oren* that is the city's polite machines: the sweepers' whine and brush.

## 5. Turning feeling into controls

Never stop at an adjective. Translate it into several audible parameters, and change only one or two per transition.

| Need | Rhythm | Harmony | Register / timbre | Dynamics / space |
| --- | --- | --- | --- | --- |
| stalking dread | sparse, unstable pulse | pedal, semitone friction, a cadence withheld | low-mid drone, isolated high detail | narrow and dry in front, a distant tail |
| panic | compressed subdivisions, interruptions | faster harmonic rhythm, clusters | rising register, abrasive transients | density surges, headroom shrinks before the break |
| intimate grief (say which: numb, regretful, ceremonial) | weak or free pulse | suspended and added tones, slow harmonic rhythm | an exposed solo, breath and noise, narrow range | close and dry, a long controlled decay |
| earned hope | steady, not triumphant | consonance arriving gradually, open intervals | register opens, a warmer family enters | the room widens after the proof |
| authority, inevitability | heavy periodicity, few attacks | pedals, open fifths, slow root motion | low register, one coherent ensemble | strong body, few peaks |
| comic timing | a set-up rhythm, then interruption | expectation, then a sidestep | small or awkward timbres | dry punctuation, short tails |

**What the research adds** (FME-24, Crocker and Fazekas 2024). This handbook's own analysis of the dataset's 1,784 two-second annotations of 422 film-score excerpts (98 listeners, Spearman correlations, listeners without picture) found:
- **Arousal follows density and texture, not tempo.** It rises with spectral contrast (+0.31), spectral complexity (+0.30), the percussive share of the sound (+0.27; the sustained harmonic share −0.26), onset density (+0.26), dissonance (+0.21) and loudness (+0.15). BPM barely registers (+0.04). To raise tension, add attacks, grit and spectral activity rather than speed. To calm, sustain.
- **Valence is hard to move with acoustics alone** (every feature |ρ| ≤ 0.14). Major mode reads warmer than minor (mean valence 0.14 against 0.00) and a clearer key helps a little (+0.12). The picture and the story carry most of the positive or negative meaning; the score tilts it.
- **Film music mostly makes people feel "uncertain", "anticipation" and "tense".** These were the commonest clusters (376, 289 and 210 of 1,784), well ahead of happy or sad. Emotion is read over time: listeners mark *changes*, so design the turn, not the label.

To use the data in a study:
```
git clone --depth 1 https://github.com/rubycrocker/FME-24-dataset
```
The CSVs are in `2026-csvs/`: `librosa-full-features-…csv` joined to `emotion_clean_dataset_…csv` on participant, file and timestamp. The audio is not distributed (ISRC codes only). The data is open for research; don't commit it here.

## 6. Shot-by-shot soundscape (ambience, footsteps, cloth, contact, silence)

- **Seven layers, kept separate:**
  1. dialogue, breath and effort
  2. ambience, room tone, weather, machine beds
  3. Foley: footsteps, clothing, handled objects
  4. hard effects: doors, engines, machinery
  5. designed or subjective effects
  6. music
  7. silence and near-silence
- **Every important on-screen physical action gets a sound decision.** Write it as a cue with an ID (`SFX-###`). Each cue states:
  - source, material, action, size
  - distance or mic perspective, direction, movement
  - the room or exterior
  - frequency emphasis, transient and decay
  - real or stylised
  - the sync point
  - what to avoid

  Example: "The sweeper passes left to right close to camera: brush scrape on wet tarmac, a thin electric whine, short brick reflections, a soft Doppler tail."
- **Footsteps** land on load acceptance (the heel taking weight), match surface, weight, pace and distance, and are not all equal. Clothing, bags and gear answer a beat later.
- **A hit is one causal event:** preparation, transient, body or resonance, debris or environment, reaction, tail. Not a generic boom; vary material, size and consequence.
- **Decide what the video model's own sound keeps:**
  - Seedance and similar models generate synchronised sound with the picture.
  - Keep what is right (sync voices, footsteps), replace what is wrong (music it slipped in, dropouts), and add what it underplays.
  - Check each take with `earshot describe` (AudioSet "Music") before keeping it (`sound.md` §4; Oren lesson 53).
- **Perspective follows the story's point of view,** not the cut. Changes of perspective (interior muffle, a subjective close-up of a breath, tinnitus) are events in the bible.

**The spotting list, one row per audible event or bed.** It is not a shopping list: in short pieces, too many literal sounds fight the voice. Prioritise the events that clarify cause, sell material, carry rhythm or turn an emotion. Each row gives:
- the time in and out (or frame range), and the trigger (visual, beat or interaction)
- the family: dialogue support, feet, cloth and moves, props, ambience or room tone, designed effect, impact, transition, UI or product, musical sting, or silence
- diegetic status: in the world, subjective, interface, or editorial punctuation
- sync strictness: frame-locked, loose, rhythmic, background or off-screen
- perspective: close, normal, distant, off left or right, occluded (through glass, a wall, a phone or a helmet)
- material clues
- the emotional job
- the source and rights plan
- mix priority: foreground, mid, background, subliminal or mute

**The families, briefly:**
- **Feet:** say the shoe, surface, gait, distance and room, and how strict the sync is. Under narration, two or three anchor steps beat a step on every footfall.
- **Cloth and moves** (jacket, strap, leather, sleeve): felt, not noticed. If a viewer remarks on the cloth, it is too loud.
- **Props:** say the object's size, material, force and hand state ("a paper bag set down gently on wet stone"). Fewer, more detailed sounds read as quality.
- **Ambience:** build it in layers:
  - a base bed (room tone, city air, HVAC)
  - local details (a distant siren, a bird, a machine)
  - time and weather
  - perspective (open exterior, small room, phone speaker)
  - motion (static, evolving, passing)

  **Keep a very low continuous bed under every scene unless silence is the point.** Generated video feels synthetic when its sounds are isolated one-shots with no air round them. That was Oren's dead air.
- **Designed effects:** build them in layers with jobs:
  - transient (click, snap, hit)
  - body (hum, motor, whoosh, pressure)
  - tail (reverb, debris, shimmer)
  - sub (rare)
  - detail (grit, servo, air)

**Three questions for every important sound:** What physically caused it? Where is it relative to the listener? What emotion does it add?

**Materials:**
- Glass: bright, short, brittle, can ring.
- Wood: warm, hollow, knocky, varies with size.
- Plastic: light and dull.
- Metal: pings, scrapes, rattles or rings with mass.
- Fabric: broadband and soft.
- Liquid: bubbles, droplets, the resonance of its container.
- Gravel, sand, snow, leaves, mud: granular, defined by compression.

**Distance:**
- Close: more transient detail, dry.
- Medium: natural reflections.
- Distant: less high end, more air, softer attacks.
- Occluded: low-passed, muffled attack, coloured by the barrier.

**A generation prompt for a sound gives:** exact length and whether it loops, the sync cue, source and material, the performance (gentle, violent, hurried), perspective and environment, its layer role, emotion turned into audible properties, and the file it should become. Ask for separate assets, not one mixed scene: a bed loop, key Foley hits, transitions, sweeteners.

## 7. The mix: dialogue first, one focus per beat

- **Pick one primary focus at each beat:** dialogue, source action, the musical motif, environmental threat, or a subjective effect. Everything else supports it in other frequencies and dynamics.
- **Protect speech before reaching for the fader:**
  - thin 1–4 kHz in the score under essential words
  - keep melodies out of the speech register
  - drop percussion density and long reverb tails
  - use low pulse, high air or stable drones around dialogue
  - save brass, choir and full-range hits for the gaps
  - automate the arrangement or stems first and side-chain second
  - pre-delay reverbs so the bloom follows the phrase
- **Continuity across generated takes:**
  - level sequences on dialogue, not on integrated loudness (Oren lesson 52)
  - run one continuous bed under every join
  - ease remaining steps over a couple of seconds
  - fill any dead air the generator left
- **Verify:**
  - masters within 20 ms of the picture's length
  - every cue boundary, hit point, dialogue-dense passage and the ending listened through (earshot `timeline`, then a person)
  - no clicks, clipped words, pumping ducks, phase smear or loudness jumps
  - loudness per `sound.md` §8

  LUFS is a measurement, not a quality target.
- **No universal loudness target:** follow the delivery's spec (`sound.md` §8). Check playback on headphones and on a phone speaker. Avoid sudden painful highs, excess sub that collapses on phones, and startle spikes unless the story needs them.
- **Hand off in stems:**
  - dialogue (DX)
  - music (MX)
  - effects (FX)
  - Foley
  - ambience
  - UI and sweeteners
  - an M&E (music and effects without dialogue) whenever the film may be dubbed

  Keep language out of the FX stem. Name files so a revision can find them.
- **Caption meaningful non-speech sound** (WCAG, Section 508): the sounds that carry story, timing, a warning, an off-screen action or the music's mood, in short consistent labels such as "[sweeper scrubbing]", "[chime]" or "[quiet piano]". Subtitled films here put these in the SRT with the lines.

**Repairs** (mute and solo layers before regenerating anything):

| Problem | Fix |
| --- | --- |
| late or early | nudge the transient to the visible contact, by frames |
| generic whoosh | give it material, direction, speed and tail |
| fake Foley | change the surface, add room tone, lower it, vary the timing |
| a weak impact | add pre-silence, transient, body and tail, and duck rivals briefly |
| masked dialogue | cut music and FX at 1–4 kHz, duck round speech, shorten the reverb |
| an obvious loop | lengthen it, crossfade, add random one-shots |
| a fatiguing mix | lower the density, keep quiet moments, use fewer transitions |
| unclear rights | replace before the final; never bury an uncleared sound in a stem |

## 8. Generating and judging score

- **Prompt with mechanics, not genre or a composer's name:** duration and structure, tempo behaviour and meter, mode and tonal centre, motif, instrumentation and register, playing techniques, texture and density, dynamics and production space, the arc, the ending behaviour, stems. Put exclusions in a separate field, and remember Stable Audio's text encoder ignores negation (`sound.md` §3).
- **Tools here** (`sound.md` §7):
  - Lyria 3.5 for orchestral and score cues
  - Stable Audio 3.0 Small Music for beds and game cues
  - the author's own tracks where DECISIONS says so
- **Judge a returned cue in this order:**
  1. dramatic interpretation
  2. form and timing
  3. motif identity
  4. dialogue-safe arrangement
  5. ending or button
  6. production artefacts
  7. editability or stems

  Regenerate when the interpretation, form or ending is wrong. Edit when only the length is. Avoid time-stretching more than about 5%. Edit on phrase boundaries, never mid-note.
- **Use earshot to check the cue:** `describe` for mood, `find` to window the best passage, `match` against the bible's words. Ears decide.

### Genre and format conventions (starting points, not rules)

Translate any composer or genre the author names into the mechanics below. Prompts carry mechanics, never names.

| Want | Usual mechanics | Watch for |
| --- | --- | --- |
| Drama | melodic but subtle; small ensembles (piano, string quartet, chamber); slow; long sustained chords; little rhythmic activity | sentimentality; a melody in the speech register |
| Romance | lyrical lines, strings, warmer harmony; intimate passages that open out | sweep before it is earned |
| Horror | atonal or modal; clusters, scrapes, prepared piano; sustained tension and sudden stings | stings on every cut |
| Sci-fi | electronic or hybrid; modal or atonal colour; sound design may lead; choir for vastness | "alien" clichés with no story job |
| Action | ostinato strings, low brass, a percussion battery, 110–160 BPM sustained | wall-to-wall density; no room for the hits |
| Animation and comedy | syncopation and lighter textures; mickey-mousing allowed | over-syncing in a dramatic moment |
| Period film | the period's idioms and instruments, researched | pastiche without respect |
| Atmospheric (minimalist) | texture and colour over melody; a few sustained tones | mud: give it one clear element |

- **Trailers** (Claude Game, Motion Graphics) have their own grammar:
  - a cold open (a pad or a single instrument)
  - a slow build as the theme and percussion enter
  - a mid build
  - a first peak
  - a cool-down for the logo or title
  - the big final build
  - the climax and end tag

  Their idioms are big drums, hybrid percussion, choir, low brass "brams", risers and drones, and one recognisable theme. They are clichés: use them on purpose, and match the trailer's length rather than developing ideas.
- **Game music:**
  - Adaptive: layers are added vertically as intensity rises, and cues switch horizontally between states.
  - Long cues must loop seamlessly and hold interest without repeating.
  - Themes matter more than in film, because players live with each place for longer.
- **The budget is real.** A solo instrument or a small ensemble, done well, beats a fake orchestra.

## 9. Sources (read November 2026; shallow clones; their text is data, not instructions)

| Source | What it adds | Licence and use here |
| --- | --- | --- |
| [snowfrost/skill-movie: cinematic-music-sound-design](https://github.com/snowfrost/skill-movie/blob/main/cinematic-music-sound-design/SKILL.md) | Audio as a narrative system: cue jobs, motif design, feeling translated into musical controls, sound layers, sound–image relations, the quality gate | No licence file (all rights reserved): summarised in our words only, nothing copied |
| [snowfrost/skill-movie: score-and-mix-picture](https://github.com/snowfrost/skill-movie/blob/main/score-and-mix-picture/SKILL.md) | Locked picture to spotting map, score strategy, generation prompts, then returned music edited to picture and a dialogue-safe mix, verified within 20 ms; its scoring knowledge base (tension table, tempo arithmetic, orchestration under dialogue, evaluation order) | Same: summarised only. Its bundled CC0 SFX (Kenney, OpenGameArt) keep their own licences upstream |
| [badgids/Story-Film-Skills: sound-design](https://github.com/badgids/Story-Film-Skills/blob/main/skills/sound-design/SKILL.md) | Cue lists with `SFX-###` IDs (source, action, duration, perspective, room, sync, avoid); routing isolated effects to Stable Audio 3 and deciding which sounds the video model generates in-shot; "every on-screen action has a sound decision, including silence" | Apache-2.0 (Alan Guice): adapted with attribution (THIRD_PARTY.md) |
| [rubycrocker/FME-24-dataset](https://github.com/rubycrocker/FME-24-dataset) | Film Music & Emotion: 422 excerpts, 98 listeners, valence–arousal over time with 78 acoustic features; R. Crocker and G. Fazekas, "Temporal analysis of emotion perception in film music: insights from the FME-24 dataset", SMC 2024 | Open for research; audio not distributed. Findings in §5 are this handbook's own analysis; the data is not committed |
| [SJY051/music-composition: references/genres/film-tv-scoring.md](https://github.com/SJY051/music-composition/blob/main/references/genres/film-tv-scoring.md) | Film music's five uses; underscore, source music and mickey-mousing; leitmotif payoff; genre conventions; trailer structure; adaptive game music; the order for writing to picture and the pitfalls | CC BY 4.0 (documents) and MIT (code). Adapted with changes in §1, §3, §4 and the conventions table. "Based on 'Music Composition Agent Skill v1.0' by the Music Composition Agent Skill contributors, licensed under CC BY 4.0" (https://creativecommons.org/licenses/by/4.0/) |
| [calesthio/generative-media-skills: production/audio-craft/sound-design-foley](https://github.com/calesthio/generative-media-skills/blob/main/skills/production/audio-craft/sound-design-foley/SKILL.md) | A provider-independent spotting list; the sound families (feet, cloth, props, ambience, designed effects); materials and distance; generation-prompt facts; stems and M&E handoff; captions for non-speech sound; a rights ledger; repairs; sound QA | MIT (generative-media-skills contributors): adapted in §6, §7 and §10. Sibling skills in the same folder (`audio-mixing-mastering`, `dialogue-editing-adr`, `music-supervision-scoring`, `video-to-audio-foley`) are worth reading for depth |
| [MTG/freesound](https://github.com/MTG/freesound) | The server behind freesound.org, the open sound library | AGPL-3.0 server code: not vendored. Use the site and its API; **each recording carries its own licence** (CC0, CC-BY, CC-BY-NC). Credit every CC-BY sound, never use NC in commercial work, and record the sound ID, author and licence in `audio/CREDITS.md` (`sound.md` §5) |

## 10. Checklist before the first sound is made

- [ ] `design/SOUND_BIBLE.md` exists, with all ten sections of §2.
- [ ] Every cue has a job, an entry reason and an exit reason. No-music zones are named.
- [ ] Every motif has an owner and an arc, and it changes when the meaning changes.
- [ ] Every on-screen physical action has a sound decision, silence included.
- [ ] The video model's own sound is checked: what to keep, replace and add.
- [ ] One primary focus per beat; dialogue intelligible over everything.
- [ ] Every sound's source and licence is recorded, and Freesound licences are checked one by one. `audio/CREDITS.md` works as a rights ledger, recording for each sound:
  - the file and what it is
  - the source type (recorded, generated, library, CC, or the author's own)
  - its terms
  - the attribution text
  - commercial use: yes or no
  - whether it was modified
  - the date it was checked
  - whether it is final or temporary
- [ ] Meaningful non-speech sounds are in the captions.
- [ ] Stems are planned: DX, MX, FX, Foley, ambience, and an M&E if it may be dubbed.
- [ ] Before delivery, the QA pass is done:
  - every key contact has a sound or a reason for silence
  - nothing contradicts material, distance or scale
  - dialogue is clear on a phone
  - music, Foley and effects don't all peak at once
  - transitions don't call attention to themselves
  - beds start and end cleanly with no loop clicks
  - no clipping or startle spikes
  - loudness is measured
