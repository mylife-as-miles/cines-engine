# Autopilot: decisions

Settled with the author, Osita Miles.

| Decision | Choice |
| --- | --- |
| Ending | The film ends on "Autopilot disengaged." and cuts to black. No end card. |
| Daniel's V.O. | Voiced with Gemini text-to-speech (`gemini-3.8-flash-tts`, `tools/vo_tts.py`) in `en-gb-training-10` (Winchester), chosen by the author from an audition of four British voices aged 37 or 38. The 13 lines, with their per-line directions, are in `audio/vo/` (`script_vo.json`). |
| Radio presenter | `en-gb-podcaster-3` (a Winchester radio host), with both lines cut off mid-sentence as in the script; `audio/radio/`. Heard through a small-speaker filter in the mix. |
| Scene dialogue | On-screen type (Daniel, Emily, Priya, Sarah), as in *One Too Many*. |
| Emily | Her lines stay on screen as type: a synthetic four-year-old's voice is more likely to sound wrong than moving. |
| Restraint | Emily is never shown in the car after the mirror moment, and the inside of the car is never shown at the end ("We do not see inside."). |
| Look | To be chosen from the three candidates in `LOOKS_BRIEF.md`. |
