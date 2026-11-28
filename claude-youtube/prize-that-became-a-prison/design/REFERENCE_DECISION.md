# What fern actually does, measured, and the decision for our film (28 Nov 2026)

The author asked: "Pls watch those my reference videos and give me a decision."

Both reference films were analysed shot by shot:
- **Motion.** Every shot's camera motion and in-frame motion were measured (scratchpad analysis/shot_motion.py).
- **Labels.** Every shot was labelled by picture type (analysis/cia_labels.json, darkweb_labels.json).
- **Visual check.** Frame pairs 0.5-1 s apart were compared inside sampled 3D shots.

## The numbers

| | The Kids Who Hacked The CIA | The Hunt for the King of the Dark Web |
| --- | --- | --- |
| Length, shots | 23:05, 334 shots | 18:50, 198 shots |
| Average shot | 4.2 s | 5.7 s |
| First 3 minutes | 105 cuts (35 a minute) | 74 cuts (25 a minute) |
| Average shot after minute 3 | 5.3 s | 7.7 s |
| fern's own 3D | **43.5 %** of runtime | **20 %** |
| Motion graphics (maps, timelines, node graphs, quote cards, titles) | 21 % | **55 %** |
| Documents and screens | 18 % | 19 % |
| Real footage | 14 % (median shot 1.1 s) | 6 % (median shot 0.6 s) |
| Photos | 2 % | 1 % |

## How their 3D moves

**Mostly, it doesn't.** In 14 of 16 randomly sampled 3D shots from the CIA film, the mannequin does not move at all between frames a second apart. The phone call in the lobby, the sofa, the desk and the dog are all posed figures. Only the camera moves: a slow push, a drift, a crane through a window. Video plays on the screens inside the set.

Real character animation is rare, short and kept for key beats:
- a hand raising a phone into frame;
- the police raid;
- in Dark Web, the arrest bookends: walking, a chase, guns drawn.

The 22 hand-on-keyboard inserts in the CIA film average 1.6 s, and most are nearly static.

**A few sets carry everything.** Three versions of the hacker's bedroom make up 44 % of all the CIA film's 3D time. Each scene is covered the same way: a wide shot, an over-the-shoulder shot at the monitor, quick hand and prop inserts, then a reaction.

**Real media lives inside the 3D.** News plays on rendered TVs and monitors. Documents and tweets sit on rendered screens the camera pushes into. Phone screens are held in rendered hands.

**Text is part of the world:**
- names and dates float in the 3D space ("Virginia, 2008", "Alpha02", "Robert Miller");
- interview audio becomes quote cards with a waveform, held up to 44 s;
- node-graph sequences run unbroken for up to a minute.

**Not copied:** fern's "AI generated voice" tag, the source credits and the citation numbers. The author's rule bans on-screen labels.

## The decision

1. **Use fern's own method: posed figures, moving cameras.** Our statue figures stay posed in our sets, and the camera does the moving: slow pushes, drifts, tilts and rack focus. We make these from high-quality stills with depth parallax, here, for free. This is how about 85-90 % of fern's 3D works.
2. **More angles, cut faster, instead of more animation.** Each set gets 4-6 angles in fern's coverage pattern: a wide shot, over the shoulder, hand or prop inserts, a reaction. Codex renders the extra angles as stills, also free.
3. **Real media inside our sets.** Tim's testimony and the NBC reports play on the TV in the family home and on Tim's desk screen. The prize email and the search play on Dawn's laptop. Documents are pushed into on screens. This is composited here, for free.
4. **Animate only 6-8 key beats,** as fern does with the raid and the phone:
   - Dawn walking in the Hong Kong rain;
   - the hand typing the reply;
   - the bags onto the scale and along the belt;
   - the officer lifting the tote;
   - the cell door closing;
   - dust in the corridor light.

   Eevee for most of them and Cycles for 2-3 close-ups, inside the author's **300-500 credits**.
5. **Rebalance toward fern's mix.**
   - 3D: about 40-45 %.
   - Kinetic text and motion graphics: about 25-30 % (the 3D timeline, case files, maps, testimony quote cards with Tim's real voice).
   - Documents and screens: about 15 %.
   - Real footage and photos: about 15 %. We have more real material for this story than fern had.
6. **Pace like fern.**
   - The first 3 minutes at about 30-35 cuts a minute: 3D angles and real footage at 0.5-1.5 s.
   - Then settle to a 5-7 s average.
   - Hold long on the testimony quote cards (up to 30-40 s) and on the emotional beats: the verdict, Gene's death, the empty chair.
