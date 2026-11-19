<!--
The author's AUTEUR VIDEO PROMPT: the prompt for one generated sequence (one generation, several shots), in this order.
Rules the author set:
- Production-specific, continuity-heavy, cinematic. Never generic prompt prose: every line names this film's people,
  places, objects, light and sound.
- References in plain syntax only: @Image 1, @Image 2, @Video 1 (no markdown links). Number them in the order the
  files are passed to the model's references, and list what each one is under the title.
- Mode, exact duration, exact shot count and 2.35:1 on one line. (Models render 21:9 at most: generate 21:9 and matte
  to 2.35:1 in the finish; say 2.35:1 here so composition protects the matte.)
- Wardrobe overrides are explicit: if the character wears something other than in their sheet, say exactly what, and
  that it replaces the sheet's outfit for this sequence.
- Voice DNA is immutable: once written for a character, copy it unchanged into every prompt where they speak.
Save one file per sequence as prompts/<SEQ>.md, with every take's job id, settings, cost and verdict beneath it.
-->
# AUTEUR VIDEO PROMPT

## [SEQUENCE / PART / SCENE TITLE]

References: @Image 1 — [character sheet: NAME] · @Image 2 — [environment: LOCATION] · @Image 3 — [prop: OBJECT] · @Video 1 — [motion or previous-clip reference, if any]

[Mode] · [exact duration, e.g. 12 s] · [exact shot count, e.g. 3 shots] · 2.35:1

---

## SCENE INTENT

[What this sequence does in the story, in two or three sentences: who wants what, what changes, what the audience must understand or feel by the last frame. Concrete, not thematic slogans.]

---

## GLOBAL LOCKS

**Character identity** — [NAME] exactly as @Image 1: [age, build, face, hair, skin — the identifiers that must not drift].
**Wardrobe override** — [none: wardrobe exactly as @Image 1] / [For this sequence [NAME] wears [exact garments, colours, condition], replacing the outfit in @Image 1. Nothing else changes.]

**Location / environment continuity** — [LOCATION] exactly as @Image 2: [door, window, anchor furniture, practical lights, the side of the room the camera stays on, time of day and weather outside].

**Props and temporal state** — [OBJECT] exactly as @Image 3, [its state now: e.g. phone face-down on the counter, screen dark, 7 % battery shown only when lit] · [what changed since the previous sequence: e.g. mug now half empty, coat on the chair, rain stopped].

---

## MOVIE COLOR

[The film's palette as felt in this sequence, e.g. YELLOW: muted yellow, softened lime, warm cream, desaturated olive, restrained amber, warm-neutral blacks — felt, never neon, never teal-and-orange.]

**Influences, each with its purpose** — [film / director: what exactly to borrow, e.g. "Lynne Ramsay, *We Need to Talk About Kevin*: colour carrying dread in ordinary rooms"; "Andrea Arnold: handheld closeness at eye level, never showy"]. Influence is grammar, never imitation of shots, characters or frames.

**Camera package** — [e.g. ARRI Alexa XT · 2.35:1 · restrained 1.5× anamorphic · Cooke Speed Panchro-inspired rendering: gentle softness, moderate microcontrast, organic falloff, restrained oval bokeh, smooth highlight roll-off]. Soft, low-contrast, motivated light: [primary source] / [secondary source].

---

## VOICE DNA (immutable)

[NAME]: [accent and region, age in the voice, pitch, pace, breath, texture, how emotion leaks — e.g. "Received Pronunciation softened by Leeds vowels, late thirties, low and unhurried, swallows the ends of sentences when upset, never theatrical"].
[Repeat for every speaking character; copy unchanged from the film bible.]

---

## AUDIO DESIGN

[The sound world of the sequence: room tone, exterior bed, diegetic sources and their direction, what is silent on purpose, where music is absent or present, dynamic shape across the shots.]

---

## FIRST-FRAME ANCHOR

[Only when needed: the exact first frame — framing, subject position, pose, eyeline, light — matching @Image N or the last frame of the previous clip, so the cut joins.]

---

## SHOT-BY-SHOT BREAKDOWN

### SHOT 1
**[TIME]** 0.0–[x.x] s
**[CAM]** [shot size, lens in mm, height, angle, move with speed and end point — e.g. "medium-wide, 40 mm, eye height, locked-off; a slow 15 cm push in over the last 2 s"]
**[BLOCK]** [where each person and object is in the room, entrances and exits, distances, eyelines, relative to @Image 2's geography]
**[ACT]** [the physical action beat by beat and the inner action behind it — specific, small, true]
**[DIALOGUE] / V.O.** [NAME]: "[exact words]" — [delivery note within the Voice DNA] / (no dialogue)
**[SFX]** [each sound with its source, timing and distance]
**[STATE OUT]** [exactly how everything is at the end of the shot: positions, prop states, expression, light — the next shot starts from here]

### SHOT 2
**[TIME]** [x.x]–[y.y] s
**[CAM]** …
**[BLOCK]** …
**[ACT]** …
**[DIALOGUE] / V.O.** …
**[SFX]** …
**[STATE OUT]** …

### SHOT [N]
…

---

## PERFORMANCE ARC

[NAME]: [where they start → the turn → where they end, in behaviour the camera can see].
[Repeat per character.]

---

## THEMATIC / SYMBOLIC / STRUCTURAL LOGIC

[Only where relevant: the motif, rhyme or structural echo this sequence carries (e.g. the phone's position mirrors sequence 2) — stated plainly, played invisibly.]

---

## PHYSICS LOCKS

[Gravity, weight and material behaviour that must hold: liquids, fabric, hair, glass, doors on hinges, rain direction, breath in cold air, contact and shadows, hands holding objects with real grip; no morphing, no objects passing through each other.]

---

## AUDIO LOCKS

[Lip-sync to the exact words only; no added lines, no music unless stated, no sound effects that have no visible source; room acoustics consistent with @Image 2; voice per Voice DNA.]

---

## CONTINUITY LOCKS

**[POSITIVE]**
- [what must stay identical: faces, wardrobe, prop states, furniture positions, light direction and colour, time of day, screen direction, eyelines]

**[NEGATIVE]**
- [what must not appear: identity drift, wardrobe changes, extra people, text, captions, logos, watermarks, signage, warped hands, duplicated objects, jump in light, camera crossing the line, glossy commercial look]

---

## GENERATION PRIORITY ORDER

1. [e.g. Character identity and wardrobe]
2. [Location geography and continuity]
3. [Performance truth and blocking]
4. [Camera language]
5. [Colour and light]
6. [Audio and lip-sync]

---

## FINAL STATE

[The exact emotional feeling the generation must leave behind, in one or two sentences — what the audience carries into the next cut.]
