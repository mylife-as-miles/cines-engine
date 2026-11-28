# What If You Said No to Everyone for 7 Days?: decisions

Settled with the author. Started 2026-11-28.

| Decision | Choice |
| --- | --- |
| Format | Long-form YouTube, 1920×1080, 24 fps, about 3:38 (the voice-over's length after the slate is cut). A POV explainer: "you" are the hero, the narrator speaks to you. |
| Voice | The author's recording `audio/vo/voice_2.mp3` (222.6 s, 24 kHz mono) is the narration and the clock. Word times in `audio/vo/voice_2_words.json` (Whisper small.en). |
| Voice edit | A slate read into the take is cut: "Take six. Day five, Friday. The stranger. Clips five and six." (108.5–113.5 s); "Friday. A tourist asks…" stays. Nothing else is cut: the closing joke ("I said no to food…") stays as written. |
| Look | The author's references (`design/refs/`, 12 stills and a 45 s reference animatic): flat cartoon, thick even black outlines, flat fills with one soft shadow tone, a warm orange/peach palette with teal accents, big round heads, dot-and-curve faces. The hero: bald round head, teal zip hoodie with white drawstrings, white trousers, teal trainers. Cast: Boss (grey hair, white shirt, tie, clipboard), Friend (red tee, black cap), Mum (bun, glasses, orange cardigan, brown skirt), Coworker (curly hair, green shirt, lanyard), Stranger (bucket hat, purple jacket, phone). Sets: office (desk, monitor, wall clock at 5, window, plant, corkboard), living room (sofa, lamp, window at sunset, door, plant), street (brick buildings, tree, lamp post). |
| Build | In code, the Claude Film way (Canvas 2D, deterministic, every frame reproducible): the characters as a rig with the reference's expressions (neutral, happy, surprised, confused, tired, angry, sad, scared) and poses (standing, walking, thinking, pointing, sitting, holding), the sets as drawn layers. The reference stills are style targets; nothing generated goes into the picture. |
| Sound | A light, cozy music bed under the voice (the reference animatic's register) and simple effects (phone buzz, notifications, door, footsteps, camera shutter). |
