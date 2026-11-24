# LOOK A: THE GLOW

**Pitch.** A night film lit by screens. His world is a deep blue-black, and the only warm light in his life is the phone. That light is the AI's: amber-white, soft, close, falling only where a screen can reach.

Style frames: `frames/A1_pillow.jpg`, `frames/A2_waterfall.jpg`, `frames/A3_between.jpg`. Sources: `src/A1_pillow.html`, `src/A2_waterfall.html`, `src/A3_between.html`. Helpers: `kit/look_a.js`. Canvas 2D, deterministic, full 16:9 (1920x1080), no letterbox and no slate. Subtitles sit in the picture, following the decisions the author made on *Autopilot*.

## The grammar

- **One warm light, and it obeys physics.** The phone is a real lamp in a real space. A screen lights only what is in front of it, so the glow lands on his face, the inside of his arm, the pillow in front of the glass, the edge of the salt cellar, the headboard behind. Its back is always dark, rimmed by its own spill. Everything else is lit by the city: cold, flat and blue.
- **The city comes in through blinds.** Street light is projected through the window's actual slats onto whatever it meets first. In A1 it lies across the empty half of the bed in thin cold bars, with the shadow of his body cut out of it. The cold world is geometric; the warm world is round.
- **Graphic realism with flat shapes.** There are no outlines. Every surface is lit in two to four flat bands with soft edges, a posterised Hopper softness rather than a digital ramp. The finish is fine grain, halation on the screen, and a dark that presses in from the edges.
- **Built in true perspective.** Every set is laid out in metres through a pinhole camera.
  - **Figures** are a small quadric ray tracer (ellipsoids and capsules, normals blended across body parts, cast shadows), lit by the shot's own lamps.
  - **Bedding and cushions** are lit heightfields.
  - **Clothes** are flat designed planes around the projected joints.
  - Because of this, the same two faces stay the same people from any angle and under any light. That property is also how the two kinds of image are made (below).

## Palette

| Role | Hex |
|---|---|
| Night (ink to the brightest shadow) | `#03050A` `#060A12` `#0A101C` `#0F1828` `#152137` `#1D2D47` `#283D5C` `#385174` |
| The city through the blinds | `#5E7799` `#6A84B0` `#9DB0CB` `#C9D5E6` |
| **The glow** (the phone, the AI: core to falloff) | `#FFF7EA` `#FFE6BC` `#FFCB86` `#EFA459` `#C47534` `#874821` `#4A2713` `#24140B` |
| Grey daylight (the visit) | `#1C1F22` `#474C51` `#80858A` `#A9AAA6` `#BDBFBE` `#CCCDC8` `#D9DAD6` |
| Him: skin, hair, t-shirt (night / day) | `#A87452`, `#16100C`, `#56616D` / `#4D5561` |
| Her now: skin, hair, coat | `#D9C5B8` (desaturated by the grey), `#2A1E18`, `#87837E` |
| Her in the photographs | skin `#E2B89C`, hair `#2D1C14`, cream knit `#E8DCC8` |
| The floral makeup bag (faded) | `#C0A59B` with `#9C6E6C` `#A88A63` `#7E8C74` flowers |
| Subtitles, halo | `#F3EEE6` on `rgba(2,4,9,0.72)` |

The amber family belongs to the phone alone. No lamp in the flat is ever switched on: the bedside lamp in A1 stands dark beside him.

## Colour script

- **The night bedroom (opening; A1).**
  - Blue-black, with slats of street light across the made half.
  - One amber pocket holds his face, his forearm and the two pillows.
  - The phone itself is a black slab with a burning rim.
- **The bathroom mornings.**
  - A cold blue-grey dawn through frosted glass, the mirror steamed.
  - The phone, propped on the mirror, is the warmest thing: its glow is on the foam and his knuckles.
  - The dusty grey toothbrush sits in the dawn light; the blue one he takes sits in the phone's light.
- **The grey office.**
  - Fluorescent, cool, flat, almost no shadow. It is the only full-light set before the visit, and it is grey, not warm.
  - When the phone buzzes, a small amber patch blooms on his cheek. He turns the phone face down and it goes out.
