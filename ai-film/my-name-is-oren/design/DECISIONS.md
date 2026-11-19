# My Name Is Oren: decisions

Settled with the author, Osita Miles. Started 2026-11-19. Only the first table is settled. The second holds proposals waiting for the author; each moves up when the author answers, with the reason.

## Settled

| Decision | Choice |
| --- | --- |
| Studio | AI Film: the picture is made with video generation models. The author called it "an AI film". |
| Script | The screenplay as written, *My Name Is Oren* by Osita Miles (8 pages, uploaded 2026-11-19), filed as `design/screenplay.pdf`. It is the source of truth for every line of dialogue. |
| Credit | "A film by Osita Miles" (the house default). |
| Cinematography | **Naturalistic, with Denis Villeneuve's eye** (chosen by the author, 2026-11-19). Helena is filmed in the social-realist grammar of Andrea Arnold, Clio Barnard and Lynne Ramsay: handheld, close, eye level, natural light, body details. The city and Oren are filmed in Villeneuve's: locked-off and symmetrical, slow push-ins, small figures with empty space around them, soft overcast light, one accent colour in a muted world (*Prisoners*, *Arrival*, *Blade Runner 2049*). The two grammars meet when she looks at him properly (B21). The author chose this over a broader "epic" set proposed the same day (*Children of Men*, *Moonlight*, *After Yang*, *Hunger*, Ozu, *In the Mood for Love*, *Under the Skin*). Details in `TREATMENT.md`; the influence lines in the film bible below go into every prompt. |

## Open: proposals waiting for the author

| Decision | Proposal | Why |
| --- | --- | --- |
| Look | **A. Overcast** (`TREATMENT.md`), to be chosen from style frames of A, B and C drawn as the same three moments. | It is the plainest light for a film about dignity, and it lets hi-vis yellow read as the voice of the polite machines. |
| Camera idea | Feet first. Pavement level until faces are earned; the first eye-level two-shot comes on "She looks at him. Properly, this time." Helena handheld, Oren locked-off. The camera stays on the street side, and the walk runs left to right. | The script's own images are shoes; the camera can follow Helena's attention. |
| Frame | 2.35:1, generated at 21:9 and matted, delivered at 1920×1080 with bars, 24 fps. | The author's templates are built for 2.35:1, and the scope frame suits two people on a long wall. |
| Length | The full script, about 7½ to 8½ minutes. A timed table read locks it before any video is generated. | The script is already tight, and every beat pays off later. |
| Faces | Cast Helena and Oren from text with an image model: three or four candidate portraits each, the author picks one, and the character sheet is made from that pick (`character-sheet.md` needs a reference image). If the author has photos of actors who have consented, use those instead. | No real person's likeness without consent. |
| Dialogue | The video model speaks the lines, using each character's Voice DNA below (the auteur template's way). Any line the model mangles or refuses (likely: "fucked", "fuckers") is voiced separately and lip-synced. | The performance and the lip-sync come from one generation. |
| Model and platform | **Ask the author** (not Higgsfield). Claude writes the reference prompts, auteur prompts and shot list; the author runs the generations. The prompts are fitted to the chosen model's clip length and reference slots. | The author generates the picture; the prompts must fit the tool they use. |
| Setting | An unnamed English city, near future: a terraced side street with a laundrette, a low brick wall beside it, and the corner at the end of the block toward Mercer Street. | British usage throughout the script ("pavement", "laundrette", "bloody", "benefits"). |
| Oren's tells | The seam and the temple light are on his **left** side (the side the camera sees when he faces Helena). The light is a soft warm white like a pilot light, never blue or red. The scrape on his chin is scuffed skin, not blood. The blue tape is on his left slipper. | One set of continuity rules for every shot; warm white keeps him from looking like a sci-fi device. |
| City units | Never seen above the chest: hi-vis, gloved hands and grey regulation shoes. | It keeps them anonymous, keeps the feet-first idea, and saves a character sheet. |
| On-screen text | Nothing readable comes from the model. The laundrette decals and the peeled sign are added in the finish over a locked-off window shot. The two handset screens (the boot sketch, the share menu) are built in code and placed on a plate of her hand. The end super is made in code. | Models misspell. |
| Music | None under dialogue. One small cue starts on the last blink and carries the corner into the title. | Restraint; the choice should land in near-silence. |
| End card | Black, "MY NAME IS OREN" (as scripted), then "A film by Osita Miles". | As in *Autopilot*. |
| Disclosure | The end credits say "Made with AI video generation", plus YouTube's synthetic-content disclosure on upload. | The house honesty rule for realistic generated footage. |

