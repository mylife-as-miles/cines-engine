# SETS API: hall.js

SETS.hall (film/sets/hall.js): the front hall, front door, porch, lock insert, corridor and bathroom handle. Every view is its own authored 1920x1080 world. The set never draws characters; the demos use placeholder figures.

USE
- Call `c.camera(H.cams.<name>)` first. Each cam carries `.view`.
- Then `H.back(c,t,state,view)`, draw the characters, then `H.front(c,t,state,view)`. Or call `H.draw(c,t,state,view)` when nobody stands in front of the front layer.
- Front layers:
  - hall: the stairs and newel (foreground left).
  - doorway: the newel post.
  - corridor: the living-room jamb at right, plus the warm room wall. It is cross-faded between its spill-off and spill-on versions.
  - porch, lock and handle have no front layer.
- Static layers are cached under keys `hall:*`. Their resolution follows the camera zoom (1x, 1.5x or 2x). Above zoom 1.12 only the visible part of a layer is blitted.
- HALATION RULE (new): anyone drawn in front of a light that writes to c.em must be occluded right after they are drawn, with `H.occlude(c, fig.shape)`. Lights that write to c.em: the kitchen slab, the open bathroom door, the hall pendant, the street lamp, the keyhole. Without it the bloom washes over the ink. The corridor demos show the pattern.

VIEWS
- `hall`: the F03 port.
  - The tungsten hall in three bands under the pendant, a coat rail with SIX hooks, the fanlight with live rain.
  - The front door is hinged on the right jamb and swings into the hall in perspective.
  - F03's framing is door 0.7 (about 95 degrees): the leaf stands edge-on beside the opening, and the right-hand wall band and dado show beyond it. At door 1 (135 degrees) the leaf stands back over that wall.
  - Dust and haze drift in the lamp cone.
- `doorway`: closer, straight at the door.
  - Outside: rainSlate night, the terrace with chimneys, the gate and path, the wet step with a warm sliver and a puddle.
  - Weather: 3 rain layers, 5 countable lintel drips, splashes on the step.
  - CHANGED: the pendant now hangs off frame above, left of the door, at [520,-330]. It throws a hot tungsten disc on the wall at left, so Scott at `inside` [588,1063,134] is a silhouette against L.hi, as in the S03 ARRIVALS tile.
- `porch`: from inside, looking through the open door.
  - A slot of night between warm-edged jambs, the two on wet porch boards in the hall's spill, 11 countable gutter drips.
  - A cold street lamp brightens the rain in its cone. Its halation is now clipped to the visible slot minus the swinging leaf, so it no longer glows through a closing door.
  - At door 1 the leaf is a near slab on the right.
- `lock`: insert of the night latch (latch box, brass knob, snib, keep).
  - The pendant bands are fixed in space and the door slides under them.
  - Each band is now the shade's straight cut-off closed by an elliptical falloff end. There are no square corners on the door.
  - When ajar, night and rain show in the gap and the sprung tongue is visible.
  - When shut (gap at most 0.5 px), the frame, face, bands and latch body are a single cached layer.
- `corridor`: a one-point hallway, about 85% ink, seen from the living-room doorway.
  - Bathroom door on the left wall: latch at the near jamb Z 2.75, hinge at the far jamb Z 3.65. Its lever points toward the hinge, which is screen right.
  - Kitchen doorway at the far end: now nested rects as in the S03 HALLWAY tile (hoodLow doorway, hoodMid inset, hot core down to the floor).
  - Walls and fittings: dado rails on both walls (the left one breaks for the door); on the right wall, a radiator with NINE countable fins, two frames and a switch; a dead pendant.
  - Floor: warm living-room spill on the boards, and a runner with countable stripes.
  - Kay's L086 afterimage (taken from FILM.byId, never typed) is now ONE line of about 90 px Cormorant, low (Y 1.0-1.3 m). It runs from the near wall across onto the bathroom door, in perspective-correct slices, at 8% opacity. The texture is cached only once `document.fonts.check` passes.
- `handle`: insert of the bathroom lever, rose, backplate and keyhole, lit from below by the light under the door.
  - MIRRORED to match the corridor: the latch edge and stile are at LEFT (edge x 528), the lever points RIGHT, and the hand comes in from the bottom RIGHT.
  - The panel mouldings' lower edges and the lever's undersides catch the light, and the keyhole glows with underDoor.

