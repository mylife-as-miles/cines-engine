# House Ealdholt: look and rules

The My Legacy opening of *Crownfall: Aethelgard*. 1920×1080, 30 fps, 30 s. Shot frame by frame inside the game's own
village renderer, then titled.

## The idea: the house wakes

Ealdholt before dawn: the village dark in its trees, a window or two lit, the mountains behind it going from slate to
rose. Then it is morning, and the camera runs through the village the way a returning child would: up the lane, through
the gate, over the pond, down between the long houses toward the sun, up through the crowns. From above, the church
and the roofs; from further back, the whole of Ealdholt in its woods under the mountain. The dark gathers over it and
the name is struck in gold: HOUSE EALDHOLT.

The creator's first direction was the camera and scenario of first-bloom. The first cut followed it whole (a bud, a
wave of spring, a great flower) and looked like that film, not like Crownfall. The creator's second direction, which
this cut follows: keep how the camera moves; make the beginning, the ending, the colour and the title Crownfall's own.

## Rules the picture keeps

- **The picture is the game's.** Every frame is drawn by the game's village renderer at its High preset: its light,
  its sky and clouds, its woodland, water and ground. Nothing is graded, filtered or painted afterwards. If the film
  should look different, the game should look different.
- **The village is as the player finds it.** Nothing is added to it or hidden in it. A player who has just watched
  the film recognises the place when the loading screen lifts.
- **The hour is the game's clock.** The opening runs the last of the night into sunrise (05:48 to 06:16); the rest is
  one morning (07:08 to 07:42), each shot a few minutes after the one before. The sun is where the game puts it.
- **The camera never passes through anything.** The run is plotted through real gaps: down the lane, through the
  compound gate, one hop over a fence, across open water. A changed path is checked with `tools/shoot.mjs --step 5`.
- **The middle keeps first-bloom's camera, the ends are ours.** The low run, the climb through the crowns, the crane
  and the long lens are first-bloom's moves on Ealdholt's ground, cut at its times. The opening (the watch before
  dawn) and the ending (the rise, and the title) are not in first-bloom.
- **No villagers are shown.** The game draws them only where a population site is configured, which this build's
  village does not have. The film does not fake them.
- **No real-world religious symbol is added.** The church and what stands on it are the model's own, as in the game.
- **The title is forged, not typeset.** It follows the game's CROWNFALL / AETHELGARD title: gold lettering with
  enlarged initials, an ornament above, a smaller line between rules below. The ornament is Ealdholt's arms, a sprig
  on russet (`#6e5236`, the film kit's LESSER banner), in a wreath of the same sprig. The smaller line is the mode's
  name, MY LEGACY. It is drawn over the last shot as a separate layer (`tools/title.html`).

## Palette

There is no palette of the film's own: the colours are the game's. The title's are:

| | |
| --- | --- |
| Gold | lit `#f6d98a`, body `#c8963c`, shade `#8a5f22`, forged with a chiselled edge and lit from the upper left |
| Ealdholt's russet | `#6e5236` (the field of the arms) |
| The dark | `#080504`, with embers `rgb(226,150,74)` to `rgb(150,44,30)` |

## Known limits

- The model is a 152 m square. From very high its edge shows as a square, so the ending stays below about 50 m.
- Foliage in the game is alpha-tested cards; in the dark of the first shot it can sparkle. The shoot supersamples to
  calm it.
- The film was framed on the desktop village. The Quest shows the same film on a flat panel.