## Film bible (draft: final once the look is chosen)

**Look string (A).** Overcast English afternoon, soft flat daylight, muted slate and wet-concrete greys, faded red brick, hi-vis yellow the only saturated colour, warm fluorescent spill from the laundrette, fine 35 mm grain, gentle halation, naturalistic, never glossy, never teal-and-orange.

**Camera package.** ARRI Alexa XT · 2.35:1 · restrained 1.5× anamorphic · Cooke Speed Panchro-inspired rendering: gentle softness, moderate microcontrast, organic falloff, restrained oval bokeh, smooth highlight roll-off. Soft, low-contrast, motivated light: the overcast sky as the primary source, and the laundrette window's warm spill as the secondary.

**Influences, each with its purpose (settled; copied unchanged into the MOVIE COLOR section of every auteur prompt).** Grammar, never imitation: no shot, frame or character is copied, and no frame from these films is used as a reference.
- Denis Villeneuve, *Prisoners* (Roger Deakins): an ordinary grey street made monumental; soft overcast light; precise, symmetrical compositions in everyday places.
- Denis Villeneuve, *Arrival* (Bradford Young): muted, soft, overcast intimacy; faces close in diffuse grey light; contact with a non-human played quietly.
- Denis Villeneuve, *Blade Runner 2049* (Roger Deakins): a synthetic person filmed with dignity and stillness; small figures against large flat planes; negative space.
- Andrea Arnold, *Fish Tank* (Robbie Ryan): handheld closeness at eye level that breathes with Helena.
- Clio Barnard, *The Selfish Giant* (Mike Eley): tenderness without sentiment in northern English light, on real streets.
- Lynne Ramsay, *Ratcatcher* (Alwin Küchler): the story told in body details: feet, hands, fabric.

**Character identity (draft, until the sheets are approved).**
- *Helena Duncan.* 30s, lean from not eating, an athletic frame gone tired. Hair pulled back in a short practical ponytail with strands loose; no make-up. She wears an old olive army-surplus field jacket (no insignia) over a grey hoodie, dark worn cargo trousers, and scuffed combat boots with the rubber coming loose from the left sole. She keeps a hand flat on the small of her back. Her old handset has a cracked corner.
- *Oren.* A care android who passes at a glance for a man in his forties: average height, a slightly soft build, a plain kind face with skin a little too even, short neat dark hair, clean-shaven. A fine seam runs from just below his left ear down the side of his neck. A small light sits under the skin of his left temple, and there is a scrape along his chin. He wears a navy zip fleece over a pale shirt, grey trousers, and big ugly grey felt slippers with wide Velcro straps, the left one mended with blue tape. He carries a brown paper lunch bag with the top rolled, grease showing through one corner.

**Voice DNA (draft: immutable once the author approves).**
- *Helena.* English with northern working-class vowels flattened by army years, early thirties, low-mid pitch with a dry rasp from tiredness. Quick and clipped, she deflects with humour. Her breath catches mid-phrase when the back pain bites, and she laughs through her nose before she can stop it. Never theatrical, never tearful on cue: emotion leaks out as speed and swallowed endings.
- *Oren.* Neutral southern English, an adult man of no fixed age, mid-low pitch, warm but even and unhurried, with precise consonants and every sentence finished. No breaths between phrases, no filler sounds, questions rising only slightly. Never robotic, never a vocoder, no metallic processing. The only tell is that he never hurries and never trails off.
- *The client (V.O.).* An elderly English woman, in her eighties, thin and impatient but not unkind, heard through a small speaker at Oren's collar.
- *Sweeper.* A small, bright, courteous synthetic voice, identical every time: "Apologies."