STATE (all optional; defaults in `H.defaults`)
- `door` 0..1: 1 = 135 degrees; F03's framing is 0.7. Used by hall, doorway and porch.
- `rain` 0..1.
- `coats` 0..6: hung in `H.coatOrder` = deena, angelo, kay, christof, marina, scott. F03 = 2. Kay's mac drips onto the skirting. `coatList:[...]` overrides the order.
- `footprints` 0..5: whole trails in `H.trailOrder` = deena, angelo, kay, christof, marina.
  - Every trail starts with a pair on the sill, now clamped inside the opening (|X| ≤ 0.43 m).
  - Every trail veers LEFT; Angelo's and Christof's were re-routed, so the floor right of the door stays clean.
  - A fraction lays the current trail down print by print. Drawn in hall and doorway.
- `extraPrints` 0..1: the Extra's trace. MOVED to EXTRA {X:+0.42, Z:0.72}, which is `H.anchors.hall.extra` = [1405,963,103.8].
  - It sits on clean floor at Scott's RIGHT as he faces the shut door from latchSide, inside the leaf's swing arc, with nothing leading to it.
  - It is as wet as the freshest sill prints. 0..0.6 fades the standing pair in; 0.6..1 adds two prints walking toward camera.
  - It is visible in hall, hall_latch and hall_floor.
- `dry` 0..1.
- `underDoor` 0..1:
  - corridor: the line of light, plus a fan in TWO posterised bands. The outer band reaches the runner edge, the inner band hugs the door, and the boards show through.
  - handle: the line, the keyhole and the latch-side gap.
- `bathDoor` 0..1: 0..90 degrees into the bathroom.
  - The light comes from a bulb 1.2 m inside the bathroom, through the part of the opening the leaf does not shadow.
  - It is projected as a slab on the floor (two bands) and on the right wall (one band). The frames, radiator and dado stay dark inside it.
  - The slab narrows as the leaf closes and vanishes at 0. For the CLICK, animate 0.6 → 0 over about 0.5 s; the under-door line appears only at 0.
  - The open leaf faces us (soot, lit only by bounce), so light leaks round its top. The halation is masked by the leaf.
- `kayAfterimage` 0..1: 8% opacity at 1.
- `lampTired` 0..1: a STEP state, quantised to THIRDS and keyed into the caches. Do not tween.
- `spill` 0..1 (corridor): TWEENABLE now (a cached overlay drawn at this alpha, and a cross-faded jamb). Q06/Q07 = 1, Q09 = 0.35.
- `endLight` 0..1 (corridor): TWEENABLE now (live nested rects plus a cached far-end overlay). At 0.35 it is a dim three-value slab (Q06/Q07); at 1 it shows the S03 hood colours (Q09). Its em is the core only, at 0.55·el².
- `latch` 0..1 (lock): 0 = ajar, gap 74 px; 1 = shut. Independent of `door`.
- `snib` 0..1 (lock): button up or down. The second CLICK has NO visible cause, so do NOT move the snib on it. At most, show it already down when Scott checks.
- `jiggle` 0..12 px (lock): a hairline of night while he checks the lock.

ANCHORS (`H.anchors[view]`; floor places are `[x, y, figScale]`)
- hall:
  - Points: `pendant` [770,214]; `door` {x0 1004, x1 1384, top 168, bot 872, centre [1194,872]}; `fanlight` [1194,112]; `lock` [1034,520] (knob with the door shut).
  - Floor places: `threshold` [1195,875,86.6], `step` [1242,868,85.2] (Kay, F03), `step2` [1118,866,84.8], `inside` [1078,906,92.6] (Scott answering), `latchSide` [1028,921,95.6], `mid` [714,984,107.8], `hooks` [593,925,96.3], `stairs` [430,1040,92], `living` [-193,946], `front` [981,1407].
  - `extra` [1405,963,103.8]: keep it EMPTY.
  - `rail` {x0 470, x1 770, y 470, hooks: 6 × [x,488], x = 504..754 step 50}.
- doorway:
  - Points: `opening` {x0 744, x1 1256, top 29, sill 975}, `lock` [785,502], `pendant` [520,-330].
  - Floor places: `step` [1017,925,105.1], `stepL` [902,919,103.6], `stepR` [1122,919,103.6], `threshold` [1000,984,117.4], `inside` [588,1063,134.1] (Scott, against the hot disc), `insideNear` [701,1146,151.8], `past` [99,1105,143.1].
- porch:
  - Points: `slot` {x0 521, x1 1399}, `threshold` [960,1333], `streetLamp` [695,235], `porchEdge` 887, `gutter` 78.
  - Floor places: `porchL` [788,950,104], `porchR` [1124,950,104], `porchMid` [960,974,109.4].
- lock:
  - Hardware: `knob` [1010,520], `knobGrip` [1020,540], `snib` [1071,588], `keep` [704,527], `edge` 760, `box` {800,410,330,230}.
  - Hand path: `handIn` [1980,760], `handRest` [1180,640], `handAway` [1700,980].
  - `gapAt(state)` returns the px to add to door-side points.
