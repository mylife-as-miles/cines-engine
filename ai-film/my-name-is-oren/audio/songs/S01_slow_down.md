# "Slow Down" (S01): the film's song

**The author's request (2026-11-25):** "I want song like Cigarettes After Sex playing."

**What it is:** an original song in that kind of sound: slow dream pop at about 70 BPM, a clean electric guitar in long reverb, a breathy close vocal, a warm bass, brushed drums only from the chorus, and a faint organ. The melody and lyrics are original. The prompt names no artist, describes only musical traits, and borrows no words.

**The lyrics** are written from Helena's story (`design/HELENA.md`):
- the street where nobody sees her;
- the warm bag she didn't ask for;
- her boots and the half a page of drawing "I never got done";
- him waiting "still";
- the names they give each other;
- "Round the corner / Don't let go".

The hook is her last line, "Slow down, Oren."

```
[Intro]
(slow reverb guitar, no voice)

[Verse 1]
Grey on the window, rain on the street
Everyone passing, nobody sees
You held the paper, warm in your hand
I didn't ask you, you understand

[Chorus]
Slow down, slow down
Stay at my side
Tell me your name
And I'll tell you mine

[Verse 2]
Boots on the pavement, laces undone
Half of a drawing I never got done
You waited still like you had all day
I nearly told you to go away

[Chorus]
Slow down, slow down
Stay at my side
Tell me your name
And I'll tell you mine

[Bridge]
Round the corner
Don't let go

[Outro]
Slow down
Slow down
(guitar rings out)
```

**Made with** Lyria 3 Pro (`lyria-3-pro-preview`) through `tools/lyria.py`: two takes (`audio/score/S01a.*`, `S01b.*`), each about 2:32.
- Both sing the lyrics as written, checked on the Demucs voice stem with faster-whisper. The mixed song defeats the transcriber.
- Take a is in A♭ major; take b in D major, which sits next to the end cue's A major and holds the E minor "Didn't attend." pedal.
- **Take b is in the film.**

**How the film uses it** (`audio/sound_plan.json`, v10):
- The vocal song plays only where nobody speaks: the opening, from the fade-in to before "Excuse me." The voice enters on the sketch of her boots.
- Under dialogue, the song's own instrumental stem plays (`audio/stems/S01b.rest.wav`, Demucs): its guitar on her hand, its "Slow down" chorus harmony after her rank, and its second verse after the laugh.
- Every line stays at least 15.7 dB above it.
- Still to decide with the author: the ending. The full vocal chorus after "Slow down, Oren." at the corner and over the title, instead of or after M01c.
