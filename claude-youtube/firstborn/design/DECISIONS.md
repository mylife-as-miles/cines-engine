# Firstborn in an African Home: decisions

Settled with the author. Started 2026-11-28.

| Decision | Choice |
| --- | --- |
| Format | Long-form YouTube, 1920×1080, 24 fps, about 6:50 (the 401.5 s narration and an 8 s end screen). A POV explainer: "you" are the firstborn, the narrator (a woman, off screen) speaks to you. |
| Voice | The author's recording `audio/vo/voice.mp3`, used whole, is the narration and the clock. Word times in `audio/vo/words.json` (Whisper small.en; window-seam duplicates dropped by `tools/vo_edit.py`). |
| Look | The look of "What If You Said No to Everyone for 7 Days?" (`claude-youtube/seven-days-of-no`, its kits copied here: `kit/pov.js`, `kit/sets.js`): flat cartoon, thick even outlines, warm orange palette. The author's references for it are in `design/refs_seven_days/`. |
| The hero | The author: "Use the hero from the other video exactly as it was": the bald round-headed hero in the teal zip hoodie, white trousers and teal trainers is "you", the firstborn, throughout. His younger ages (newborn, six, teenager) are the same design made smaller, not a redesign. |
| Cast | A new African family in the same style: Mum, Dad, a younger sister and a younger brother (each at the ages the story needs), an auntie, two uncles, two cousins, and the neighbour's child (Mrs. Okafor's son). Brown skin tones of the reference's range, everyday Nigerian-flavoured dress (a headwrap for occasions, a wrapper, a kaftan), warm and dignified, never caricatured. |
| Build | In code, the Claude Film way, on the "What If You Said No" engine (`film/`, copied): every shot anchored to a spoken word. |
| Sound | A warm, playful music bed with Afro-pop colour (light percussion, guitar, kalimba or marimba), gentler in the sincere last third; effects reused from "What If You Said No" plus new ones the story needs. |
