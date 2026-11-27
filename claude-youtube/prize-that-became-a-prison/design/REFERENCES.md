# The Prize That Became a Prison: references

What we borrow is grammar (pace, framing habits, labelling, palette logic), never shots, characters, text, music or footage.

## The two films the author supplied (26 November 2026)

| Film | Length | Frame | How it was studied |
| --- | --- | --- | --- |
| *The Kids Who Hacked The CIA* (fern) | 23:05 | 1280×544 (2.35:1), 25 fps | Every cut detected (334 shots), a frame at each cut and every 6 s inside long shots, full transcript with word times |
| *The Hunt for the King of the Dark Web* (an English version of a German-made film; its map labels are German) | 18:50 | 1280×640 (2:1), 25 fps | Same: 198 shots, frames, full transcript |

The author's copies came from their Drive. They are not in the repo; the frame board made from them was sent to the author and is not committed (third-party frames). The YouTube link the author first sent (fern, *The Kid Who Hacked the Pentagon*) was not watched: YouTube blocks cloud servers, and the vidIQ watch (25 credits) was declined.

## What the films do

**Numbers.**

| | CIA | Dark Web | Our script |
| --- | --- | --- | --- |
| Narration pace | 163 words/min | 157 words/min | 138 words/min (slower on purpose: "low, controlled urgency") |
| Median shot | 2.4 s | 1.8 s | — |
| Fastest minute | 44 cuts (the 1:00–2:00 teaser) | 41 cuts (1:00–2:00) | — |
| Long holds | 26–44 s on graphics and quote cards | 30–60 s on maps and timelines | — |
| Narration gaps ≥ 2 s | 21 (longest 10 s) | 23 (longest 10 s, after the cold open) | Script asks for silences at the key lines |

**Cold open.** Both start in the present tense on one person, a date and a place, doing something ordinary ("It's October 2015, a chilly day in autumn. John Brennan receives a weird phone call." / "On the morning of July 5th, 2017, a man sits in front of his laptop in his villa in Bangkok."). The twist lands inside 40 s. The cold open ends on a question or "this is their story", then 8–10 s with no voice (music, title, "Chapter 1" card) before the story restarts years earlier.

**People.** Every real person in a reconstruction is a faceless mannequin: white or grey, no features, dressed for the role (suit for the CIA director, red T-shirt for the teenager, orange jumpsuit in prison). It reads at once as a reconstruction and never as a likeness. Real photographs are used only where they are public record; private people's faces are blurred (a minor's eyes, a partner's face).

**Evidence on screen.** Real documents shot as paper in shallow focus with a slow push, the key phrase lit in yellow highlighter. News headlines the same way. Quotes from chat logs or court are typed out line by line over a dark, red-tinted image with a red waveform that moves as the voice reads. Maps are near-black with glowing red borders and route lines, a pulsing ring on the place, the city in light lines.

**Labels and sources, always on** (ruled out for our films by the author: see DECISIONS). A small source credit in the bottom-left of every archive clip ("United States Attorney's Office – Man Sentenced to 5 Years for Hacking Conspiracy (2017)"); numbered citations (`[1,13]`) tied to a source list in the description; map credits (© OpenStreetMap contributors, CARTO, MapTiler); an "AI-generated voice" tag whenever reenacted dialogue plays; an "Own opinion" tag whenever the narrator editorialises. The Dark Web film also names its sources aloud right after the title (a Wired series, a Darknet Diaries episode, "links in the description").

**Restraint at the worst moment.** The Dark Web film handles a death in custody with a black frame, then "July 12, 2017" over an empty, rumpled bed, then a dim cell window. No reenactment. The CIA film's prison beat is a slow pull back until the lit cell is a small box in the dark.

**Structure.** Named chapter cards (small white type on a dark grid). Sponsor read near 6:00 in both, built inside the film's own world. Both end by widening out to what still continues today, then one symbolic image alone in a spotlight on black (Dark Web: the mannequin wearing a crown), then credits.

**Palette.** CIA: cool desaturated grey for the institution, warm colour for the kid's bedroom, red-on-black for graphics. Dark Web: warm amber interiors, a red glowing edge on the mannequin we are following, red-on-black maps.

## What this means for *The Prize That Became a Prison*

