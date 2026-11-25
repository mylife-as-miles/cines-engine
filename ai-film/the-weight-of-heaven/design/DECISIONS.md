# The Weight of Heaven: decisions

Settled with the author. Started 2026-11-25. Sources: the screenplay, third draft, and the Visual Bible, version 1, both 24 November 2026 (`design/source/`). The bible tags each choice SCRIPT (in the draft), CONCEPT (in the original concept) or PROPOSED (a suggestion for the author to approve); the tag is kept below. Nothing marked PROPOSED or OPEN is final until the author says so.

## Settled

| Decision | Choice |
| --- | --- |
| Studio | AI Film. The picture is generated; sound, text, grade and finish are made in house. |
| Credit | Written by Osita Miles; "a film by Osita Miles". |
| Script of record | Third draft, 24 November 2026. Its own notes (p. 13) list what changed from the second draft. |
| The rule of the look | Light above, heavy below. Two worlds with opposite weight shot in two opposite ways (bible p. 2). |
| The look in one paragraph | Used verbatim in every brief: "White marble in cloud, lit softly from every side: columns too thin to stand, petals falling too slowly, gloved hands. Below, grey daylight comes in low under a dark mass that fills the top of the frame: black basalt, bent backs, buttressed stone, bare hands. Wide frames, small figures, long holds. A gold collar, a red wax seal, one green valley, an amber dusk under the cloud, blue last light. Fine grain. No glow, no lens flare, and no gun ever fires." |
| Kept out of the film | Glow, beams or shimmer for weight · gunfire (ports open and arms rise, nothing fires) · low heroic angles on Serath · open sky over the plain before 11.1 · handheld except as the valley runs (2.8) · a teal-and-orange grade. |
| Grounds | Marble #E9E6DE · Cloud #AEB4B8 · Slate #4B5258 · Rock dust #8A857B · Basalt #141517 |
| Lights | Cloud light #F4F1EA (scenes 1, 3, 4) · Under-light #7F8A90 (2, 5, 6) · Dusk amber #D98A3D (8 to 10 only) · Last light #3F556C (11) |
| Accents, each belonging to one thing | Gold #C8A45A: the collar and the cup (SCRIPT) · Seal red #9E2A22: her wax seal, at the wedding then on the hall floor, never again (SCRIPT) · Vale green #5D7A4A: Sarn Vale, the only living colour on the ground (SCRIPT) · Lamp amber #E0A050: Karst's lamp and the hearths (PROPOSED) · Signal white #FFFFFF: the signal lamps (PROPOSED) |
| Light by scene | As the bible's table (p. 11): high key with no hard shadow above; low contrast, a stop under, light from the side below; the hall low key, about two stops under; silhouettes basalt-dark, never pure black. |
| The motifs | Water (2.4, 3.2, 4.1, 11.4: the same top-down insert four times) · the seal (1.8, 7.6, 7.8) · the collar (1.6, 6.2, 9.16, 11.6) · bell and anchor (1.1, 1.10, 9.4, 10.1) · hands (1.8, 7.10, 9.10, 9.12, 11.12: one close shot at the same size in frame) · lamps and arms · the bowl · the shard. Each return is shot the same way as the first. |
| Geography | One section and one plan (bible p. 18). The Weir a mile long; the flagship a mile up; its anchor on a mile of chain (SCRIPT). The kingdom about twelve miles across, two miles up at noon and lower by dusk (PROPOSED). |
| Words on screen | No readable English on any prop. The only words are the three supers and the main title, set in the finish, small capitals widely spaced, marble on black. No text from the models. |
| Model audio | A guide only. Voices, the hum (in the ground from 2.1, gone at 10.23), the bell, the anchor's iron note, score and effects are made and mixed in house. |
| Sources in the repo | The screenplay and the bible are kept in `design/source/` as the production's reference. |
| Branch | This session works on `ccr-0244e8fe-7z8rbw` (the environment's required branch) rather than a branch named after the slug; it merges to `main` only when the author signs the film off. |

## Proposed in the bible, awaiting the author's yes

| Decision | Proposal |
| --- | --- |
| Frame | 2.39:1; the plain, the fleet and the Weir are horizontals, height comes from tilting. The models render 21:9 (2.33:1) at most: generate 21:9, compose for the matte, matte to 1920×804 in the finish. |
| Camera above | A slow drift on every shot in Orison and aboard the fleet, slightly high, looking along. |
| Camera below | Locked off and low, at the eye level of a bent back; when it moves it tracks level and never rises. |
| Camera at the landing | Level for both peoples: no drift, no low angle (11.11 to 11.14). |
| Lenses | 24 to 35 mm for the columns, the underside and the fleet; 50 mm for the hall; 100 mm and up through the sighting glass (9.5 to 9.7). Deep focus for every scale shot; shallow only for the water inserts, the seal (1.8) and the hand on the shard (7.10). |
| Holds | Seven shots run longer than feels comfortable: 5.2, 7.15, 9.10, 10.1, 10.2, 11.4, 11.14. |
| Fall speeds | Above: about a quarter of normal speed. On the bearing-lands: about a third faster. After the landing: one weight for everyone. |
| Shapes | Orison: the vertical, taken past what stone can do; nothing braced. The ground: the horizontal and the buttress; everything mended. The fleet: a nave on its side, spire for a mast, lancet gunports, a keel like an upturned roof. The Weir: fused stone with no joint or wear; the wheel and lock-pin oak and iron, added by people. |
| Wardrobe | Everyone above wears white (the script gives only Serath's uniform and the white guests). |
| The third script | Large worn curves, never translated. |

## Open: the author decides

| Question | Notes |
| --- | --- |
| Which cut | 14:05 (about 140 shots) or the twelve-minute cut (twelve small shots out, among them 2.5 and 11.3). Or a proof-of-concept sequence first. |
| The medium | The bible's lens and grain rules assume photographed images; the colour keys are flat drawings. Photoreal generated picture, or a painted / illustrated finish that follows the keys? |
| The timed shot list | The bible numbers about 140 shots and cites "the timed shot list". `SHOTS.md` is built from that list if the author shares it; otherwise drafted here from the script and the bible. |
| Model and service | The handbook's route is the Higgsfield connector, which is not connected in this session; fal.ai (Seedance, Kling and others) is. Which service, which model, and the budget. One model for the whole film. |
| Faces | The character-sheet template starts from a reference image of each character. None exist yet. Generate original faces (no real person's likeness) for the author to choose, or use reference images the author supplies. |
| Camera package words | The template's YELLOW package (Alexa XT, 1.5× anamorphic, Cooke Panchro) does not fit this bible: no flare, no bloom, deep focus. Proposed instead: large-format digital rendering, spherical primes, clean highlight roll-off, no flare, fine even grain added in the finish. |
| Voices | Voice DNA for each speaking character (Hierophant, Engineer, Serath, Chancellor, Karst, Marl, Flag Captain, the ten thousand). Lip-sync on camera, or staging that keeps mouths small and far. |

## Film bible for the templates

The author's environment and prop templates carry *YELLOW*'s locks. For this film, keep their structure and swap in these blocks.

- **Colour identity**: the grounds, lights and accents above, by hex, with the accent rule (each accent belongs to one thing and appears nowhere else). Cool and muted; whites hold their detail; the only warm sky is the dusk of scenes 8 to 10. Never teal-and-orange, never neon, never glossy.
- **Lighting design**: above, cloud light from every side, no cast shadows, a face is never the brightest thing; below, grey day low under a dark roof, from the side, never from above; the hall, what Karst lets in or carries. No glow, beams or shimmer anywhere.
- **Camera / optical language**: 2.39:1 composition (generated 21:9); float above, plant below, meet at the landing; the lenses, focus and holds above; no flare, no bloom; signal lamps clip cleanly to white. Camera package words: pending the open question above.
