# My Name Is Oren: generation sequences (Seedance 2.5)

The film's **32 beats** (`BEATS.md`) become **18 generated sequences**: B02–B31, 30 beats in all. B01 (over black) and B32 (the title card) are made in post. Each sequence is one generation and one auteur prompt (`prompts/Qnn.md`). It is cut only at the end of a beat, and its target length totals 6:45 with B01 and B32.

**For every sequence:**
- Generate the target length **plus about 2 s of handles**, capped at 30 s; the slow first and last second are trimmed in the edit.
- Draft at 480p, choose a take, then make the final from that draft.
- Where action runs across a cut, the last frame of one sequence is the start frame of the next.
- The prompt carries the MOVIE COLOR block and the Voice Bible unchanged (`DECISIONS.md`), and the performance comes from `DIRECTION.md`.

## Index

| Seq | Beats | Target | Generate | Starts at | Lines | Images to attach | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Q01 | B02–B04 The street · Helena · The bag | 29 s | 30 s | 0:05 | none | ENV_laundrette, CHAR_city-unit, PROP_sweeper, CHAR_helena, PROP_helena-boots, PROP_handset, PROP_lunch-bag, PROP_oren-slippers | Wordless. The handset screen is a code insert, so generate her hand with the screen off. The window decals go on in post (keep that shot locked-off). |
| Q02 | B05–B06 Excuse me · The seam | 22 s | 24 s | 0:34 | L01–L06 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_laundrette, ENV_across-street, PROP_lunch-bag, PROP_oren-slippers | The first look at Oren; an extreme close-up of the seam. |
| Q03 | B07–B08 Hungry · Apologies | 26 s | 28 s | 0:56 | L07–L12 | CHAR_helena, CHAR_oren, ENV_laundrette, PROP_lunch-bag, PROP_sweeper, PROP_helena-boots, PROP_oren-slippers | The sweeper's "Apologies." |
| Q04 | B09–B10 Mercer Street · The pain | 29 s | 30 s | 1:22 | L13–L20 | CHAR_helena, CHAR_oren, ENV_laundrette, ENV_low-wall, PROP_lunch-bag | Waiting still, 3–4 s. |
| Q05 | B11–B12 The shoulder · Introduction | 17 s | 19 s | 1:51 | L21–L23 | CHAR_helena, CHAR_oren, ENV_low-wall, PROP_lunch-bag | The first touch. |
| Q06 | B13 Somewhere to be | 25 s | 27 s | 2:08 | L24–L28 | CHAR_helena, CHAR_oren, ENV_low-wall, ENV_across-street, PROP_lunch-bag | The bag level with her face. |
| Q07 | B14 Not the recordings | 15 s | 17 s | 2:33 | L29–L31 | CHAR_helena, CHAR_oren, ENV_low-wall, PROP_handset, PROP_lunch-bag | The share menu is a code insert (screen off in generation). |
| Q08 | B15 Second Lieutenant | 21 s | 23 s | 2:48 | L32–L36 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_low-wall, ENV_across-street | **Hero performance.** The light wakes. |
| Q09 | B16–B17 Didn't attend · Sit with me | 24 s | 26 s | 3:09 | L37–L39 | CHAR_helena, CHAR_oren, ENV_low-wall, PROP_lunch-bag, PROP_helena-boots | He sits; the bag goes between his feet. |
| Q10 | B18 Speaking simply | 22 s | 24 s | 3:33 | L40–L46 | CHAR_helena, CHAR_oren, ENV_low-wall | **Hero performance.** The laugh. Check that the swearing gets through. |
| Q11 | B19 No promise | 20 s | 22 s | 3:55 | L47–L50 | CHAR_helena, CHAR_oren, ENV_low-wall, PROP_lunch-bag, PROP_helena-boots | Her boot touching the bag. |
| Q12 | B20–B21 The desk replies · Properly | 23 s | 25 s | 4:15 | L51–L53 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_low-wall, PROP_oren-slippers | The first eye-level two-shot; the scrape and the blue tape. **Suggested pilot.** |
| Q13 | B22–B23 Yes · You haven't stood up | 27 s | 29 s | 4:38 | L54–L60 | CHAR_helena, CHAR_oren, ENV_low-wall, PROP_lunch-bag | He stands; she doesn't. |
| Q14 | B24 The doors | 21 s | 23 s | 5:05 | L61 (50 words) | CHAR_helena, CHAR_oren, ENV_low-wall | **Hero performance, one take.** The lip-sync test for the longest line. |
| Q15 | B25–B26 Walk me in · The call | 17 s | 19 s | 5:26 | L62–L66 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_low-wall, PROP_lunch-bag | The client's voice through his collar speaker. |
| Q16 | B27–B28 Ten past two · The arm | 25 s | 27 s | 5:43 | L67–L72 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_low-wall, PROP_lunch-bag, PROP_helena-boots | "Understood." The arm offered. |
| Q17 | B29–B30 Standing · Slow down | 19 s | 21 s | 6:08 | L73 | CHAR_helena, CHAR_oren, CHAR_oren_detail, ENV_low-wall, ENV_corner, PROP_helena-boots, PROP_oren-slippers, PROP_lunch-bag (+ MOTION_helena-walk) | **The climax:** "Slow down, Oren." The blink. |
| Q18 | B31 The corner | 12 s | 14 s | 6:27 | none | CHAR_helena, CHAR_oren, ENV_corner, PROP_helena-boots, PROP_oren-slippers, PROP_lunch-bag (+ MOTION_helena-walk) | Wordless. The bag swings in time with her; cut to black. |
| | **Total** | **6:34** | | | **73 lines** | | Plus B01 (5 s) and B32 (6 s) in post = **6:45**. |

## Continuity across sequences

- **Time and weather:** overcast early afternoon, 1:31 to about 1:45 pm; the pavement damp, no rain falling.
- **Wardrobe:** as in the approved sheets. Helena's loose sole is on her right boot and her patch on her left elbow. Oren's tape is on his right slipper. His seam and temple light are on his left side.
- **The bag:**

| Beats | Where the bag is |
| --- | --- |
| B04–B13 | his right hand |
| B14–B16 | his left hand ("He moves the bag into his other hand") |
| B17–B22 | between his feet |
| B23–B27 | his right hand again (picked up and stood, then lowered) |
| B28–B31 | his left hand, his right arm offered |

- **Positions:** Helena leans under the window, steps out to stop him, then sits on the low wall from B11. Oren stands from B05 to B16, sits beside her (on frame right) from B17 to B22, then stands. From B29 they walk left to right to the corner.

## Order of generation

1. **Pilot: Q12.** It tests most things at once: both faces, Oren's light, both voices, the wall set, the eye-level two-shot and the blue tape.
2. **The hero performances next, because they're the riskiest:** Q08, Q10, Q14, Q17.
3. **Then the rest in film order**, chaining start and end frames.

The first draft shot list (41 shorter sequences, before the beats and the 7-minute cap) is kept in `archive/SHOTS_draft1.md` for its shot ideas.