- handle (mirrored): `lever` [840,466], `leverTip` [960,470], `pivot` [670,452], `keyhole` [670,590], `underDoorY` 907, `edge` 528, `handIn` [1280,1160], `reachStop` [916,548] (the hand stops a few cm short), `touch` [910,492].
- corridor:
  - Points: `vp` [1150,500]; `bathDoor` {near [390,980,390,160], far [577,862,577,244] as [xBot,yBot,xTop,yTop], mid [497,569]}; `handle` [458,579]; `underDoor` [[390,980],[577,862]]; `kitchen` [981,703,43]; `kitchenDoor` {x0 905, x1 1057, top 356, bot 703}.
  - NEW: `kitchenCore` [949,426,64,278], the hot slab to occlude.
  - Floor places: `near` [836,1039,114], `atDoor` [789,913,87.3], `reach` [673,940,93.1] (Scott stops beside the door), `past` [938,800,63.5], `far` [963,736,49.9], `turnIn` [608,906,86] (Kay's last place).
  - `walk(u, X)` gives a point along the runner, u 0 near .. 1 kitchen, X default -0.85.

LIGHTS (`H.lights[view]` = {x, y, color, rimDir}; `H.light` = the hall pendant)
- hall: [770,214], tungsten, rimDir [-1,-0.75].
- doorway: CHANGED to [520,-330], rimDir [-0.3,-1].
- porch: [695,235], rainSilver, rimDir [-0.7,-1], plus `.warm` (from below camera).
- lock: [-400,-500], rimDir [-1,-1].
- handle: [1220,1400], underDoor, rimDir [-0.1,1].
- corridor: the kitchen core [981,523], hood-tinted, rimDir [0,-0.2], plus `.warm` [1800,300] and `.underDoor` [465,933].
- Rims should be single-sided crescents. Use O.silhouette with `light:{dx:rimDir[0], dy:rimDir[1]}` and `spread` of about 0.85-1.1, as the porch and corridor demos do.

CAMS (`H.cams`, each with `.view`)
- hall: `hall` (960,540,1), `hall_push` (1000,548,1.06), `hall_door` (1180,560,1.4), `hall_hooks` (640,600,1.6), `hall_floor` (1020,762,1.7), `hall_latch` (1150,600,1.25).
- doorway: `doorway`, `doorway_step` (1000,520,1.22), `doorway_two` (890,560,1.08).
- porch: `porch`, `porch_push` (960,560,1.08).
- lock: `lock`, `lock_tight` (900,520,1.35).
- handle: `handle`, `handle_tight` (840,600,1.4). CHANGED: mirrored, and the under-door line stays inside a 2.00 letterbox.
- corridor:
  - `corridor` (960,540,1), `corridor_door` (740,560,1.3), `corridor_far` (1080,520,1.5).
  - NEW `corridor_q07` (780,610,1.22): Q07 at 2.00. The shut door and its fan at left, the dark hall running right, the kitchen slab dim.
  - `corridor_q06` CHANGED to (1225,610,1.55). The bathroom door is just out of frame left, and the bathroom slab is in frame on the floor (lower left) and on the right wall, so the CLICK shows as that slab snapping off.
- All cams keep the frame inside the world.

HELPERS
- Projection:
  - `H.floor(view,X,Z)` → [x,y,k].
  - `H.scaleAt(view,Z)` → figure scale. CHANGED: it returns null for 'lock' and 'handle'.
- Door:
  - `H.knob(view,door)` → the moving knob position.
  - `H.doorEdge(view,door)` → {top, bot} of the free edge.
- Prints and shadows:
  - `H.trailPoint(view,i,u)` → a point along guest i's trail, to sync feet to prints.
  - `H.shadow(c,view,shape,alpha)` → floor shadow away from the view's light, clipped to the floor.
- NEW `H.occlude(c, shapeOrPath2D)`: fills the shape black into c.em.
- NEW `H.coatShape(id,x,y,s,rot)` → an OTM shape hanging from its collar loop at (x,y). s = 1 is the hook size, which matches figure scale ≈ 88.
- NEW `H.coat(c,id,x,y,{scale,rot,rimDir,rimColor,rimW,t,drips,fall})`:
  - Draws the coat exactly as the hooks do: ink plus a lit-side rim; Kay's mac adds rain beads, and with `t`, drips from the hem.
  - Returns the shape. Example, Kay holding her mac by the collar: `H.coat(c,'kay',wrist[0],wrist[1],{scale:k/88,t})`.
- `H.fx`:
  - `rainFall(g,x,y,w,h,t,{n,alpha,len,speed,slant,lw,seed})`
  - `drips(g,[[x,y]],fall,t,{period,r,alpha})`
  - `splashes(g,x0,x1,y0,y1,t,n,alpha)`
  - `motes(g,quad,n,t,seed,color,alpha)`
  - `rim(g,path,[dx,dy],w,color,clip,alpha)`: transform-safe rim.

DEMOS (20)
1. hall shut.
2. Kay at the door (F03, door 0.7).
3. Door swinging.
4. All in, with six coats and the Extra's pair.
5. hall_floor.
6. hall_hooks, tired.
7. doorway Kay.
8. doorway half open.
9. porch Christof + Marina (single-sided cold crescents).
10. porch door shutting.
11. doorway shut, prints dry.
12. lock shut, double click (snib never moves; a small jiggle at 2.2-2.6 s).
13. lock ajar.
14. corridor Q06, Kay goes in (bathDoor 0.6, occluded).
15. corridor Q07 with the afterimage.
16. corridor Q09 procession (figures occluded in c.em, so they stay hard ink in front of the lit kitchen).
17. NEW corridor_q07 (2.00).
18. NEW corridor_q06 CLICK: bathDoor 0.6 → 0 between 0.7 and 1.25 s.
19. handle, the hand stops short (from the bottom right).
20. handle with underDoor off.

## Known issues
- Do NOT run /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/hallwork/build.sh. It concatenates the old p1..p9 part files and would overwrite film/sets/hall.js, reverting this whole fix pass. hall.js is now edited directly, and the parts are stale. The pre-fix file is backed up at hallwork/fx/hall_before.js.
- The F03 leaf position (slab at the frame's right edge, x 1725-1920) cannot be reached with a door hinged on the right jamb at 1384. I fixed the doc instead: door 0.7 (about 95 degrees) gives F03's composition (edge-on leaf, right-hand wall band and dado visible), and the F03 demo now uses 0.7. door 1 remains 135 degrees.
- EXTRA sits at X +0.42 rather than the review's +0.38. At +0.38 the standing pair still read as a continuation of Christof's trail in hall_floor. I also re-routed Christof's and Angelo's trails further left, so the gap is now about 0.45 m of clean floor.
- Bathroom geometry: the latch is at the near jamb and the hinge at the far jamb, with the door swinging into the bathroom. From the corridor camera the open leaf therefore always faces us and hides most of the opening. The bathroom's light reads as a sliver round the leaf plus the projected slab on the floor and right wall, not as a glowing opening. To see deep into a lit bathroom in Q06, the door would have to be hinged at the near jamb, which would flip the handle insert again.
- Sequences must call H.occlude(c, shape) after any figure drawn over an emissive source (kitchen slab, open bathroom door, pendant, street lamp, keyhole). OTM.silhouette does not touch c.em.
- lampTired is still a step state (thirds) and is keyed into every cache. Tweening it would rebuild full-frame layers every step. spill and endLight are now safe to tween.
- The cache LRU is global and holds 40 entries. The corridor now uses up to 5 keys per lamp level per resolution (base, spill overlay, end overlay, and two jamb versions), so a long corridor push across all three resolutions uses about 15 entries.
- Engine note, not changed: frame-time averages on the headless machine are 40-70 ms even for near-empty set frames, while the minimums are 6-20 ms. The variance looks like the compositor or GC rather than any set.

Test sheet: out/set_hall.png (all 20 demos, from `node tools/set.js hall 1`)

Full-resolution checks are in /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/hallwork/fx/:
- c_cmp.png: hall_floor guest trails only (top) vs the Extra's pair only (bottom).
- b2d_1.png: F03 at door 0.7.
- b1_6.png: doorway, Scott on the hot disc.
- b1_8.png and b1_9.png: porch, with the lamp no longer glowing through the leaf.
- b4_11.png and c_jig.png: lock.
- b5_13.png: Q06.
- b3_16.png: corridor_q07.
- b3_15.png: Q09, occluded.
- b2q_17.png and b2r_17.png: the q06 click, before and after.
- c_tween2.png and c_bd35.png: bathDoor 0.08 and 0.35, plus mid spill/endLight.
- b1_18.png and c_htight.png: the mirrored handle and handle_tight at 2.00.
- c_coat.png: H.coat in Kay's hand.
Performance: Set plus placeholder figures, from tools/set.js, ms/frame:
- About 9-32 for most demos.
- Q09 procession: 43 (four placeholder silhouettes plus occlude).
- First demo: 50-70 (warm-up).

perf.js (8 frames per demo):
- Minimums: 6-39 ms.
- hall_floor at zoom 1.7: min 17 / 21 on the sheet, down from about 46 in the review, thanks to the visible-rect blit.
- Lock shut: 17-18 ms, from 29 ms (single merged layer).
- Averages: 45-75 ms, but even the near-empty handle frame (min 6) averages 45. That variance comes from the engine's compositor or GC, not from the set.
