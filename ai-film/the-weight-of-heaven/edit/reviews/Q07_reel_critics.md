# Q07's reel, judged by two independent critics, and what editing then changed

27 November. The author, on the reel with fog (`out/review/Q07_reel_v3_fog.mp4`): "Now I want you to run your critics on
that scene... Do this reach dune level then use edit to fix places that don't".

Two critics, each working alone, each given only the reel, its frames and twelve frames from Dune: Part One, Dune: Part
Two, Blade Runner 2049 and Arrival (read on StillsLab; kept out of the repository). Neither was told what the other
found or what I thought. Neither could watch playback: both judged movement from frames and difference maps.

## The answer to "does this reach Dune level": no, from both

| Shot | Cinematographer | VFX supervisor and editor |
|---|---|---|
| 1, the underside | close (composition 8, light 7, atmosphere 7, realism 6, fit 6). The foreground hexagons are a regular tile; one chain starts in cloud | believability 4, readability 4. The cutter is a 22 px dark thing lowering beside a chain under a hanging root: **"a lantern on a thread"**. The mass reads as a cave overhang, not as floating. The light pumps in place |
| 2, Serath at the window | close (7, 6, 5, 7, 6). After the shadow her face averages a tenth of full brightness; the view outside is a flat blurred backing | **close**: believability 8, readability 8. The view arrives as an even fade and then freezes. The room cannot fit the cutter of shot 3 |
| 3, the plain | **does not** (5, 3, 4, 3, 4). Nine tenths of the frame is busy hexagons, as sharp far as near; no direction to the light; "game render: tile pattern, toy boat, pasted arches" | believability 3. The cutter stands on two black legs with a pole behind: **"an empty toy boat on stilts"**. No shadow, no one aboard. A dark silhouette in shot 1 has become a white dinghy |
| 4, the wall and the bird | close (6, 6, 6, 6, 5). The bird is black on black, then a 12 px dot; the wall is one flat value with no courses or joints | believability 4. The grass is frozen; the bird shrinks from about 42 px to 14 px in four frames; the haze fades up from a hard line; the last 1.6 s is a freeze-frame |
| 5, Sarn Vale | close (7, 5, 7, 7, 5). Dull: no pool of light, nothing ranks the farms above the valley | believability 5. Smoke and sheep frozen; the sky and the valley patch grow in place; a seam in the sky at x 863 |
| The five together | "do not yet look like one film" | "shot 2 is close; the other four are stills with moving overlays" |

## What was done, by editing only (`tools/finish_q07.py`, from the reel without fog)

`out/review/Q07_reel_v4.mp4`: 15.1 s (363 frames), shots of 2.9, 4.2, 2.9, 2.0 and 3.2 s. Nothing generated.

| Shot | Change |
|---|---|
| 1 | Ends on the descent (69 frames). The root above the cutter and the chain beside it are painted out, so the cutter hangs alone in the band of light. Cloud and fog now travel across the frame and no longer swell in place. A slow 4 % push |
| 2 | Starts 12 frames later, past the blank white window; the window held just under clipping. **Her face is lifted half a stop once the shade has fallen: in this copy only, for the author to see; a face is not regraded in the film without their word** |
| 3 | The last 69 frames only, where the cutter is small. Its two dark legs and the pale pole under it are painted out and a soft shadow laid under it. Blue-grey fog over the upper two thirds; the far ground softened; the gates left as pale glows; the near ground 0.7 stop down, the cutter half a stop down; 60 px cropped off the bottom |
| 4 | Ends before the bird shrinks (48 frames). Pushed in to 120 %. The sky in the gap half a stop down and the pier behind the bird's flight lifted, so the black bird shows; haze on the far wall only, steady from the first frame. A slow push |
| 5 | A pool of light on the farms (+0.6 stop), the left 0.4 stop down, the right edge lifted; smoke that rises laid over the plumes; the sky's seam feathered; the mist travels. A slow push |
| All | Greens a quarter less saturated outdoors, one black point, one fine moving grain |

The soundtrack is the local one (`tools/mix_q07.py`), re-timed to the new cuts; the bird's thud is dropped because the
shot now ends before it lands.

## How it was checked

