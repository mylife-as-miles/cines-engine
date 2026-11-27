# The Forest on the Wall: decisions

Settled with the author. Started 2026-11-27.

| Decision | Choice |
| --- | --- |
| What it is | A wordless Christmas film of about 48 s for CapCut's 4K for Seedance 2.5 challenge, which the author makes in CapCut Video Studio with Seedance 2.5. Deadline Monday 30 November 2026, 11:59 PM PST. The script and shot list live in the author's Claude doc "The Forest on the Wall: script and shot list"; on 27 November the author accepted all 21 fixes from a review (vertical 9:16, the room's geography, hard shadows, the loop frame, the simplified lamp move, the shadow forest's locks). |
| Branch | This production's work sits on the session branch `ccr-b7fe0462-ldjyjo`, the only branch this session may push to, rather than a branch named after the slug. |
| Reference stills on fal | The author (27 November): "Can you generate them using my fal credit?" The same models as The Weight of Heaven, one candidate each: the reindeer on Nano Banana Pro ($0.15), the room on Seedream 5.5 ($0.0405), the girl cast first on Nano Banana 2.1 (about $0.059), then her sheet from the approved casting (about $0.063). Prices are fal's listed prices as recorded on 25 November. **Package shown; nothing generated; waiting for the author's go.** |
| How the references are lit | The prop sheet and the girl's casting and sheet: neutral grey and even light, as the templates ask; they are identity references and never open a shot. The room and every frame that opens a shot: lit like the film (dark, one warm lamp, hard shadows), because a take copies the light of its first frame and of its room reference. |
| Reference sizes | Sheets 16:9 at 2K. The room 16:9 at 2848x1600, so one image holds the window, the wall, the doorway and the tree; it is never a frame of the film. Frames that open shots (the loop frame first) are made at 9:16. |
| Where the fal key is | On the author's "cines-engine" cloud environment (a network secret for queue.fal.run). This session runs on "Stickman-Animation", which has no fal key and does not allow fal's hosts, and cannot move onto "cines-engine". |
| Who generates the references | The author (27 November): "I'll generate it myself. Just give me the prompt for them." The prompts as sent are in `prompts/sent/` (the reindeer, the room, the girl's casting, and her sheet, the template verbatim, made from the approved casting); short versions for tools with a prompt limit went in the chat. No fal spend from here. |
