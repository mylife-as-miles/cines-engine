# My Name Is Oren: direction (performance and intention, per beat)

This document **fills** the author's auteur video prompt; it never changes it. Its lines go into three existing fields: **PERFORMANCE ARC**, and in SHOT-BY-SHOT the **[ACT]** and **[DIALOGUE] / V.O.** delivery notes. The beats are those of `BEATS.md`. Dialogue is always the screenplay's, cited by line id (`script.json`).

The ideas are adapted, in our own words, from repositories the author pointed to, used as inspiration only (see Sources at the end): facial action coding (FACS) for performance, a performance-direction skill's restraint scale, the FACS skill's pre/during/post-line beats, and Cinekive's tag vocabulary for shots. Checked against the repos' own files on 2026-11-21; the corrections are marked.

## Rules for writing performance

1. **Behaviour, never labels.** Write what the muscles, breath, hands and eyes do, not "sad" or "angry". Plain anatomy comes first; a FACS code in brackets is optional shorthand that Seedance tends to read but does not guarantee (for example "a lip press (AU24)").
2. **Three or four expressions at most per generation, and one or two tells per beat.** Accuracy drops when expressions are stacked.
3. **Every line has three beats.** Before the first word (an inhale, a swallow, a glance), during it (which word carries the stress, and through what), and after it (about half a second held, then a release).
4. **Restraint scale (out of 10).** At 2 the surface is normal; at 4 the trigger shows in breath or eyes; at 6 she is actively hiding it; at 8 the body gives her away. This film lives between 2 and 7: Helena never goes above 7, and Oren never shows above 2. The strongest moment is the one held back.
5. **Never perfect sync.** When several people react, they stagger by 0.3–0.5 s each; a listener's reaction can begin before the line ends ("thought before word"). *(Corrected: this is not a fixed delay after the cause.)*
6. **No tears.** The script never calls for them. At most the eyes are wet and catch the light, and they never spill. "She wipes her nose on her sleeve" is as far as it goes.
7. **Name the gaze target.** Write "her eyes drop to the slippers" or "his eyes stay on hers", never "she looks away thoughtfully" or eyes to the ceiling.
8. **Listeners are alive.** The one who is not speaking still blinks, breathes and tracks the speaker. Oren's stillness is designed, not dead (see below).
9. **Pace lives in the voice and the beat, not in timestamps.** "Timestamps allocate time; they do not enforce cadence" (video_skills, `higgsfield-seedance-2-5`): Q03 t3 kept every start time and still spoke each sentence fast, filling the rest with gaps. So: write the pace into the voice ("unhurried, one breath per sentence, leaning on one word in each"); name each line's stressed word; give every pause something to happen in it ("pauses are events, not holes"); give only start times, not lengths; keep each generation's dialogue short (about 16–20 English words per 15 s for reliable lip-sync, from the same repos' field notes), and split a generation when its dialogue needs room. Never use "fast" or "quick". A recorded voice at about 80% of natural pace drives lip-sync directly, but the film's voices come from text (the author's choice). *(Replaces "give every line its length in seconds", which Q03 t3 disproved.)*
11. **Write what you want, never what to avoid.** Seedance reads every token as a positive instruction, so "eyes closed" in an avoid list invites closed eyes. Say "eyes open, lids level, on his eyes".
10. **The anti-template test.** Before a prompt goes out, read its performance lines and ask whether they could have come from a template, or whether they read like notes from a director who watched the actor rehearse. If they read templated, rewrite them.

## Helena: physical vocabulary

- **At rest:** brows faintly drawn together (AU4); heavy, tired lids (AU41 slight). When she is holding something back, her lips press (AU24).
- **Pain (constant, rising):** a hand flat on the small of her back; the eyes tighten (AU7) with the brow (AU4); a short inhale through the teeth; her weight shifts off one leg.
- **Deflection:** a quick one-sided smile that is withdrawn at once (AU12, one side only); the eyes go to the bag and come back (the script's own move).
- **Pride:** the chin lifts slightly; the gaze goes to the street rather than to him.
- **The laugh (B18):** lips pressed (AU24), then a breath escapes through her nose, she fights it, and it comes again. A real smile breaks through, reaching the eyes (AU6 + AU12). She folds forward, and the pain cuts in (AU4 + AU7) inside the laugh, so she laughs at that too.
- **Being seen (B15):** her head comes up, and she is completely still for about half a second. The eyes widen slightly, then turn wet and catch the light, never spilling. One effortful swallow, and her voice comes out thicker.
- **The doors (B24):** her speech speeds up, her breath catches, and one swallow takes effort. A single tremor in the jaw is re-clenched at once. "Bloody doors" comes out as a broken half-laugh. She wipes her nose on her sleeve.
- **Under pressure:** she gets quicker and jokier, and every joke costs more. Her eyes go to the street or the pavement, never to the ground at her own feet.
- **Must not:** cry, plead, raise her voice, or lean on him before B11 (the shoulder) and B29 (the arm).

## Oren: physical vocabulary

- **At rest:** a symmetrical, relaxed face. He never smiles with his eyes (no AU6 at any point in the film).
- **Blinks:** slow and regular, slightly *too* regular, about every four seconds. It's the quiet tell.
- **Breath:** none visible; his chest is still.
- **Movement:** smooth, and every movement finishes completely. The head turns first, then the body. He never fidgets.
- **Listening:** his eyes stay on hers. When she speaks about pain, his head tilts about five degrees toward her (his care training).
- **"Waiting still" (B09) versus switched off:** in both he is completely still, but when he is waiting his eyes keep tracking her and the blinks continue. Switched off would mean the eyes unfocused and the blinking stopped. We only ever show waiting.
- **The temple light** is his only expression. When it wakes, nothing else on him moves.
- **The choice (B30):** the light blinks once, his face does not change, and his stride shortens. The decision shows only in his feet.
- **Under pressure:** nothing on his face changes. Only the light wakes, and his eyes go to the bag (B25).
- **Must not:** smile, laugh, frown, fidget, breathe visibly, or touch her unless she reaches for him first.

## Dialogue, lip-sync and silence

- **The lines are fixed.** No line is reworded, trimmed or sped up to fit a shot. If a line doesn't fit, change the coverage instead: split it across shots, or let part of it play over the listener, the hands or the feet.
- **Mouth visibility, per line.** Six lines must be on the speaker's face: L04 and L22 ("My name is Oren."), L33 (her rank), L36 ("Helena will do."), L42 ("…fucked you.") and **L73 ("Slow down, Oren.")**. Long informational lines can play partly over the listener, the bag or the feet: L13, L25, L47, L51 and L55. Everything else should be on the face where possible.
- **Hands never cross the mouth during a line.** Her hand goes to her back or her face *between* lines: rubbing her face in B23 comes before L61, and wiping her nose in B35 comes after it.
- **No overlaps in a generation.** Her laugh (B18) ends before Oren's next line. Any overlap is built in the edit.
- **Mid-register delivery.** Whispering and shouting both break lip-sync, and neither belongs in this film anyway.
- **Silence before an impact line.** Hold 0.5–1 s of street room tone, never dead silence, before L33, L42 and L73, and after "Didn't attend." (L38).
- **The longest line.** L61, the doors, runs to 50 words. The script's own "(beat)" is the split point: B33 ends on "supposed to", and B34 carries the rest in one take. If Seedance's lip-sync slips over that length, let a few words play over her hands on her sleeve and keep the one-take feel.
- **The third thing is the bag.** The screenplay already routes Helena's hunger through it ("Her eyes go to the bag. Come back."). Whenever she can't say something, her eyes can find the bag.
- **Event off-screen, reaction on-screen.** The client, the clinic and the doors are only heard or spoken of; the camera stays on the faces that react.

## Interaction verbs (vary them; a repeated verb is a dead beat)

Each beat's inner action, as one verb and the reason behind it, for the [ACT] field:

- **I–II:** she *watches* (the bag, because she's hungry) → *stops* him → *labels* him (the fake ones) → he *corrects* (with his name) → she *apologises* → she *confides* (hungry) → she *takes it back* (doesn't matter) → he *sets the line* (the person I support) → he *protects* (the slipper) → he *informs* → she *snaps* → she *apologises*.
- **III–IV:** he *asks* (pain) → she *jokes* → he *offers* → she *leans* → she *teases* (the introduction) → she *pushes him away* (don't let me keep you) → he *offers* again → she *withholds* (not the recordings) → he *names* her (rank) → she *corrects* (Helena) → she *accuses* (the system) → she *invites* (sit) → he *says it simply* → she *laughs*.
- **V–VII:** he *refuses to promise* → she *approves* (no congratulations) → he *reports* (the desk) → she *sees* him → she *accepts* → he *asks* again → she *deflects* → she *confesses* (the doors) → she *asks* (walk me in) → she *releases* him (go) → he *bargains* (ten past) → he *submits* (understood) → he *offers* his arm → she *sets terms* (till the corner) → she *holds on* → she *asks*, by his name → he *chooses*.

## Distances

The script's blocking, measured so prompts can state metres instead of "closer":
- **B05–B10:** about 1 m apart on the pavement.
- **B11:** close enough for her hand to reach his shoulder.
- **B13–B16:** he stands about 0.8 m from her knees, the bag level with her face.
- **B17:** seated side by side, about 0.3 m apart, so close that she has to move her boot.
- **B29–B31:** her hand on his forearm, walking hip to hip.

## Per beat

H and O are Helena's and Oren's levels on the restraint scale. **Tells** go into [ACT], and **Delivery** into [DIALOGUE]. **Intention** gives Cinekive-style tags for the shot plan and for searching a personal reference archive.

### I. The polite street

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B02 The street that works | – | The machines are perfectly even and identical; nothing hurries. | — | establishing · wide · symmetry · centered · locked-off · overcast · desaturated · order · detached |
| B03 Helena | 2 / – | Hand flat on her lower back; a slow blink; her thumb hovers over the unfinished laces; a short breath out through the nose as the corner snags. | — | ground-level · insert · isolation · negative-space · lonely · social-realism |
| B04 The bag | 3 / – | One visible swallow; her eyes drop to the slippers and hold for about a second; a wince (AU7) as she pushes off the wall. | — | pov · telephoto · compression · shallow-depth · rack-focus · tense |

### II. The name

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B05 Excuse me | 3 / 2 | H: catches up stiffly, a hand going to her back. O: stops completely; head turns first, then body; eyes on hers. | L01 lighter than her face; L02 even and polite, no smile. | tracking · handheld · two-shot · tense |
| B06 The seam | 4 / 2 | H: freezes for 0.3 s, lips parted; eyes to the seam, then to his eyes; before L05 her eyes go to the pavement and straight back, lips pressed (AU24), eyes open. O: still; his gaze moves between her eyes; one slow blink before L04 and one inside L06. | L03: a sharp breath in; "Oh." low on the out-breath; leans on "fake". L04: four separate words, leaning on OR-. L05: unhurried, a breath at each full stop; "Recognising you as an individual" spaced as if quoting a leaflet, "and stuff" thrown away lower; leans on "mean", and "offence" lands whole, because he picks it up. L06: a beat first; a light stress on "not"; "I can't be." at the same level and tempo, leaning on "can't". *(Rewritten 2026-11-21: the old notes asked for speed and used labels.)* | close-up · extreme-close-up · insert · macro · uncanny · tense |
| B07 Hungry | 5 / 2 | H: the honesty slips out; her eyes go to the bag and come back; her jaw sets on L10. O: head tilts 5°; eyes to the bag, back to her. | L07 quieter on "really". L08 a genuine question. L09 trails off at "can't even —". L10 clipped. L11 gentle and factual. | close-up · handheld · intimate · tense |
| B08 Apologies | 3 / 2 | H: a weary glance down at the machine; then her brows lift slightly at his slipper (surprise, AU1 + AU2, small). O: no hesitation; plants the slipper; looks at the sweeper, not at her. | L12 bright, identical both times. | ground-level · wide-angle · locked-off · comic · confrontation |
| B09 Mercer Street | 4 / 1 | O: **waiting still** for 3–4 s, eyes tracking her, blinks continuing. H: after L14, the inner brows rise (AU1): remorse. | L13 exact ("one thirty-one"). L14 sharp. L15 softened, an apology. | medium-close · locked-off · centered · symmetry · detached |

### III. Sitting down

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B10 The pain | 5 / 2 | H: hand against the wall, weight off one leg, a pain tell (AU4 + AU7), a short inhale through the teeth. O: eyes to her hand on the wall, back to her face. | L17 a dry half-smile. L19 a tired, almost fond "Yeah". L20 asked, not offered. | close-up · handheld · intimate · tense |
| B11 The shoulder | 5 / 1 | H: jaw clenched as she lowers herself, breath held; her hand stays a beat; she looks at her palm (warm through his shirt), brows lifting slightly. O: completely still, takes her weight, eyes follow her down. | — | detail · insert · gesture · intimate |
| B12 Introduction | 3 / 1 | H: a small one-sided smile; a breath-laugh on L23. O: L22 delivered **exactly** as L04. | Identical repetition is the joke. | close-up · comic · intimate |
| B13 Somewhere to be | 5 / 2 | H: turns her head from the bag (the smell), swallows; her chin lifts on L26; her eyes go to the street on L28. O: still, explaining plainly. | L25 even, the time exact. L26 proud. L28 a little defiant. | low-angle · two-shot · power · tense |

### IV. Second Lieutenant

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B14 Not the recordings | 4 / 1 | H: her thumb hovers, then decides. O: eyes on her hands, then her face. | L30 tired. L31 quiet and firm, eyes on him: a boundary. | insert · overhead · intimate |
| B15 Second Lieutenant | **7** / 1 | O: the light wakes and **nothing else moves**. H: head comes up; still for 0.5 s; eyes widen slightly, then wet and catching the light, never spilling; one effortful swallow. | L33 her full rank, evenly. L34 voice thicker. L36 "Helena will do." after a breath out: a small decision. | close-up · push-in · intimate · epiphany |
| B16 Didn't attend | 6 / 2 | H: every word clear; jaw set between phrases (AU17 + AU24); nostrils flare on "didn't attend". No tears. O: tiny head tilt toward her; no expression. | L38 accusing, not pleading. The final "Didn't attend." flatter and quieter. | close-up · handheld · melancholic |
| B17 Sit with me | 4 / 2 | H: shifts along the wall, a pain tell; eyes up at him; pats the coping. O: sits carefully and sets the bag down precisely between his feet. | L39 softer than anything before. | two-shot · eye-level · locked-off · intimate · reconciliation |
| B18 Speaking simply | 6 / 1 | H: **the laugh** (see her vocabulary). O: no smile; after L46 his head inclines one degree. | L40 earnest. L42 total calm. L43 laughing through it. L44 a genuine question. L46 no smile. | medium · handheld · comic · intimate |

### V. Look at it, not decide it

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B19 No promise | 5 / 1 | H: a flicker of hope, suppressed (AU1, then AU24); a bitter one-sided smile on L50, at the system, not at him. O: answers at once. | L48 guarded. L49 a plain "No." L50 dry. | close-up · tense · hopeful |
| B20 The desk replies | 4 / 1 | H: her eyes go to the light at his temple; on "Not decide it." a small breath out through the nose. O: the light wakes, then goes out. | L51 plain, with the repetition flat. | profile · close-up · hopeful |
| B21 Properly | 4 / 1 | H: her gaze travels from the chin scrape down to the blue tape and back to his eyes; her mouth relaxes; the **first real warm look** (AU6 + AU12, small). | L52 warmth inside the jab. L53 even. | two-shot · eye-level · symmetry · intimate · epiphany |
| B22 Yes | 5 / 1 | H: a swallow; eyes drop; then the decision. L56 is said to the ground: she is not sure. | L54 smaller voice, a breath at the beat. L55 exact. | close-up · hopeful |

### VI. The doors

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B23 You haven't stood up | 6 / 1 | H: doesn't move; jaw set; then both hands rub over her face, hiding it. O: waits; lowers the bag; asks nothing. | L58 sharp. L60 deflecting. | two-shot · high-angle · tense |
| B24 The doors | **7** / 1 | H: **the doors** (see her vocabulary), in one take. O: completely still, eyes on her. | L61 speeds up, then breaks on "bloody doors". | close-up · long-take · push-in · melancholic · confession |
| B25 Walk me in | 6 / 2 | H: eyes up to him (asking is hard); on L63 she looks away, giving him an out. O: **glances at the bag**: the conflict shows only in that glance. | L62 a small voice. L63 almost thrown away. | close-up · intimate · hopeful |

### VII. Two o'clock

| Beat | H / O | Tells | Delivery | Intention |
| --- | --- | --- | --- | --- |
| B26 The call | 4 / 2 | O: the light wakes; still. H: a quick, generous smile that doesn't reach her eyes (AU12 without AU6), covering disappointment. | L64 plain. L65 querulous, through the small speaker. L66 quick. | profile · close-up · tense |
| B27 Ten past two | 5 / 2 | O: half a second's pause before "Understood." H: both feet on the pavement: the decision is in her body. | L67 exact. L68 impatient. L69 the same calm as always. | ground-level · tense |
| B28 The arm | 5 / 1 | H: stares at the offered arm and holds it for about a second; pride. O: arm offered and held perfectly still. | L70 brisk. L71 setting terms. L72 simple. | two-shot · gesture · intimate |
| B29 Standing | **7** / 1 | H: effort: jaw clenched, breath held, a hiss through her teeth; fingers bunched in his sleeve, then loosened onto his forearm; she tries again. O: does not move at all. | — | detail · gesture · handheld |
| B30 Slow down | 5 / 2 | H: tugs his sleeve. O: the light blinks once; his face does not change; **his stride shortens**. | L73 plain and a little breathless, not pleading: the first time she says his name. | follow · steadicam · ground-level · profile · epiphany |
| B31 The corner | 3 / 1 | H: her face eases a little (relief, not a smile); she keeps hold. O: walks at her pace; the bag swings in time with her. | — | wide · locked-off · one-point-perspective · negative-space · journey · slow-motion |

## Camera words for [CAM] (one term per dimension, always in this order)

The auteur template's [CAM] field asks for shot size, lens in mm, height, angle, and the move with its speed and end point. To keep forty generations speaking one language, write it in this order, with one term from each list and no competing synonyms. Where a benchmark defines a term, ours follows it: CineTechBench's close-up "typically shows the head and shoulders", medium close-up is "from the chest up", a dolly in moves the camera toward the subject while a zoom changes the focal length "without moving the camera physically"; CineScale separates angle (neutral, high, low) from camera level (eye, shoulder, hip, knee, ground). "Locked-off", "push-in" and "handheld" are our working words, not benchmark classes. *(Corrected 2026-11-21.)*

1. **Size:** extreme close-up · close-up (head and shoulders) · medium close-up (chest up) · medium (waist up) · medium wide (knees up) · wide (head to toe) · extreme wide.
2. **Framing:** single · two-shot · over the shoulder · insert · profile · back shot.
3. **Camera level** (height relative to the subject): ground · knee · hip · shoulder · eye. **Angle:** level (CineScale: neutral) · high angle · low angle. Never Dutch.
4. **Lens:** 32–35 mm wide · 40–50 mm standard · 65–85 mm medium (mild compression) · 100 mm macro for inserts only. Never fisheye.
5. **Movement:** locked-off ("no pan, no tilt, no zoom") · slow push-in ("the camera travels forward; no zoom") · handheld (Helena only) · follow at her pace (B30–B31). A push-in is never a zoom: Villeneuve's creep is the camera moving. ShotBench (which scores models reading film, not video generators) found movement weak for several models; Q03 t2 turned a push-in into an over-the-shoulder shot. State it plainly ("the camera moves forward on a dolly, the focal length unchanged") and check it by eye.
6. **Light:** overcast daylight, soft, low contrast; the laundrette window as a warm practical. Nothing else.
7. **Composition:** Oren **symmetrical, centred**; Helena **off-centre, short side** (facing the near edge of frame, with empty space behind her). In two-shots they share the centre only from B21 on.

Example [CAM] for B15: *close-up, single on Helena, eye level, 85 mm, handheld with a slow push-in that ends on her eyes, overcast soft light, off-centre short side.*

## Camera height arc (feet first, in CineScale's terms)

| Beats | Camera level | Why |
| --- | --- | --- |
| B01–B04 | ground and knee | We meet the city, Helena and Oren by their feet. |
| B05–B13 | hip and shoulder; Oren seen from her seated height (low angle) | Faces are earned; he stands over her. |
| B14–B20 | shoulder; her eye level once he sits (B17) | They are at the same height. |
| **B21** | **eye level, a still two-shot** | "She looks at him. Properly, this time." The first time. |
| B22–B29 | eye level and shoulder | The conversation, the doors, standing up. |
| B30–B31 | ground (slippers and boots in step), then a wide at eye level | Back to the feet; the bag swings in time with her. |

## Using Cinekive (on the author's own computer)

Cinekive is a local, private archive for stills and footage: "Drop a film, a stills folder, or a URL. Cinekive finds the heroes, tags the craft, and lets you pull the frame you meant — by look, director, technique, or mood." It cuts scenes (PySceneDetect), embeds frames (SigLIP) and tags each still with a local vision model through Ollama, then searches by text and filters by tag (shot type, movement, angle, lighting, composition, lens, grade, emotion, technique). It ships **no** stills; the author ingests films they own. Native on Windows and macOS, Docker on Linux; MIT; Pro is a one-off $19 (moodboards, agent API, MCP, cloud vision). It can't run in the cloud container (no library, and Hugging Face is blocked) and it can't make video. *(Corrected 2026-11-21: it searches by look and tag, not "by intention".)*

Its tags are slugs in `taxonomy.py`. Where our per-beat tags differ, search with its slug: locked-off → `static`, medium-close → `medium-close-up`, shallow-depth → `shallow-dof`, rack-focus → `focal-shift`, compression → `telephoto`, comic → `playful`, detached → `cold`, follow → `tracking`; establishing, long-take, order, confrontation, confession, reconciliation and journey have no slug, so search them as free text. For Q03: `close-up` + `overcast` + `centered` for Oren; `extreme-close-up` + `profile` + `macro` for the seam; `close-up` + `handheld` + `off-center` for Helena. Q03's own takes can be ingested into a separate project as a second opinion on shot sizes.

**One firm rule:** those frames are for the author's eyes only, for planning. They are **never** attached to a Seedance generation. The prompts carry the look in words (MOVIE COLOR), and the only images attached are our own references.

## Sources (inspiration only; nothing copied)

- FACS vocabulary and dialogue beats: taohuahuangxiaoxie/video_skills, `higgsfield-facs` skill (no licence file found, so ideas only). FACS itself is Ekman & Friesen's standard system.
- Restraint scale, "hold back rather than release", "the best crying is before the tear": snowfrost/skill-movie, `performance-scene-director` (no licence file found, so ideas only).
- Intention tag vocabulary: Gianluca-Improta/cinekive (MIT).
- Dialogue and performance method, ideas only: badgids/Story-Film-Skills (Apache-2.0; character pressure and must-not signatures, mouth visibility, "never reword a line, change the coverage"); wuwangzhang1216/DirectorSKILL (MIT; behaviour not emotion, one beat one turn, reactions as their own beat, silence rules, lip-sync limits); jtydhr88/screenwriting-skills (MIT; dialogue as action, Chekhov's "the deepest pain in the fewest words", Ozu's "event off-screen, reaction on-screen"); katha-ai/MovieGraphs (interaction verbs with reasons; no licence file); declare-lab/MELD (GPL-3.0; emotion and sentiment as separate axes, emotion shifts).
- Camera vocabulary (terms only, no data used): Vchitect/ShotBench (no licence file), PRIS-CV/CineTechBench (data CC BY-NC-ND 4.0), CineScale (research-use agreement), movienet/movienet-tools (Apache-2.0).