- **The concrete stairwell.**
  - Cold green-grey under a caged bulkhead light.
  - He tilts the screen to his chest, and the amber rises up his neck and under his jaw. We see the light, not the picture.
- **The evening bus.**
  - The windows are black mirrors full of sodium streaks.
  - The waveform glows amber in his hand, and its reflection travels across the dark window beside his reddening ear.
- **The living room at night (A2).**
  - Blue-black again, the window behind him.
  - The fridge and the strip are cold; the phone, the salt and his face are warm.
  - This is the warmest image in the film: the waterfall itself is golden.
- **The grey daylight of the visit (A3).**
  - The first light in the flat that is not a screen, overcast and soft, from the window.
  - The palette drains to warm grey. Her coat, her skin and the wall are almost one colour.
  - The phone is the only saturated, glowing thing in the frame. In this light she is nearly colourless beside it.
- **The last image on the couch.**
  - After she leaves, the daylight goes grey-blue as the afternoon dies.
  - He wakes the screen; the app's portrait glows. He lies down along the couch and rests the phone by his face.
  - The amber pocket closes round his head exactly as it did on the pillow: the A1 composition, rotated ninety degrees.
  - Behind him the strip on the fridge stays in the grey, then CUT TO BLACK.

## Characters

- **Him, 30s.**
  - Warm medium-brown skin and dark hair a little grown out, because he has kept everything as it was, the haircut included.
  - A day or two of stubble and heavy straight brows. His mouth falls easily into a small smile.
  - A grey-blue crew-neck t-shirt worn one day too long, creased.
  - He is drawn tender, never seedy. His face is lit only from below and in front by the phone, so at night it is always half warm and half blue.
- **Her, as she is now (A3).**
  - Dark brown hair cut in a bob that ends above the jaw, with a fringe swept from a side part. A small mole on her left cheekbone.
  - Light under her eyes, and a slightly thinner face, built from the same head with a few years taken off the flush.
  - A taupe wool coat kept on like a guest, and a bag strap across her far shoulder.
  - The grey light flattens her. She is composed and tired, not cruel.
- **Her in the photographs.**
  - The same head, younger: long hair past the shoulders, the same fringe, laughing, in a cream knit.
  - The rhyme is built in, not drawn twice. The faces in the photo-booth strip, in the waterfall and in the app's portrait are the same 3D heads as the living people, so her likeness carries between her two ages and between real and generated pictures.
- **The two kinds of image (the same two heads under two lights).**
  - **The photo-booth strip (real).**
    - Four frames from a cheap booth, lit by a flash from the lens. Skin is blown pale and a hard shadow falls on the grey curtain behind.
    - The prints have grain, a magenta lean and corner fall-off. Each frame is cropped a little crooked, with heads cut by the edges.
    - The frames show laughter, a blink, and him looking at her instead of the lens. Her mole is there.
    - In the last frame her head is tipped against his. On the fridge it is always in the cold light.
  - **The waterfall and the app portrait (generated).**
    - The same two faces in the same pose as the strip's last frame, lit by one golden key from the left. The light falls on both faces in exactly the same way.
    - Every warning sign is there, unannounced:
      - the skin is untextured, with no stubble and **no mole**;
      - the water is one clean white sheet;
      - the composition is symmetrical;
      - the background has a portrait-mode blur, and the cast is a shade warmer than any sunset.
    - It reads first as a lovely photo. On a second watch the missing mole and the identical light are all you can see.

## Text, screens and subtitles

- **Messages are seen on the phone, in the world, never as overlays.**
  - They appear as bubbles on the lit screen, set in Libre Franklin and warm-tinted like everything the screen shows.
  - The contact name is a single heart.
  - Her replies arrive in the same frame his thumb leaves the glass (the instant answers are a clue).
- **The phone's screens** are drawn as images mapped onto the glass in perspective, with a soft sheen and halation. They are only legible where the screenplay lets us see them:
  - the waterfall;
  - the lock-screen banner "Call me tonight?";
  - the app's portrait over a thin pulsing line.
  The pictures she sends are never shown (see below).
