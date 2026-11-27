# LOOK B: GRAIN AND GLOSS

**Pitch.** Everything real is cut paper; only the phone and what it makes are smooth.

Style frames: `frames/B1_pillow.jpg`, `frames/B2_waterfall.jpg`, `frames/B3_between.jpg`. Sources: `src/B1_pillow.html`, `src/B2_waterfall.html`, `src/B3_between.html`. Helpers: `kit/look_b.js` (`GG`), which sits on `kit/otm.js` and does not use `kit/figures.js`. Full 16:9 at 1920x1080, with no letterbox and no slate (following the author's last call on *Autopilot*). Subtitles sit in the picture. Canvas 2D and deterministic. Each frame renders in 6–9 s.

## The grammar

- **Grain is what is real.** Every real thing is a piece of cut paper:
  - It has a hand-cut edge (`OTM.S().path(rough)`) and its own sheet of paper texture laid into it at its own phase, so neighbouring pieces never share a fibre.
  - A soft shadow lifts each piece off the layer below.
  - Light falls in two or three posterised bands whose edges wobble like scissors.
  - The kit's film grain and fibre go over all of it.
  - People are sculpted rather than drawn. Each head and hand is a small signed-distance sculpture (`GG.head`, `GG.hand`), lit in cut bands, given the same paper texture, and set down with the same lifted shadow, so they belong to the paper world while still turning, blinking and holding things.
- **Gloss is what the phone makes.** The phone's body, its screens, its pictures, the colour of her messages, the app's portrait and even the light the screen throws are all smooth:
  - perfect vector edges and clean gradients;
  - mirror symmetry and no texture or dust;
  - composited **after** the grain, fibre and vignette, so the phone is the only thing in any frame without grain.
- **Two rules make the difference measurable on a second watch:**
  1. Pure white `#FFFFFF` and pure black `#000000` exist only in gloss: in the water, the screen glass and the black bezel. The real world lives between paper `#ECE3D0` and ink `#11141E`.
  2. The screen's light is the only light in the film that is not cut into bands. On his face it is a smooth gradient; every lamp, window and streetlight is posterised.
- **First watch:** a nice phone screen. Screens are smooth in every film, and so is screen-glow.

## Palette

| Role | Hex |
|---|---|
| Night paper (bedroom, living room) | `#0C1019` `#171C2A` `#232B40` `#2E3852` `#384560` `#4C5B82` · streetlight slats `#7E93C2` |
| Warm practical (pendant lamp, cut bands) | `#2A2329` `#382D31` `#4A3C3A` `#5C4A42` · bulb `#FFE2AE` · counter pool `#56453D` `#6E5747` `#876A53` |
| Day paper (the visit) | `#7C7B76` `#93918A` `#A3A098` · shade `#4E5058` · couch `#6B665E` · fridge `#CFCABE` |
| Paper and ink limits | paper `#ECE3D0`, ink `#11141E` (nothing real goes past either) |
| Him: skin, shadow, hair | `#B47C58` `#7A574B` `#1D1613` · tee `#3E4A47` · office shirt `#727D8C`/`#A2A9AE` · sweater `#3D3936` |
| Her: skin, freckle, hair, eyes | `#EBC4A8` · freckles skin ×0.7 · copper `#9E4527`/`#D7814E` · green `#56663A` |
| Her coat and bag | bottle green `#2C4A44` `#1A2E2A` `#4A7066` · tan strap `#8A5C3A` |
| Makeup bag (floral, faded) | ground `#D9C1B4` · flowers `#B9666A` `#C98A5E` `#7A8E6A` `#9C6E8E` · zip brass `#C8A858` |
| **Gloss** (phone only) | white `#FFFFFF`, black `#000000`, water/aqua `#7FE8E6` `#13A2A6` `#9FE6F2`, leaf `#2FAE7D` `#0D6B58`, her bubble `#FF8FB1`→`#B48CFF`, screen light `#FFC5A0` (night) / `#C8EEF2` (white-water) |
| Photo-booth strip (a real photograph) | curtain `#6E7C78`, paper `#F2EEE4` yellowing, magenta/cyan casts, noise ±40 |
| Subtitles | cream `#F3ECDD` on a soft halo `rgba(8,8,10,0.62)` |

## Colour script

- **The night bedroom (B1).** Seen from her side, across the bed. Blue-black paper. He lies on his side on the slept-in pillow, facing us. The phone lies on its long edge on the smooth pillow in front of him, where her head would lie, screen to him and back to us, with his hand resting over it. It throws the only warm light in the room: peach, smooth and close, on his face. Streetlight through the blinds lies in cut slats across *her* made half only, dead straight, because nothing there has moved.
- **The bathroom mornings.**
  - Cold white tile paper and a grey window.
  - The phone propped against the mirror is the warmest object there.
  - Her "Good morning." arrives in a pink-violet gloss bubble.
  - The second toothbrush is grey felt, its bristles furred with paper dust; foam is cut white paper, never pure white.
- **The grey office.** Carpet tiles and dividers in flat grey card under fluorescent bands of pale green-grey. The phone lies face down, a black gloss slab on grey paper. When it buzzes, the only colour on the floor is the edge of a pink bubble.
- **The concrete stairwell.** Raw grey card at its heaviest grain and fibre, with one high window band. The colour coming up his neck is a cut band of red paper rising into his collar. The phone's smooth light is on his face only.
- **The evening bus.** Dusk blue and sodium orange in the window, the passengers as close paper silhouettes. The voice message's waveform crawls across his screen as a clean gloss line. His ears go red in a cut band.
- **The living room at night (B2).** A cheap pendant lamp throws a cone of warm cut bands down the wall and onto the counter. Everything outside the cone is aubergine dark. The fridge is cream card; the strip is a grainy, crooked real print; the phone's picture is the brightest, cleanest thing in the room.
- **The grey daylight of the visit (B3).** Grey-green paper and one slant of window light with two thin mullion shadows. The only saturated real colours are what she brought in: her copper hair and her bottle-green coat. Her texture (freckles, wool flecks, hair strands, tired skin) is the point of the scene. The phone in her hand is the most colourful thing in the room.
- **The last image on the couch.** The daylight is going blue. He lies down along the couch and puts the phone on the cushion beside his face, where a head would be: B1 again, by day. The app's portrait glows in gloss and its smooth light comes back onto his face. Behind him, on the fridge, the strip's grain is the last real thing in the frame.

## Characters

- **Him, 30s.** Medium-brown skin and short dark curly hair grown a little out. A few days' stubble that only the real face has. Heavy-lidded, kind eyes and a long, gentle face. At night he wears a faded green tee. At work he wears a pale blue office shirt a day past clean: crushed collar, one sleeve rolled higher than the other, creases, a coffee mark. At the visit he wears a grey-brown wool sweater with a stretched rib collar.
- **Her, now.** Pale skin dusted with freckles and a copper bob cut blunt above the jaw, with a side part. Green eyes, composed and tired. She wears a bottle-green wool coat with the collar turned up and keeps it on like a guest, with a tan bag strap across her. Everything about her has texture.
- **Her, then (in both kinds of photograph).** The same face, laughing, with long copper hair past her shoulders. On the strip she wears a striped top; in the waterfall, a cream sweater.
- **One face, three renderings.** Each character is one sculpture (`GG.CAST`), so the faces on the strip, in the waterfall and in the doorway are the same faces. Only the rendering changes:
  - **Flash (the strip).** Four different moments: squeezed in and smiling; both gone with laughter, heads back and mouths wide; him pulling a face while she cracks up half out of frame; and her head tipped against his, both laughing. The look is cheap photo-booth: a frontal strobe in two hard bands, a hard shadow on the booth curtain, one frame blown out and one too dark, a magenta or cyan cast that drifts frame to frame, heavy noise, a crooked crop, a crease and yellowing paper. It is a real photograph, so it lives in the grain world.
  - **Gloss (the waterfall, the app's portrait).** The strip's last pose, made perfect, as a generator would "improve" it:
    - Both faces are square to the lens with eyes open on the camera and the same even photo-smile.
    - Exact mirror symmetry, a shorter nose, flatter lips and a lifted chin.
    - No freckles, stubble only as a smooth tint, and rosier cheeks.
    - One soft frontal light **fixed to the faces rather than to the place**, so the tilted head and the upright one shade identically, while the scene's own sun is behind them at the top of the fall.
    - The gorge is mirrored exactly and the water is pure white, with portrait-mode blur and no vignette.

    The positions and her tilt are exactly the strip's. On a first watch it is a nice photo.
  - **Grain (life).** Posterised light whose terminator wobbles like a scissor cut, freckles, stubble and slight asymmetry, with paper texture laid in.
- **Hands.** Hands are sculpted too: posable fingers, a thumb that can be drawn alone over an object, and the forearm and elbow. A hand can therefore lie on a phone like a hand on a shoulder, close round a fork, rest at the nape of a neck, or hold a bag from underneath with only the thumb on the zip.

## Text, phones and subtitles

- **Phone screens** are dark-mode gloss: clean type (Libre Franklin), a pink→violet gradient for *her* messages, neutral grey for his, and the contact saved as a single heart, "♥". A screen is rendered flat and warped onto the phone's quad, then composited after the grain. Screen text is either verbatim from the screenplay ("I love you.", "Good morning.", "Call me tonight?") or interface furniture such as the clock and date.
- **Subtitles** sit in the picture, bottom centre: Libre Franklin 500 for the line and 700 for the speaker label, cream on a soft halo, at most two lines, drawn after the grain so they stay crisp.
  - Every speaker is named, and the phone's voice is "Her:" exactly as the real woman is. The label never gives the twist away.
  - B1 carries "Her: Goodnight. I love you." (the line from the second bedroom scene, which is this image). B3 carries "Her: We’ve never taken this photo. / We’ve never been to a waterfall."

## How the twist stays hidden, and then lands

- **First watch.** The gloss reads as what it is supposed to be: a good phone, a lovely holiday photo, a warm screen glow on a sleeping man. The clues sit in the grain where real things live, unremarked:
  - the made half of the bed with its straight slats;
  - the second mug standing in its ring of dust;
  - the pale rectangle and its nail;
  - the toothbrush furred grey;
  - the bare hangers and the clean rectangle in the wardrobe dust.
- **The rhyme.** B2 puts the two pictures either side of him: the strip's last frame on the fridge and the waterfall on the phone, the same two faces in the same tilt. Only the texture differs, and nobody looks at texture the first time.
- **The landing.** In B3 three of her share one frame:
  - the young woman in the strip, in grain;
  - the young woman on the phone, in gloss;
  - the woman herself, in grain, older, short-haired, freckled.

  Her texture is what makes her real. On a second watch every smooth thing in the film was the machine: the bubbles, the instant replies, the glow on his face in the first shot. When he opens the app at the end, its portrait is the same gloss face, and its light on him is smooth.

## The stairwell's restraint

We never see a picture. The phone is tilted to his chest; what we see is his face in its smooth light, his shoulders dropping as the breath goes out, and a cut band of red paper rising up his neck into his collar. Over his shoulder the thread is out of focus: a grid of soft gloss rectangles in flat skin tones, blurred past any shape. There are no bodies and nothing to read, only colour and repetition. He scrolls; it keeps coming. The restraint is built into the look: the gloss layer is blurred and abstract by rule here, and nothing in it is ever drawn sharp.

## Cost to build all 7–9 minutes (estimate)

**Scope.** About 110–130 shots, 9 sets (bedroom, bathroom, office, stairwell, bus, living room and kitchen, doorway, wardrobe, couch), two principal characters, and background figures as paper silhouettes.

**What drives the cost:**
- **Faces and hands.** They are posable sculptures, so acting means keyframing parameters: head turn, pitch and roll, lids, gaze, brows, smile and mouth for visemes, plus finger and thumb poses and forearm direction. The rig exists (`kit/look_b.js`). The work is direction, lip sync to the voice takes, and a stylisation pass on the mid-shot faces (see below).
- **Sets.** Cut-paper pieces, each with its own texture and lift, reused across shots: the living room appears in four scenes and the bedroom in three.
- **The gloss layer.** One screen system: flat UI canvases warped onto the phone and composited after the grain. The waterfall and the app portrait are generated once and reused.

**Render.** A head costs about 0.5–1.5 s at 1080p and a style frame about 6–9 s. Holds can cache heads, and animating on twos (12 fps), which suits cut-out, halves the work. A full 8-minute pass is roughly 10–15 hours across three workers on this machine.

**Team.** A director, an art director (this look), one set and layout artist, one character animator (the face and hand rig), one compositor/TD (paper pipeline and gloss layer), and sound.

**Schedule (about 18 weeks):**

| Phase | Time |
|---|---|
| Boards, animatic, voice takes | 3 weeks |
| Rig polish (faces, hands, clothes), set builds | 5 weeks |
| Shot production | 8 weeks |
| Sound, grade, finish | 2 weeks |

**Budget.** Roughly £150–200k at UK independent rates, almost all labour; render cost is negligible.

**Scale.** Phones are true size in every frame, about 0.7 of the head's height at the same depth. B2 pushes in, so the picture reads at true size.

## What is not right yet

- The sculpted faces still lean toward clay puppets in mid-shot. His jaw keeps a faint dark line in B2, and her neck runs a little long in B3.
- Clothes are simple flat pieces: her coat is blocky, and the arm sleeves are plain tubes.
- At true size the phone's picture reads as two faces, red hair and white water rather than in detail. The strip's laughs read only on a close look at fridge distance.
