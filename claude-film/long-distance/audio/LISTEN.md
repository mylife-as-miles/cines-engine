# Listen: what a human must judge by ear

Claude cannot hear. earshot and the meters say what they can (`audio/reports/earshot_listen.json`, `earshot_idea.json`, `out/audio/qa-report.json`); these are the moments they cannot settle. Listen on headphones and on a laptop's speakers, on `out/long_distance_mixed_720p.mp4`. Times are the film's clock (cut 4, 517.5 s); each line names the knob that changes it.

## The idea

1. **Phone against real (the whole film).** Is the phone's voice the same woman but too close and too clean, and the real woman unmistakably *in the room*? earshot cannot hear room on a voice: it calls her real lines "very close and dry" as often as the phone's (95-99%), and even a very wet test only moved it to 24% "in a room". The room was set by reason, not by that model: the flat at RT 0.5 s, her voice 5 dB wet with a 7.5 kHz roll-off, his 8 dB wet. Too little, and the idea is lost; too much, and it becomes an effect. Knobs: `voices.door.wet_db`, `voices.room.wet_db`, `rooms.flat.rt` in `audio/sound_map.json`. Compare 0:06 ("Tell me about your day.", the phone) with 6:05 ("Maybe it's not my place...", her).
2. **The phone's evenness.** Every phone line is levelled to exactly the same loudness, compressed a little and given a little air. Does that read as "too clean" or just as louder? Knob: `voices.phone`.

## Moments

3. **Q01, 0:14-0:22: the murmur and the laugh.** Can any word of his murmur be made out? (Whisper finds none; it is low-passed at 420 Hz.) Is it too loud for "under"? Does her laugh read as a laugh, not a sigh or a gasp? earshot prefers "a woman sighing" for every one of nine TTS laughs; the chosen take (t6, "Ha ha ha.") is the best of them (15% laugh, z +5.2). Does it land "exactly where a laugh should", 0.16 s after his punchline? Knobs: `beds.murmur.offset` / `lufs`; `cues.laugh_phone.gain_db`; `--pick laugh_phone=N` in `tools/vocal_fx.py`.
4. **The phone's taps (Q02 1:01-1:06, Q04 1:45-1:48, Q07 typing).** The typing, the scrolls and the glass taps are tiny and quiet by design. qa.py's audibility test fails most of them, because the rooms under them are near silent and both tools floor a band at -60 dB. Are they heard at all on headphones? On a laptop? If they should be more present, give `type` / `tap` / `scroll` a `peak_db` in the sound map.
5. **Q03 1:20: the desk buzz.** Synthesised (the motor's tone, a clean sub "rattle"), not recorded. Does it read as a phone buzzing on a desk?
6. **Q04 1:57-2:04: the heartbeat** at -48 LUFS, "barely". Is it there, and is it too much?
7. **Q08 4:09: the three knocks.** Peaks -13 to -14 dBFS (about 14 LU under the voices), the first loud real sound in the film. Strong enough to turn the film, or too loud for a film this quiet? Knob: `cues.knock[].peak_db`.
8. **Q08: the door, her steps, the door closing behind her.** Levelled by mix.py in their main band (weight hero). Does the door opening to her read?
9. **Q09 5:08: the hangers.** No generated take matched "hangers"; the one used reads as a hollow wooden clack ("a small object dropping on a table"). Does it belong to the wardrobe, or should it be silent (`"hangers": null`)?
10. **Q09 5:19: the buzz through the wall.** The phone's tone low-passed at 450 Hz, dry. Does it read as through the wall?
11. **Q10 6:53-6:59: the room going quiet, then dropping out** as the screen goes dark: about 1.4 s of nothing, the room returning 6 dB under. Is the silence felt, or does it sound like a dropout in the file? Knob: `cues.breath_held.world` / `cues.phone_dim.world`.
12. **Ducking.** The room is ducked 9 dB under every line (opus-sound-layer's mixer). With the room 25-30 LU under the voices this should be inaudible, but listen for the room "breathing" between lines in Q10's long scene. Knob: `duck_db`.
13. **Q11 7:51-7:52: "Are you there?" / "Yes."** The "Yes." comes 0.12 s after his line, dry and close (earshot: >99% "very close"), about 4 LU louder than his small, hoarse question (earshot hears him as whispering). Is the jump right?
14. **Q11 after "I love you too." (7:56):** the world is ducked to room tone. The sequence still places a couch creak (31.8 s) and a settling breath (35.4 s) after the line; both are soft. Keep them, or should nothing follow the line but the room?
15. **The black and the title (8:23-8:37)** are digital silence. Right, or should a whisper of room tone carry the cut to black?
