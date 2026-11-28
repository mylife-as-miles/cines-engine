# YouTube description

Paste the text inside the box into YouTube's description field. The chapter lines are rewritten from the
narration's word times by `python3 tools/make_captions.py` (after any change to the narration); edit their
titles in that tool.

Before posting:

- **Sound effects:** fill in the line from `audio/CREDITS.md` once the Sound agent has written it.
- **Narration credit:** confirm it. The voice is a woman's (its median pitch is about 196 Hz, and the script
  has her say "what she is talking about"), while *Seven Days of No*'s credits call the author's recording
  "his own". If someone else voiced it, name them on the "Narration" line and change "the author's narration"
  in the how-it-was-made line. If it is a synthetic voice, say so there and see "Altered or synthetic content"
  below.

```text
Before your first breath, you are hired: no interview, no contract, no salary, and no resignation letter.
This is your whole life as the firstborn in an African home, from the house rules to the family bank, and what all that pressure really means.

0:00 Born and hired
0:24 Version 1.0
1:14 Promoted at six
2:17 The teenage years
3:16 The first salary
4:18 Management at 30
4:54 The honest part
5:42 One thing you can do
6:05 Call your elder sibling

If you are a firstborn: what is the most responsible thing you have ever been asked to do? Tell me in the comments. And if you are the baby of the family, call your elder sibling today.

How this was made: animated in code, frame by frame, with the author's narration and music generated with Lyria.

A film by Osita Miles
Narration: the author
Music: generated with Lyria 3.5 (Google DeepMind); the audio carries a SynthID watermark.
Sound effects: [TO FILL from audio/CREDITS.md: each effect, its source and its licence]

#firstborn #africanparents #animation
```

## Tags

For YouTube's tags field (under 500 characters; this list is 406):

```text
firstborn, first born child, african firstborn, firstborn son, eldest child, eldest sibling, older sibling, firstborn problems, african parents, nigerian parents, african parents be like, african family, african home, nigerian family, black tax, family responsibility, first salary, family pressure, call your sibling, pov animation, animated explainer, relatable animation, what if you said no to everyone
```

## Upload settings

- **Title and thumbnail:** see `publish/titles.md` (three thumbnails for Test & Compare).
- **Captions:** upload `publish/firstborn.en.srt` as English (the `.vtt` is the same text and timing, for players that want WebVTT). 140 captions, sentence by sentence, with the family's lines in quotation marks.
- **Audience:** not made for kids (money, work and family pressure are adult themes, and "made for kids" turns off comments, which this video asks for).
- **Category:** Film & Animation (Comedy also fits).
- **Language:** English, for the video and the captions.
- **Altered or synthetic content:** no, if the narration is a real person's recording: the picture is clearly animated, and the description says how it was made and that the music is generated. Switch it on only if the voice is a synthetic copy of a real person.
- **Chapters:** YouTube reads them from the description (first at 0:00, each at least 10 s; the shortest, One thing you can do, is 23 s). Each starts on the second before its first word, so no word is cut when a viewer jumps to it.
- **End screen:** 6:41.5 to 6:49.5 is the clean end-screen ground (the video runs 6:49.5); the last caption ends at 6:41.9. Link the series' first video, "What If You Said No to Everyone for 7 Days?", and a subscribe button.
- **Playlist:** add it to the series playlist after *Seven Days of No*.
- **Pinned comment:** `publish/pinned_comment.md`.
