# Claude YouTube: long-form, Shorts, thumbnails

Videos made the Claude Film way (in code, with our own voices, score and mix), shaped for YouTube: the first seconds earn the click's promise, the edit is tighter than a festival cut, text survives a phone screen, and the thumbnail is designed with the video, not after it. Cuts of an existing film stay with the film (`claude-film/autopilot/cuts/`); this studio is for videos made for YouTube first, and the platform rules here apply to both.

Contents: 1 Formats · 2 A YouTube cut of a film · 3 Long-form made for YouTube · 4 Shorts · 5 Captions · 6 Thumbnails · 7 Packaging · 8 Delivery specs

## 1. Formats

| Format | Frame | Length | Notes |
| --- | --- | --- | --- |
| Long-form | 1920×1080 (or 3840×2160), 24/25/30 fps | 8–15 min sweet spot for story; whatever the story needs | Chapters, end screen in the last 5–20 s, captions. |
| Short | 1080×1920, 9:16 | up to 3 min; 20–60 s plays best | Hook in the first second, captions in the middle band, a loop-friendly ending. |
| Clip for X / social | 1920×1080 or 1080×1350 | 45–140 s | Burned-in captions (autoplay is muted), a title in the first frame. |

## 2. A YouTube cut of an existing film (the *Autopilot* method)

The director's cut stays untouched; the YouTube cut is a second edit list beside it.

1. **No title card**: start on the first image that hooks (Autopilot's cut opens on the 6:14 alarm).
2. **Trim wordless shot tails**, not scenes: Autopilot lost about 61 s from the routine, the drive, the office and the heat; breakfast, the mirror and the ending were protected. Never cut during a subtitle or a voiced take, and never cut what plants the twist.
3. Write the spans in `cuts/youtube.json`, each with its reason, so the cut can be re-made after any change to the film.
4. **Cut the picture frame-exactly from the director's cut's render**, then **rebuild the soundtrack on the new clock** (beds run shorter, score cues end on their own fades) instead of chopping the mix (`claude-film/autopilot/tools/youtube_cut.py`, `build_mix.py --cut youtube`). A cut keeps the director's room-tone loop offsets so ambience does not jump.
5. No cold open or added line unless the author asks: the audience should still make the film's discovery at the film's moment.

## 3. Long-form made for YouTube

- Structure: a hook within 15 s (the question or the image the video answers), then the promise kept early, then escalation; chapter breaks where a viewer would want to skip to (at least three chapters of 10 s or more, first at 0:00; build them from the word times so they stay right after a re-cut).
- A shape that works for "how I made X" films (MengTo's making-of films): a 10 s cold open with no voice (four or five real cuts of the result with its own sound), hard numbers and one honest twist by 0:20, a "what you get" list with chapter times, then the steps (25–45 s each, the most surprising step longest), **a "where it falls short" chapter**, the cost, what you would keep, and an end card held about 2.4 s past the last word. About 2.7 spoken words a second.
- A step that shows work: say the step → show the real prompt or code typed while it is said, held at least 1.5 s → show the real result at real size → mark the one thing that matters (a ring, a lit phrase, a wipe, a count) → one line that lands it.
- Making-of footage of a 3D scene: a "dollhouse" orbit split into layout, props arriving, materials, lights coming on (anyscene's breakdown spec), with the bottom band kept free for captions.
- Screen demos of software: capture real browser states and add the cursor, clicks and a calm zoom-follow in a deterministic renderer (MengTo's `codex/browser-video-recording` is a worked example), rather than recording the screen live.
- Retention: change something every 5–10 s (shot, angle, graphic, sound); cut breaths and wordless tails; front-load the best material.
- Narration and on-screen text say different things: text names, numbers and labels; the voice tells. Titles add; captions repeat.
- End: the end screen needs a clean, quiet background for its last 5–20 s; keep important picture and captions out of that area.

## 4. Shorts and vertical versions

- **Re-lay out, never crop**: same timeline and soundtrack, one composition per aspect. In code, re-render each scene with a vertical layout or camera; for footage, the Reframe model or `crop` with a keyed `x`. Never letterbox a 16:9 into a Short.
- Safe zones at 1080×1920: keep text and key action clear of the top 270 px, right 120, bottom 420 (672 for long captions or paid posts) and left 64 — the platform's title, buttons and caption cover them. Centre the visual mass around y ≈ 885 and do not leave the bottom 40 % empty.
- The hook is felt by 1 s: the first frame is already a composed picture with the topic in large type (it is also the cover, so keep it inside a 3:4 crop for grid views); the first line of voice states the stakes. Change the framing every 2–4 s.
- End on a frame that works as a poster and loops back into the opening; no outro, no fade to black.
- Type: statements 110–140 px at 1080 wide; captions in a heavy sans at about 150 px, at most three words a line, the spoken word in the accent colour, a dark outline, on a seam or under the picture and never over a face; interface text at least 32 px. Burn captions into every feed version (most play muted).
- Structures for 15–60 s: promo (hook, twist, proof, demo, benefit, offer, call to action), showcase, before/after, explainer.

## 5. Captions

- Burn captions into the picture when the film's look includes them (Autopilot: Libre Franklin, bottom centre, soft dark halo, no box) and upload an `.srt` as well for search and accessibility.
- Name the speaker first, as film subtitles do — "Emily: …", "Radio: …", the narrator by name ("Daniel: …") — so a viewer always knows who is speaking. The author asked for this; it is the default here.
- Style by speaker type: scene dialogue bold white (a child's lines in her own colour), narration lighter, a radio or phone voice smaller and italic.
- Timing: a caption holds for its take or its words, never less than about 1.2 s; at most two rows.

## 6. Thumbnails

- Draw thumbnails in HTML from the film's own frames (`claude-film/autopilot/src/THUMB_youtube2.html` draws three variants), 1280×720 JPG under 2 MB, readable at 160 px wide.
- One idea: a face or a single object with emotion, and 2–4 words. Keep text out of the bottom-right corner (the timestamp covers it) and usually out of the bottom; the author preferred the line at the top ("NOBODY ANSWERED." over the mirror).
- Make three variants for YouTube's Test & Compare and let the platform pick; keep all of them in `thumbs/` with a note of which won.
- The thumbnail and the title work as a pair: the title should not repeat the thumbnail's words.
- Offer more than frame grabs: for *Long Distance* the author rejected *Autopilot*-style frame grabs and chose illustrated posters in *One Too Many*'s idiom (`claude-film/long-distance/src/THUMB_youtube2.html`).

## 7. Packaging

- Title under 60 characters, the hook first. Description: two lines that work above the fold, then chapters, credits (voices, music, sound licences), and the AI disclosure where relevant.
- YouTube's altered or synthetic content setting: switch it on for realistic generated footage or voices of real people (not needed for clearly animated work, but say how it was made in the description).
- Post copy for X and others: write it with the clip, one strong line plus the link; keep the user's name and project details out of anything sent to outside services unless they asked.

## 8. Delivery specs

H.264 High, yuv420p, CRF 16–18 (or a high bitrate: 12–16 Mb/s at 1080p24), AAC 320 k 48 kHz, `+faststart`; −14 LUFS integrated, −1 dBTP. Check: frame count and duration against the edit list, a contact sheet across the whole cut, every caption on a phone-sized preview, and the first 3 seconds with the sound off. Files over the chat's 400 MiB limit need a lower bitrate for sending (keep the master separately).