| From the films | Where it goes in our script |
| --- | --- |
| Faceless mannequins | Solves the script's hardest rule: "never a fabricated photograph", "do not invent an image of Dawn". A mannequin Dawn is plainly a reconstruction without any label. It goes further than the script's stick-figure option. |
| Documents on paper with highlighter | Our sources are documents: Tim Hunt's 2024 and 2026 congressional testimony (S1, S2), the hearing transcript (S5), Reuters (S3). The excess-baggage line, "two-year reprieve" and the Chinese government's position can be lit on the page. |
| Dark map, glowing route | Chapter 03's route Chicago → Hong Kong → mainland China → Australia (planned), with the disputed Qingdao flight drawn as a dashed alternative and labelled. |
| Typed quote cards | Tim's testimony lines ("barely recognized", "When would she be released?") as text on screen, read by the narrator, never voiced as Tim (the script forbids fabricated family audio). |
| Labels always on | **Not used.** The author ruled out every on-screen label, tag, citation and source credit (DECISIONS). The narration already carries the attribution ("according to her brother", "her family alleges", the Chinese government's position), and the sources go in the YouTube description. |
| Death and abuse by absence | Gene Hunt's death: date, empty chair, black (the script already asks for this). The assault allegation: the narration attributes it; no image of the event. |
| The shrinking cell | Chapter 08, "What twelve years can take". |
| Chapter cards | Our 12 chapter titles, which also become YouTube chapters. |
| Symbolic final image | Our ending already has one: the two suitcases, "YES" becoming "WHEN?". |

**Where we cannot copy them.** Both films lean hard on licensed news footage (anchors, protests, raids, press conferences); much of their fast cutting is archive. We have no cleared archive, and the script allows only cleared material. More of our picture has to come from reconstruction, documents and maps, so those need more shots and more camera movement to keep the change every 5–10 s that retention needs.

## Production references the author named (26 November 2026)

All MIT-licensed; read as shallow clones, used as method, never run blind. Paid generation in them (fal image-to-3D, GPT Image) is not used without the author's go.

| Repo | What we take |
| --- | --- |
| [apekshik/anyscene](https://github.com/apekshik/anyscene) | Scene brief and dials, practical-light-first lighting, homogeneous haze (density about 0.01–0.02), ffmpeg grades, grounding and clearance checks, the critic's bar (no score below 6, mean 7 or more). |
| [apekshik/anyshot](https://github.com/apekshik/anyshot) | Camera grammar and `camrig` (already vendored in the skill): shots.json, previews, clearance, finals. |
| [apekshik/anymachine](https://github.com/apekshik/anymachine) | Props modelled part by part in Python: part list in the header, real geometry for the outline, detail under 8 mm baked, metres and −Y front, 1,500–4,000 triangles a prop, a second pass after review. |
| [apekshik/anywreck](https://github.com/apekshik/anywreck) | Wear and dents on closed props (suitcase shells, steel benches): runs on this CPU through a bpy-first launcher, about a minute a prop; rust only as vertex attributes. |
| [apekshik/anykit](https://github.com/apekshik/anykit) | Cohesion: one style paragraph and one invented maker for every prop, real-world scale, a lineup with a scale bar, one critic for the whole set. |
| [Leonxlnx/cube-to-cafe-racer](https://github.com/Leonxlnx/cube-to-cafe-racer), [koi-pond-keycap](https://github.com/Leonxlnx/koi-pond-keycap), [mechanical-moon](https://github.com/Leonxlnx/mechanical-moon), [ink-dragon](https://github.com/Leonxlnx/ink-dragon) (the author, 26 November 2026) | Four 45 s films built entirely in Python in Blender (5.2 Cycles on CPU; the moon in EEVEE), made with Claude Code. The method we take: a shared brief for part agents (`cube-to-cafe-racer/src/AGENT_BRIEF.md`: shared dimensions and materials, each agent writes only its own module, one Blender process each, a capped number of previews, self-critique against references, a short report); real bevels on every edge that catches light; dedicated lighting and look modules; every frame a pure function of time; locked shots rendered as one clean plate plus the moving region, every second frame rendered and the rest interpolated, CPU shots at 1600x900 upscaled; post in Python (grade, grain, push-ins, camera float, impact shake); sound placed from the same timeline. Our version: `scenes/AGENT_BRIEF.md` and `scenes/shoot.py`. |
| [Leonxlnx/cinetic](https://github.com/Leonxlnx/cinetic) | Motion numbers for type and maps: calm reveals (fade 28 f, rise 22 f at 60 fps), the erode-and-rise word change for YES → WHEN?, human typing at 30 characters a second, a marker wipe in 10 f, rolling year digits, routes drawn in 48–60 f; holds of max(52, 36 + 7 × words) frames. Its launch-film checks (no one-word lines, no questions) do not apply to this film. |

## Hook craft: a second study of the two films (27 November 2026)

For script version 2. Measured from the cut lists, the word timings and ebur128 loudness in 10 s blocks; the full
tables are in the session's working notes, the conclusions here.

- **The first 120 s.** CIA: present tense, a date, a named man and one wrong note ("a weird phone call"); the key
  identity held back until 0:29 ("the head of the CIA"); the music cut to silence before the payoff line; a second
  twist after 2.7 s without voice (1:03); "And this is their story" with the bass pulled out, a 10.8 s burst of 26
  cuts, the title on the musical peak (1:55), then a decay to −45 LUFS and 8 s without the narrator. Dark Web: no cut
  for 16.8 s, a safety line ("He feels safe in Thailand"), a 3.4 s drop to −31 LUFS, the hit on "a loud bang"; the
  twist at 0:39.8; the title at 0:56 followed by a 7.5 s montage of later scenes; then its weakest moment, 16 s of
  source credits.
- **Open loops.** Each film plants 7–9 and pays them minutes later on screen (the decrypting computer: planted at 9:50,
  paid at 20:26). Chapters end on a flash-forward or a named threat, then 2–10 s without narration.
- **Intensity.** A third of all cuts fall in the first 3 minutes; afterwards the average shot is 6.8 s (CIA) and 8.8 s
  (Dark Web). The narration slows at the emotional beats (126–138 words a minute). The mixes are flat: CIA −15.6 LUFS
  with a 6.0 LU range, Dark Web −10.5 LUFS with 4.8 LU. Silences come after a twist, before a chapter, or after an
  arrest or a death; almost never inside exposition.
- **Writing.** Present tense for the story, past for background; median sentence 11 words, about 17 % of sentences
  five words or fewer; one number every 20–30 s. Strongest lines: "He feels safe in Thailand." "A mistake with serious
  consequences." "Ultimately, it won't be enough." "The investigators have his name, but where is he?"
- **Where they sag.** The hero absent for 11 minutes (CIA), background with no character in it (Dark Web, 2 minutes
  of market history), credits at the hottest moment, repeated epithets, invented feelings for a real person, a moral
  and a guess as the ending.
- **What we take** is written into `design/script/SCRIPT_V2.md` ("Rules from the second study").
