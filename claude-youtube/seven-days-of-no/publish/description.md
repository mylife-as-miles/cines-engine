# YouTube description

Paste the text inside the box into YouTube's description field. The chapter lines are rewritten from the
narration's word times by `python3 tools/make_captions.py` (after any re-cut); edit their titles in that tool.
Fill in the sound-effects line from `audio/CREDITS.md` once the Sound agent has written it.

```text
Your boss, a friend, your mom, a coworker, a stranger. For seven days, you say no to every one of them.
Here's what happens, and the answer that beats both a flat no and a panic yes.

0:00 The question
0:24 Monday: the boss
0:45 Tuesday: a friend
1:06 Wednesday: Mom
1:29 Thursday: lunch
1:48 Friday: a stranger
2:10 Saturday: the real answer
2:28 Sunday
2:39 Why we say yes
2:56 Try this instead
3:18 So, what happens?

What's one thing you said yes to this week that you really wanted to say no to? Tell me in the comments.

How this was made: animated in code, frame by frame, with the author's own narration and music generated with Lyria.

A film by Osita Miles
Music: generated with Lyria 3.5 (Google DeepMind); the audio carries a SynthID watermark.
Sound effects: [TO FILL from audio/CREDITS.md: each effect, its source and its licence]

#peoplepleasing #boundaries #animation
```

## Tags

For YouTube's tags field (under 500 characters):

```text
saying no, how to say no, people pleaser, people pleasing, how to stop people pleasing, setting boundaries, boundaries, saying yes to everything, fear of saying no, guilt, what if you said no to everyone, 7 days of saying no, let me think and get back to you, assertiveness, animated explainer, pov animation, self improvement
```

## Upload settings

- **Captions:** upload `publish/seven_days.en.srt` as English (the `.vtt` is the same text and timing, for players that want WebVTT). Burned-in captions are not part of the picture.
- **Altered or synthetic content:** no. The picture is clearly animated and the voice is the author's own; the description says how it was made and that the music is generated.
- **Chapters:** YouTube reads them from the description (first at 0:00, each at least 10 s; the shortest, Sunday, is 11 s).
- **End screen:** 3:37.5 to 3:45.5 is the clean end-screen ground; the last caption ends at 3:37.9.
- **Pinned comment:** `publish/pinned_comment.md`.
