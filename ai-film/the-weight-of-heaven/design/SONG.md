# The Weight of Heaven: the song

An original song with lyrics drives the four montages, the way Arcane's songs drive its montages (author, 25 November). There is one song, recorded once in full and then cut into the film in parts. Its words are proposed here for the author's approval; nothing is generated until they are approved.

## The idea

**Two voices: the ground sings, and heaven answers.**
- **The lead** is one low, raw woman's voice: the people below, who carry.
- **The choir** is the congregation of Orison, ten thousand in white.

The choir's only words are the hymn from the cathedral, "What heaven has raised, let no hand bring down." The song turns it inside out. At the end, both voices sing together the words Karst gives Serath in the hall: "We would have you come down."

The song never says what the picture already shows. It sings what the picture cannot: eight hundred years of carrying.

## Style brief (for the music model, and for any musician)

> Cinematic alternative-rock anthem with orchestral and choral weight. 84 BPM, D minor, 4/4, heavy half-time feel. Deep, slightly distorted bass; big, dry, slow drums; low strings and low brass; a large mixed choir singing like a congregation. Lead vocal: a low, raw, intimate female alto that opens up to full power in the chorus, unpolished, no autotune. Builds in steps and stops dead. Grand, grieving, heavy. No EDM drops, no rap, no electronic glitches, no guitar solos. Sounds like weight.

The brief names no artist and no existing song. The music must be its own.

## Structure, timed to the cut (84 BPM: one bar = 2.86 s)

| Section | Bars | Sung by | In the film |
| --- | --- | --- | --- |
| Intro | 2 | Choir | Block A, 0:00. The bell's stroke over black, then the congregation's response becomes the song's first sound |
| Verse 1 | 8 | Lead | A: the wedding and Anvil Vale intercut |
| Pre-chorus | 3, then 1 bar of nothing | Lead | A: the barge lets go; the line breaks off on "a mountain —" and the mountain falls in silence |
| Verse 2 | 8, plus a 2-bar tag | Lead | Block C, 1:30 to 2:00. Below; the song cuts out hard on Karst's line |
| Bridge | 8 | Lead, with the choir answering | Block E, 3:35. Gunports, lamps, the road, the wheel; the vocals drop out under every spoken line |
| Chorus | 8, stopping on the last word | Choir and lead | E: the fleet in its pride; Serath raises her hand and the song stops dead on "let no hand —", into "…Guns, Admiral?" |
| Final chorus | 8 | Choir and lead together, slower | Blocks F and G, from about 5:00. The anchors rain and the city comes down |
| Outro | 8, cut | Choir and lead | G: cut mid-word on the landing, with the hum |
| Reprise | 2 to 4 | Lead alone, unaccompanied | Block H, the end title. One line, unresolved |

The full recording runs about three minutes. About 2:40 of it is used in the film.

## Lyrics (proposal)

**[Intro: choir, as in the cathedral]**
What heaven has raised,
let no hand bring down.

**[Verse 1: lead, low, close]**
Petals hang up there like they forgot the ground,
down here the water's shaking in the bowl.
You pressed your stars in wax and didn't look;
we felt it in our backs before the toll.

**[Pre-chorus: lead, rising]**
Every bell you lift into the light,
somewhere a mountain —

*(silence)*

**[Verse 2: lead, heavy]**
We built it wide, we built it low,
we learned to walk the way you lean;
eight hundred years we held the shade
of gardens we have never seen.

**[Bridge: lead calls, choir answers]**
Open the doors — *(open the doors)*
light every lamp — *(light every lamp)*
count every road, count every bed,
raise up your hand —

**[Chorus: choir and lead, full]**
Let no hand bring down
what heaven raised so high,
a thousand ships, a thousand guns,
all waiting on one sign —
let no hand —

*(dead stop)*

**[Final chorus: both, slower, heavier]**
Then let it come down,
a hand's breadth at a time;
lay down the gold, lay down the guns,
let every anchor sound.

**[Outro: both]**
Come down, come down,
we would have you come down.
Come down, come down —

*(cut, on the landing)*

**[Reprise: one voice, alone]**
What heaven has raised…

## Rules for the song in the cut

- **Dialogue always wins.** Under a spoken line the lead vocal drops out and the band ducks. The bridge is written sparse so the lines in block E have room.
- **The holds stay holds.** The song stops for the bell, the mountain, "Anchors", the first anchor's mile, the silent guns and the landing (see `CUT_PLAN.md` §2).
- **The picture is recut to the song.** The song is made first and the montages are cut to its bars. The shot list's montage timings come from this structure.

## How it gets made (to confirm before spending)

- **Models on fal that sing full songs from lyrics:**
  - Mureka 9.5 ($0.15 a song with lyrics);
  - MiniMax Music 3 (full songs up to five minutes; price to be checked);
  - ElevenLabs Music ($0.60 a minute).
- **Demos:** one demo of the full song on two or three of these, from the same lyrics and brief. The author picks the voice and sound.
- **The chosen song:** split into stems (vocals, choir, drums, bass, strings) so the cut can drop the lead under dialogue and end sections exactly on the picture.
- **Rights:** use only a model whose terms allow commercial use of the output; record it in `audio/CREDITS.md`.

## 27 November: the stand-in was the wrong kind of thing; the demo package

After the author's "after the council scene this will be a music montage ... like how arcane do and song like arcane", I tried to stand the song in with the free local music model (Stable Audio 3.0 Small Music, instrumental only). The first take came back as plain guitar rock and I started three "heavier" variants. The author stopped it: "No is this arcan style of music!?" and "Why are you doing the opposite of wgat I ask you it's not even like dune". They are right. An Arcane montage runs on a real sung song with a voice up front; the weight under this film's song is Dune's (giant low drums, low brass, a wordless cry, a deep drone), not a rock band. None of the local takes is used, and the montage is not cut until there is a song (see "The picture is recut to the song" above).

One voice sample was also made with Gemini's speech model (the verse spoken by a low woman's voice, 994 audio tokens, about a cent; the exact price is not known here), on my reading of the author's "Suprise me". It read its own direction aloud for twenty seconds, and it is not used.

**The demo package, shown to the author for a Go (nothing is sent before it):**

- Model: Mureka 9.5 Song Generation on fal, endpoint `mureka/v9.5/generate/song`. Price read on fal's own listing on 27 November: **$0.15 a song when lyrics are supplied**, one song per request. Its inputs (fal's public schema): `lyrics` (up to 5,000 characters), `prompt` (with lyrics, a style control of up to 1,024 characters), `gender` (female or male), `duration` (120 to 300 s). It returns the audio and, when available, the lyric sections with their times.
- Request: `lyrics` = `prompts/song/SONG_demo1_lyrics.txt`, `prompt` = `prompts/song/SONG_demo1_style.txt`, `gender` = female, `duration` = 180. One take.
- The style text is this file's brief, changed in three ways: it is called a sung, modern, dark pop anthem made for a montage rather than alternative rock; it asks for Dune's weight by description (tribal drums, low brass, a throat-like drone, a wordless woman's wail); and it forbids electric guitar. It names no artist, film or song.
- The lyrics are this file's proposal with the stage directions taken out (the stops are made in the cut) and one addition: a two-bar tag after verse 2, "(Hold it up) we held it up", a crowd's chant that Karst's "We stopped carrying it." then answers.
- Not known until it is heard: whether the model keeps 84 BPM and D minor, how the choir and the chant come out, and whether the lead is low and raw enough. If the voice or sound is wrong, the next demo changes the style text only.
