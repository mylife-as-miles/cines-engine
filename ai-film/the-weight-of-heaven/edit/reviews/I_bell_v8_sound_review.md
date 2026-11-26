# Sound audit of movement I, cut v8: the combined report

Asked for by the author, 26 November: "audit this whole stuff and give me your thoughts and criticism ... Have them review it, criticize it." Five reviewers worked independently on `out/review/I_bell_v8.mp4` from one brief (`I_bell_v8_sound_brief.md`), with every layer of the track laid out alone on the film's clock (`tools/stems_v8.py` → `out/review/v8_sound/`). Their full reviews are beside this file. Nothing was changed or spent.

**Nobody has heard this track.** Every finding is a measurement, a listening model's report, or an inference, and the reviews keep the three apart. The listening models proved unreliable in both directions (shown a quiet clip, one invented a gymnasium), so where this report says a sound "reads as" something, it means two tools agreed or one repeated itself; it is still not an ear. The author's ear is the test.

## Scorecard (out of 10)

| Reviewer | Axes | Overall |
| --- | --- | --- |
| Music editor (the choir) | entries and exits 3 · continuity across the intercut 2 · fit of choir, bell and voices 4 · serves the two worlds 3 | **3** |
| Effects supervisor | realism above 4 · realism below 2.5 · sync 7.5 · the model's own audio (10 = no harm) 3 | **3.5** |
| Design, against Villeneuve | scale 3 · silence and restraint 4 · two worlds 4 · transitions 3 | **4** |
| Storytelling, against Cameron | cause and effect 4 · weight 4 · each beat clear by ear 3 · the ending 4 | **4** |
| Re-recording mixer (QC) | loudness and dynamics 4 · balance 4 · tonal consistency 6 · edits and fades 3 · small speakers 3 | **4** |

Average 3.7. The one high mark is sync (7.5): events land on their frames. Everything else is below half.

## The verdict in one paragraph

The plan is right and the reviewers say so: two worlds, weight travelling down, a mountain that falls in silence and is heard late, a hard cut to a cup that does not move. The track does not play that plan. It is cut v5's cathedral mix sliced by the intercut and patched at the joins, with the video model's leftovers and synthesized hiss for a valley. Above, the two builds in the bell tower work. Below, as the storytelling reviewer put it, a film about weight on the ground has a ground with no weight in it.

## What the reviewers agree on, worst first

| # | Time (s) | Problem | Found by | Whose |
| --- | --- | --- | --- | --- |
| 1 | 18.8, 26.5 | **A ghost.** The hall's reverb after "Let no hand bring down" is chopped off in 40 ms at 18.8, then the same tail returns alone under Serath at 26.5, from silence, louder than the choir (the mix jumps 9 dB in 70 ms). It reads as "a cinematic hit". | 4 of 5 | the edit: v5's finished master was resumed there instead of the layers |
| 2 | 10.6–41.2 | **The choir is paused, not cut.** One 14-second pass stops whenever the picture leaves the cathedral and restarts from the same bar: three stubs of 8.4, 5.2 and 2.3 s, some of it heard twice, six fader moves in the 4.8 s round the seal, a click at 39.4. The third stub rises out of near-silence over the dust and is faded to zero in 0.45 s; it reads as a synth pad swelling. | 4 of 5 | the edit |
| 3 | 45.8–64.1 | **The bell.** The film's biggest sound lives 0.42 s before it is dropped 13 dB in one step, through a 20 ms hole; it stops reading as a bell at all. Its "long note" is the same seven seconds played twice, restarting at the cup 8 dB above where it died. Its pitch is a bell of about eight tons, not ninety, and the landing of its weight reads as a door. | 5 of 5 | the edit, and the synthesized bell |
| 4 | 52.5–57.1 | **The mountain's voice.** The roar is the model's: it reads as a jet engine or a motor, never as rock; it is mono; it ramps in over 2.5 s on top of a pure sub tone that a phone cannot play, so it is not an arrival; and it stops 74–82 ms before the cut to the cup. | 5 of 5 | the model's audio, and the mix |
| 5 | 17.7–39.4, 46.2–57.1 | **The valley has no weight and no air.** Its low end is empty (the drone was removed and nothing put back), both winds read as hiss or surf, every close sound is mono, the cleaning left a fluttering residue, and the valley is brighter than the cathedral: the two worlds are upside down. The water trembles in steady hiss with no sound and no cause. | 4 of 5 | the mix |
| 6 | 18.4–23.4, 35.2, 53–57 | **The model's close sounds fail.** The ox reads as a big cat and is louder than the Hierophant; the bowl set on the wall reads as a box lid and is as loud as the dialogue; the hoe strokes read as clicks at the lens (a "blade"); the run's boots as shoes on a hard floor. Only the swallows and the father's grab pass. | 3 of 5 | the model's audio |
| 7 | whole | **The scale is flat.** Loudest 400 ms: the stroke −10.8 LUFS, the roar −14.7, the ox −15.3, the first stroke −16.5, the lines −17.8, the landing of ninety tons −18.4, a bowl on a wall −18.7, the seal −22.4 (under the choir it interrupts), the water −36. Ten thousand voices measure the same as one man. | 4 of 5 | the mix |
| 8 | 17.7, 39.4, 46.2, 49.7, 57.05 | **Marks at the joins.** A 10 ms notch mid-phrase, a one-sample click, the hole after the stroke, 0.7 s of the model's rumble let into the silent fall, and an 82 ms gap before the cup. | 3 of 5 | the edit. The edit record said "no gap, no click": the check stepped in 100 ms and could not see them. |
| 9 | whole | **Level.** −22.3 LUFS, about 8 LU under what online video is played at; on a phone a fifth of the film falls under −40 LUFS and the film appears to end 2.5 s early. | 1 of 5 | the mix |
| 10 | 41, 45.8 | **Tuning.** The choir ends on a G a little sharp, in the major; the bell answers a quarter-tone lower, in the minor. | 1 of 5 | the choir take |

