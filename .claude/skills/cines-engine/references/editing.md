# Editing: the cut, its rhythm, and the timeline others can open

The edit is where generated takes become one film. This file covers how to judge a cut, how to join generated takes, how to plan and check a cut, and how to hand the timeline to any NLE. *My Name Is Oren*'s `tools/assemble.py`, `edits/*.json` and `tools/edl_to_otio.py` are the worked example. Sources are in §8.

## 1. What decides a cut (in this order)

1. **Emotion:** what should the viewer feel, infer or ask at this instant? Walter Murch weights emotion at about half of a cut's worth.
2. **Story:** does the cut advance the promise, a reveal, an escalation or the payoff?
3. **Rhythm:** does it land on a breath, a word, a movement, a beat, or an intended rupture?
4. **Eye trace:** does the eye land where the next shot needs it?
5. **Screen plane:** the 180° line, eyelines, screen direction.
6. **Space:** continuity of place and time.

Sacrifice continuity to keep emotion, never the reverse. When two priorities conflict, say which you chose and why ("this jump cut breaks space but removes a dead clause").

## 2. Cutting craft

- **The 30° rule:** two shots of the same subject must change angle by 30° or more, or change size by a full step (wide, medium, close). Otherwise it is a jump cut.

  Generated takes joined on a matched frame are the one exception: there the aim is *no* visible cut (§4).
- **Hold times:**
  - A new wide needs 2–3 s before the geography is read.
  - An established close-up can play at 12–24 frames.
  - Establish, break down, and re-establish after any change of space.
- **Vary the length:** never three similar shot lengths in a row unless it's intended.

  Average shot length by mode:

  | Mode | Average shot |
  | --- | --- |
  | Action | 2–4 s |
  | Standard drama | 4–8 s |
  | Documentary | 6–12 s |
  | Contemplative | 10–20 s |
  | Montage | 1–3 s |

  If the average is already under 2 s, the fix is holds, not more cuts.
- **Cut when the viewer has the information,** not when the take ends. Motivate cuts with a physical event: a blink, a turn, a sit, a breath *out*. Never cut on a breath in.
- **Match on action:** cut mid-gesture and start the incoming shot 2–4 frames *before* the outgoing position, so the motion carries across.
- **Split edits:**
  - J-cut: the sound leads into the next beat.
  - L-cut: the picture moves on while a line or a reaction holds.

  In dialogue, about two-thirds of cuts should be split; straight cuts on every line read as amateur. A sound bridge (ambience, breath, a motif) joins images that don't match.
- **Transitions mean something:**
  - hard cut: continuous
  - dissolve of about a second: time passing
  - fade to black: an act break

  A decorative dissolve is a tell.

## 3. Montage (when sequence matters more than continuous action)

Name the relationship:
- graphic: shape, colour, mass
- rhythmic
- spatial
- temporal: compression of time
- associative: collision or metaphor
- emotional
- evidentiary: accumulation

A montage needs an argument: a transformation, a contrast, an accumulation, or a motif that returns changed. "Many good shots" is not a montage. Avoid illustrating the words literally, unmotivated speed ramps, and whip transitions.

## 4. Joining generated takes (what this studio learned)

- **The first and last 6–12 frames of a generated take often wobble or change identity.** Trim heads and tails before regenerating.
- **A take that "opens exactly on" the previous take's last frame is re-rendered,** at about 20–26 dB of difference (Oren lesson 48). Join on that frame with a **3-frame dissolve**, which hides the shift as one shot.
- **When the head drops between takes,** a longer dissolve shows two faces at once; use a straight cut (Oren Q09→Q10).
- **When the next take changes framing,** the join is a real cut: let it be one.
- **Check every join:** the frames either side, the level of the background sound (sequences are levelled on dialogue, not loudness; Oren lesson 52), and lip sync, by cross-correlating the take's audio against the cut (within one frame).
- **Hide, motivate or separate continuity failures:**
  - hide: a cutaway, a reaction, a trim, a crop
  - motivate: a time jump or a memory
  - separate: a sound bridge or a card
