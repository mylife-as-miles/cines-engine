# Autopilot: decisions

Settled with the author, Osita Miles.

| Decision | Choice |
| --- | --- |
| Ending | The film cuts to black on "Autopilot disengaged." After about 2.5 s of black and silence, an end card fades in: "AUTOPILOT" and "A film by Osita Miles", in the opening title's type. It holds, then fades to black. (The author first chose no end card, then asked for one.) |
| Daniel's V.O. | Voiced with Gemini text-to-speech (`gemini-3.8-flash-tts`, `tools/vo_tts.py`) in `en-gb-training-10` (Winchester), chosen by the author from an audition of four British voices aged 37 or 38. The 13 lines, with their per-line directions, are in `audio/vo/` (`script_vo.json`). |
| Radio presenter | `en-gb-podcaster-3` (a Winchester radio host), with both lines cut off mid-sentence as in the script; `audio/radio/`. Heard through a small-speaker filter in the mix. |
| Scene dialogue | On-screen type (Daniel, Emily, Priya, Sarah), as in *One Too Many*. |
| Emily | Her lines stay on screen as type: a synthetic four-year-old's voice is more likely to sound wrong than moving. |
| Restraint | Emily is never shown in the car after the mirror moment, and the inside of the car is never shown at the end ("We do not see inside."). |
| Look | **C, Through Glass** (`look_c.md`), chosen from the three candidates on `frames/BOARD_looks.jpg`. |
| Frame | Full 16:9 (1920x1080): no letterbox bars, and every set runs to the frame's edges. |
| On-screen text | No title, slate or scene headings on screen. Time is read off glass in the world (the phone, the dashboard clock, the laptop). |
| Subtitles | In the picture, as in Look B: Libre Franklin, bottom centre, soft dark halo, no box. Scene dialogue bold and white (Emily's in her yellow); Daniel's V.O. lighter, in bone; the radio presenter in a smaller italic. |
| Title | One small title on black at the very start ("AUTOPILOT", "A film by Osita Miles"), before the alarm, and the end card after the last black. Nothing else on screen but the subtitles and the world's own words. |
| Build | The film is built in code on the *One Too Many* engine (`film/FILM.md`), shot by shot from `design/SEQUENCES.md`. |