## What works and must be kept

- The two builds in the tower: strain, a hold, the landing on the slack chains; then creak, hush, the whoosh, the stroke. The stroke is the loudest thing in the film by 3.9 LU.
- Sync everywhere it was tested: the press and the lift of the seal, the ox on its head toss, the bowl, the hoe.
- The opening stroke over black (a bell, 99 %), and the cathedral's air.
- The three spoken lines, level with each other within 0.2 LU, every word clear; the answer running on over the vale.
- The ending's plan: a mute fall, a late sound, a hard cut to stillness. No choir after the bell lands.
- Nothing clipped; the limiter touches only the stroke.

## Where the reviewers disagree: the author's calls

1. **Is the choir heard in the valley?** The music editor: yes, one unbroken pass, near and full above, far and muffled below, ending by itself before the bell lands (no new sound to make). The design reviewer: no, "weight travels down, nothing travels up"; voices belong to the cathedral and the cuts back up are hard. Both come from one session and can be rendered for the author to choose by ear.
2. **Is there a hum in the ground?** The screenplay asks for one; the author had the model's drone removed. The storytelling reviewer wants a quiet hum under every vale shot; the design reviewer wants none, and low frequency only as events: the bell's note falling into the ground, a shudder at the water, the fall. *The lead's view: events only.*
3. **When does the roar arrive?** As designed and approved, two seconds into the run; the storytelling reviewer would put it on the cut, as a wall. *The lead's view: keep it late, but make it an arrival (a crack, then a wall of sound), with the ground felt first.*

## The lead's own criticism

Four of the ten problems are faults in my editing, and I reported the joins clean when they were not. The deeper mistake is one of method: I built each new cut by slicing the last finished mix and patching the seams, so every insert inherited fades, rides and reverb tails written for a different film. Movement I needs its sound rebuilt as one session on the film's own clock, cue by cue, the way the bell sequence was first mixed. Patching will not get this above half marks.

The author's second complaint is also right, and wider than he put it: it is not only the video model's sounds that fail. My two synthesized winds, the bell's size, the wax and the arrival thud do not pass either.

## The fix, in order (all local, nothing paid)

1. **One session on the film's clock.** Rebuild from layers: no ghost tail, no notches, no gaps, no reused master; every join checked in 5 ms steps.
2. **The choir** as one unbroken pass, tuned down 50 cents to the bell, one level round the seal, ending by itself before the landing. Two versions for the author's ear: heard far off in the valley, or silent there.
3. **The bell** as one note: the stroke held at full across the cut for about a second, then falling; a 19-second tail played once; a lower, larger voice; below, only its weight is heard, above, its note.
4. **Replace the model's effects** with sounds made here with Stable Audio (the effects reviewer's list of 24, each with its prompt, length and frame): the rockfall, the ox, the crows, the bowl, the hoe, the steps and boots, one clean press and lift for the seal, a real farmland bed in place of both winds, the landing at its true size.
5. **Give the valley its weight** as events: the bowl buzzing on the stone and one sub swell as the water trembles; a shudder in the ground before the father moves; the arrival.
6. **Re-level to the story and master** to −18 LUFS, −1.5 dBTP, with a phone check: the stroke first, then the arrival, the landing, the lines; the ox, the bowl and the family's Foley well under.