Three moments of every shot as stills; the two paint-outs enlarged four times at six moments. In shot 3 the first two
tries left a leg (a single brightness threshold found only a piece of the hull); the third finds the whole hull from
its brightest piece and clears everything thin under it. The camera drifts in that shot (the far ground moves 13 px
over the shot), so there is no clean plate: the fill is the flat basalt beside the cutter, from its right early and
from its left late, because a rock stack stands on the other side each time. The ground under the cutter changes 4.8
levels of 255 from frame to frame against 3.9 beside it (worst frame 9.3 against 5.2): a little busier than its
surroundings. Not watched in playback by anyone but the author.

## What editing cannot fix (both critics; this is the list for new footage)

- **One cutter**, the same in shots 1 and 3, big enough to hold the room of shot 2, with someone aboard. Now it is a
  small dark shape in shot 1 and an empty white dinghy in shot 3.
- **Shot 3's place and camera**: the hexagons stay sharp to the horizon, so the plain reads as a tabletop; the camera
  is too high to show sky. Fog hides this; it does not change it.
- **Shot 1's angle**: nothing shows the edge of the mass, so it reads as an overhang and not as floating.
- **The wall**: squat gates in shot 3, tall arches in shot 4; basalt at its foot in one, grass in the other; nothing on
  it gives its size, and the bird makes it the size of a viaduct.
- **Life** in shots 4 and 5: grass, smoke and sheep that move. The laid-in smoke is a texture, not smoke.
- **Depth outside Serath's window**, and fine detail everywhere: these are 480p drafts.

## A third critic on the fixed reel: still no, and four marks of my own

A fresh critic, told nothing of the above, was asked the same question of the fixed copy. **No.** Shots 1, 2 and 4
close; shots 3 and 5 do not ("a tabletop miniature" with "a white toy dinghy, unlike shot 1's"; "flat postcard, nearly
a still", the wall cottage-height there and piers in shot 4, no mass overhead). Grain matches in all five; colour and
contrast do not: shots 1 and 3 cold grey, shot 2 warm with blacks at nothing, shots 4 and 5 green, "a different film".

It also found marks that the fixes themselves had left, and one that was in the take:

| Mark | Cause | What was done |
|---|---|---|
| Shot 4: the sky 20 levels brighter within 25 px of both pier edges, a halo | the sky was darkened through a soft-edged box that stopped short of the stone | the sky is now keyed by its brightness, so every piece of it is darkened right up to the piers: 172 to 178 of 255 across the gap |
| Shot 3: blur at top and bottom reads as a miniature | the 3 px softening of the far ground the first critic asked for | 1.2 px; the fog does the work |
| Shot 3: eight identical gate lights, constant for all 69 frames, "pasted" | the lights are the take's; the glow laid over them never changed | fog now travels in front of them, so each comes and goes on its own (one falls from 244 to 180 over the shot while its neighbours hold); less green |
| Shot 3: a blurred smear under the cutter | the whole patch under the hull was refilled, cross-faded between two sources | only the thin things are filled: the two legs and the pole |
| Shot 2: the bright edge of the window's jamb holds at 226 while the view falls to 98, "a mask edge" | in the take | the edge now falls with the view, to about 135 |
| Shot 2: warm, with blacks at nothing | in the take | the wall by the window cooled to neutral (her face, hair and collar are untouched by it); its black point lifted to the others' (floors now 6 to 11 of 255 in all five) |
| Shots 1, 4, 5: green against cold grey | in the takes | greens 40 to 45 % less saturated |
| Shot 4: a pale fringe on the crow as it lands | in the take: the untouched frame has the same pale wing edge | left; the pier is now lifted without lifting the bird, and the push-in is resampled without ringing |

Checked by the same measurements the critic used and by enlarged crops; not judged again by a critic.

What it adds to the list for new footage: the cutter leaving the *rock*, larger, and not fading up out of cloud; a
shadow *edge* crossing Serath's face (now the room dims evenly); the crow settled before the cut; the big chain in
shot 1's foreground takes the eye from the cutter; the push-ins are flat zooms with no parallax.

**Where this leaves the question.** Three critics, three "no". Editing has taken the reel from "four stills with
overlays" to "three shots close, two not"; it cannot take it further. Shot 3 and the cutter are the first things to
remake.