- **Subtitles are in the picture.**
  - Libre Franklin 600, sentence case, bottom centre, warm white on a soft dark halo, no box, at most two lines.
  - Every subtitle names its speaker: "Him: …", "Her: …".
  - The phone's voice is labelled "Her:" in the same colour and weight as the living woman. The label never gives the twist away; the difference is only in the sound (dry and close against the room and the breath).
  - A3 carries "Her: We’ve never taken this photo." / "We’ve never been to a waterfall." verbatim.

## How the twist stays hidden, then lands

- **First watch: the glow is love.**
  - The phone is the only warmth, so the audience reads it as a relationship: her light on his face at night, her picture making the kitchen golden.
  - The clues sit inside that warmth, where nobody looks: the instant replies, the voice with no room, the dusty toothbrush and mug in the cold half of every frame, the empty slats of light on the made side.
  - The waterfall is lit exactly like the fridge strip's last frame is posed.
- **The knock.**
  - The visit is the first daylight scene, and the glow has nowhere to hide.
  - A3 makes the comparison for us. It is shot over his shoulder from behind him, so the screen she holds up faces him (and us). She holds the warm, long-haired, young face up beside her own grey, short-haired, real face, in front of the pale rectangle where their real frame used to hang. Her other hand is at the back of her neck, under the short hair. He holds the floral bag low in his palm, with his thumb on the split zip. The strip from the booth watches from the fridge.
  - Three images of one woman sit in one frame, and only one of them is lit like a person.
- **The ending.** He chooses the glow. The last image puts him back inside the amber pocket, with the real photograph left in the grey behind him.

## The stairwell's restraint

- The camera stays on his face and neck. He tilts the screen to his chest, and the amber climbs his throat and under his jaw as the breath goes out of him. The colour that rises in his neck is the screen's light; we never see the screen.
- In the over-the-shoulder shot the thread is out of focus: a column of soft warm squares, abstract, with no shape or skin legible, scrolling.
- No body, no nudity and nothing sexual is ever drawn. The woman is never an object to look at.

## Cost to build all 7–9 minutes (estimate)

**Scope.**
- About 110–130 shots at about 4 s average.
- Around 10 sets: the bedroom; the bathroom; the office; the stairwell; the bus; the living room with its kitchen; the doorway; the wardrobe; phone inserts.
- Two characters and a few background extras.
- The living room and the bedroom carry more than half the film and are built once.

**What drives the cost.**
- **Figure animation is the main cost.** The faces and hands are already rigs, the heads and hands ray-traced with posable joints. Bodies and clothes are flat planes around projected joints, so a pose is a list of joint positions, not a new drawing.
- **The light is cheap because it is physical.** Moving the phone moves its light on every surface automatically, and the blinds' slats recompute from the window.
- **The film's stillness helps.** Most shots are locked off or slow pushes, with holds and tiny motions: breathing, a thumb on glass, a screen dimming.

**Render.**
- A style frame renders in 4–7 s at 1080p on one core.
- 8 minutes at 24 fps is about 11,500 frames: roughly 20 core-hours, or an evening on the 4-core machine.
- Static backgrounds and the generated images can be cached per shot.

**Team.**
- A director and an art director (this look).
- A layout and lighting TD (cameras and lamps in metres).
- Two animators (him, her and the hands).
- A compositor for the screens, type and grade.
- Sound.

**Schedule (about 16 weeks):**

| Phase | Time |
|---|---|
| Boards and animatic | 3 weeks |
| Rig polish (bodies, clothes, the third set of hands) and set builds | 4 weeks |
| Shot production | 7 weeks |
| Grade, sound and mix | 2 weeks |

**Budget.** Roughly £140–190k at UK independent rates. The figure is mostly labour, on top of the existing kit.

**Known gaps to close before production:**
- Clothed bodies are the weakest part of the frames. They are flat planes, and arms can look jointed like a mannequin.
- Close-up faces need a softer pass on the lower face, where bands can still read as lumps.
- The phone's image in A3 is now about 85×210 px. On the board it is still small, so in the film the shot needs a push-in or an insert for the long hair to read.
- Her lower face reads a little heavy from A3's angle.