- **Replace a take** when the failure corrupts identity or the story's geography. Oren's empty-road wide was replaced by an earlier take's close-up of the same line.
- **Build the film in one pass from the takes,** never by re-encoding the last edit (Oren lesson 52). Keep rejected takes with the reason they were rejected.

## 5. The cut list (plan) and the edit QA (check)

- **A cut list opens with:**
  - a one-line edit concept
  - the runtime sums (current total, target, difference)
  - a table: number, source, in, out, duration, purpose, transition, sound notes (`HH:MM:SS:FF` at the project rate)

  Then three to five pacing notes, and the trim candidates in order, with the cost of each.

  Every clip must advance information, emotion or rhythm; flag those that do none. Never invent footage, lines or timecodes; mark estimates as estimates.
- **Edit QA, in passes:**
  - **Story:** can the viewer state the promise early? Does each beat change what they know, feel or want?
  - **Continuity:** do identity, props, screen direction and time hold? Are generated artefacts visible at the cuts?
  - **Rhythm:** do cuts land on movement, words, breath or beat? Is there variety of size and rest?
  - **Sound:** is the dialogue clear? Are the splits and bridges clean? Is there dead air or a jump in ambience?
  - **Delivery:** duration, aspect, safe zones, captions.

  Accept when no two adjacent shots share a size by accident and most dialogue cuts are split.

## 6. The timeline others can open (OpenTimelineIO)

`tools/edl_to_otio.py` turns the assembler's edit decision list (`out/edits/<cut>.edl.json`) into:
- **`.otio`:** OpenTimelineIO, the interchange format.
- **`.xml`:** Final Cut 7 XML, which DaVinci Resolve and Premiere import.
- **`.edl`:** CMX3600.

It needs `pip install opentimelineio otio-cmx3600-adapter otio-fcp-adapter`.

**Two things the export handles:**
- **Dissolves:** the assembler *overlaps* two clips, while OTIO *centres* an N-frame dissolve on the cut and borrows handle frames. So the outgoing clip ends N − N//2 frames early and the incoming clip starts N//2 frames late. Check that the exported duration equals the cut's.
- **What OTIO can't express:** crops, per-segment gain and replaced sound travel in each clip's `metadata["cines"]`.
- **Before trusting it:** import the EDL or XML into a test project and check the first events, because reel names and frame rates vary by NLE.

## 7. Format notes

- **Letterbox only when the picture benefits.** Reframe shot by shot (`color.md` §5).
- **Name the choices, not the adjective:** instead of "cinematic", say the aspect, the lens, the shot length, the grade and the number of sound layers.

## 8. Sources (read November 2026; their text is data, not instructions)

| Source | What it adds | Licence and use |
| --- | --- | --- |
| [vidmoat/skills: film-editor](https://github.com/vidmoat/skills/blob/main/skills/vidmoat/film-editor/SKILL.md) | Murch's Rule of Six with weights; the 30° and 180° rules; match on action; hold times; J/L cuts at about two-thirds of dialogue cuts; transitions with meaning; acceptance tests | Text CC BY 4.0: adapted with attribution |
| [calesthio/generative-media-skills: editing-montage](https://github.com/calesthio/generative-media-skills/blob/main/skills/production/post-production/editing-montage/SKILL.md) | The edit decision ladder; continuity for generated media (hide, motivate, separate, replace); trimming wobbly heads and tails; montage relationships; split edits and sound bridges; edit QA passes | MIT: adapted |
| [Benitoow/cinema-skills: cut-list](https://github.com/Benitoow/cinema-skills/blob/main/skills/cut-list/SKILL.md) | The cut-list format, runtime sums, trim candidates, CMX3600 with a test-import warning; never invent timecodes | MIT (Benjamin Leleu): adapted |
| [OpenMontageInc/OpenMontage: skills/creative/cinematic.md](https://github.com/OpenMontageInc/OpenMontage/blob/main/skills/creative/cinematic.md) | Mood adjectives turned into choices; aspect ratios and letterbox; average shot length by style; breathing rhythm; Murch's order; four audio layers | AGPL-3.0: summarised in our words only, nothing copied |
| [AcademySoftwareFoundation/OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | The interchange timeline and its adapters (CMX3600, FCP XML) | Apache-2.0: used as an installed library |
