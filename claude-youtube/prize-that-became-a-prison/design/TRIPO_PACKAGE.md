# The Prize That Became a Prison: Tripo props package

A proposal for the author's approval. **Nothing here is generated until the author says go**, batch by batch, and each asset is generated once (one candidate).

Tripo makes the detailed static objects. Blender builds everything that is flat, architectural or carries our own typography (see the last section). The cast keeps MakeHuman bodies and clothes.

## Settings for every asset

Tool `tripo_text_to_model`, one call per asset:

```json
{
  "family": "hd",
  "model_version": "v3.1-20260211",
  "texture": true,
  "texture_quality": "standard",
  "pbr": true,
  "delight": true,
  "face_limit": 20000,
  "negative_prompt": "logo, brand name, monogram, lettering, text, sticker, barcode, emblem, people, person, hands, mannequin, ground plane, base plinth, display stand, background scenery",
  "idempotency_key": "dawn-<id>-v1",
  "prompt_text": "<prompt below>"
}
```

- **Hero assets** (marked ★: the suitcase and the three handbags, which get close-ups) use `"texture_quality": "detailed"` (4K) and `"face_limit": 40000`.
- **Why these settings:** HD v3.1 is Tripo's realistic model at the lowest modeling price. PBR gives real roughness and metal maps, so leather, steel and nylon answer the fluorescent light properly. `delight` removes any light baked into the textures, so our own lighting and grade do the work. The noir look comes from Blender and the grade, not from the prompt, so the prompts ask for plain, real materials.
- **Reference cost per asset** (Tripo's published rules, not a live quote): HD base 15 + 2K texture 10 + PBR 5 = **30 credits**. A ★ asset with 4K textures adds 10, for **40 credits**. Tripo's table gives no price for `delight`, so its cost is unknown.
- **Everything generic:** no brands, logos, emblems, insignia, real people or legible text. These are stand-ins in a reconstruction, never the real bags (the script: "never a fabricated photograph of the actual bags").

## Batch 1: pilot (4 assets, 140 credits)

These four test soft luggage, leather in close-up and a big machine, under our real lighting in the airport room, before anything else is spent.

| # | Asset | Used in | Credits |
| --- | --- | --- | --- |
| 1 ★ | Dawn's suitcase | Ch 00, 04, 05, 11: the opening, the inspection, the ending | 40 |
| 2 | The extra bag, closed | Ch 04, 05, 11 | 30 |
| 4 ★ | Handbag 1: tote | Ch 04, 05, Evidence Table | 40 |
| 7 | X-ray baggage scanner | Ch 00, 05 | 30 |

### Batch 1 results (26 November 2026)

Approved by the author ("Proceed") and generated once each, with the settings and prompts below unchanged: 140 reference credits. Test frame: `scenes/sf_props_pilot.py` (renders in `out/props/`, not in git).

| # | Asset | Task ID | Model ID | Size placed | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | dawn-suitcase | 01a21788-52fa-7f1a-a642-3f3931f3d7be | 01a2178a-5ffa-7138-867f-4a454a1358b0 | 66 cm tall | Convincing: zips, pockets, wheels, handles. 37k triangles, 4K maps |
| 2 | extra-bag-closed | 01a217bb-672a-709b-9ac8-363ccb2da13e | 01a217bc-d987-7a4a-8ffb-9c6b41420a6e | 75 cm long | Good shape; came out grey and glossy, made near-black and matte in Blender |
| 4 | handbag-tote | 01a217bb-69da-77ea-b55e-06c98d554f65 | 01a217bf-2bbf-79dd-ba13-7a6e2262220c | 35 cm wide | Strong shape and hardware, cognac leather. One face shows a shallow dent under the top light: placed with the other face to camera |
| 7 | xray-scanner | 01a217bb-6c83-7ab3-a749-384e8c973fa5 | 01a217bc-ecc7-7e6d-9cf5-f512c0b9c780 | 1.45 m tall | Usable: tunnel, curtains, in-feed belt, operator screen, but only one detailed side (the others are blank panels). A small maker's plate on top to paint out before any close shot |

Learned:
- **Downloads:** files come from `tripo-data.rg1.data.tripo3d.com` (added to the environment's network allowlist), and are meshopt-compressed: decompress with `noir-kit/tools/unpack_glb.mjs` before Blender.
- **Exposure:** the inspection-room bench light is about two stops too hot for props: diffuse colours under it wash out to pastel at the cast frame's exposure (-0.2). Props render at -2.0. The cast frame should be relit to match.
- **Facing:** Tripo models face no fixed direction; the suitcase's front and the scanner's tunnel look along +X in their files.
- **The film grade** (desaturated blue) turns the tote's cognac into a dusty pink-beige. Shift its hue toward yellow if it should still read tan after the grade.

## Batch 2: the rest of the airport and the evidence table (12 assets, 380 credits)

| # | Asset | Used in | Credits |
| --- | --- | --- | --- |
| 3 | The extra bag, unzipped and open | Ch 04: packing the purses | 30 |
| 5 ★ | Handbag 2: satchel | Ch 04, 05, Evidence Table, the leather market | 40 |
| 6 ★ | Handbag 3: shoulder bag | Same | 40 |
| 8 | Check-in desk with baggage scale | Ch 04: the excess-baggage fee | 30 |
| 9 | Luggage trolley | Ch 04, 05 | 30 |
| 10 | Row of gate seats | Ch 02: the departure gate | 30 |
| 11 | Queue stanchion (one, duplicated) | Ch 04, 05 | 30 |
| 12 | Officer's peaked cap | Ch 00, 05: replaces the cap whose licence is unknown | 30 |
| 13 | Desk lamp | Evidence Table: its practical light | 30 |
| 14 | Laptop, open | Ch 02: the email | 30 |
| 15 | Stack of case files | Evidence Table, Ch 09 | 30 |
| 16 | Hotel reception desk | Ch 01 | 30 |

### Batch 2 results (26 November 2026)

Approved by the author ("Proceed"). Ten generated once each with the prompts and settings below unchanged (320 reference credits). The last two submissions (case files, reception desk) were refused by Tripo with `entitlement_rejected` at the reserve stage while the first ten were running; the account had 2,740 credits on the Pro plan, so the likely cause is a limit on simultaneous tasks. Both originals stay at "admitting", unconfirmed; they have not been resubmitted.

| # | Asset | Task ID | Model ID | Verdict |
| --- | --- | --- | --- | --- |
| 3 | extra-bag-open | 01a217dc-02aa-7a71-807d-d14d8b7f69e7 | 01a217dd-d649-76a2-99be-e728e676dffb | Good: zip open, lining visible, near-black, matches the closed bag |
| 5 | handbag-satchel | 01a217dc-0517-7f14-806f-de26ed88aaa9 | 01a217de-1cbf-785f-b190-ff4bcf0d5315 | Excellent: black leather, gold clasp and rings, strap |
| 6 | handbag-shoulder | 01a217dc-09d0-7cfd-8cbc-560b1db5f90d | 01a217dd-db51-7941-9179-171aaabf99b7 | Good shape; glossy raspberry rather than burgundy: darken and add roughness in Blender |
| 8 | checkin-desk | 01a217dc-1565-79fd-940b-4447bb01ec2b | 01a217dd-3bfc-79d4-b44f-db0e38ac58c4 | **Miss**: separate pieces (black box, belt, scale plate, post), no counter |
| 9 | luggage-trolley | 01a217dc-1fb4-7b4f-8d54-b1964709e8c1 | 01a217dd-dcc1-7c86-8a31-9b4a35dbcae5 | Excellent |
| 10 | gate-seating | 01a217dc-29da-72cd-8667-116addbd6ba6 | 01a217dd-d028-7346-8ae8-ea7b4c5b9198 | Good |
| 11 | stanchion | 01a217dc-339d-7b2b-8e0a-9f4fc5022b2c | 01a217dd-1081-782b-86f6-659f71579843 | **Miss**: a post with a box head, no belt |
| 12 | peaked-cap | 01a217dc-3dcf-7d87-9318-347a8a6ca614 | 01a217dd-f9e0-7c27-951f-82ed793a3df0 | Good shape (crown, band, visor, chin strap, no badge); bright blue: grade to navy |
| 13 | desk-lamp | 01a217dc-47ea-70b7-ad89-fb306e7b5f8c | 01a217dd-cef9-7bc2-b2b4-754ad353addc | Good |
| 14 | laptop | 01a217dc-51e9-75c9-983e-d89ff20dbf54 | 01a217de-0ae9-7497-a685-649c5c5ee860 | Good; plain lid; smudged palm rest |

Resent with the author's go under new keys (`-v2`), same prompts and settings, two at a time (60 reference credits). The `-v1` originals still showed "admitting", with no model, after the resend.

| # | Asset | Task ID | Model ID | Verdict |
| --- | --- | --- | --- | --- |
| 15 | file-folders | 01a217e8-9ee4-727c-9a7f-fcb18f7d2cd0 | 01a217ea-ca2e-7851-996c-26c581a890da | Excellent: worn manila folders, loose sheets, no writing |
| 16 | reception-desk | 01a217e8-a3b8-7292-8b3d-d2ea48ead7f1 | 01a217ea-7250-7e92-a9be-63d47aa7a004 | Usable in the background: walnut front, stone top, monitor and keyboard, but chunky (size it by height, 1.1 m) |

Learned: Tripo does single objects well and multi-part arrangements badly (the check-in desk came back as loose parts). Batch 3 has several composite prompts (the visiting booth, the judges' bench with three chairs, the witness table with microphones), which should be split into single objects or built in Blender. Simple turned or boxy shapes such as the queue post are quicker and cleaner in Blender.

## Batch 3, revised: home, detention, court and hearing (10 assets, 310 credits)

Revised 26 November 2026 after batch 2 showed that Tripo handles single objects well and arrangements badly. Every prompt is now one object; the arrangements are built in Blender around them (see the last sections). Ten at most, so the batch fits the plan's limit on simultaneous tasks.

| # | Asset | Used in | Credits | Change |
| --- | --- | --- | --- | --- |
| 17 | Round kitchen table | Ch 02 | 30 | Unchanged |
| 18 ★ | Wooden dining chair (the empty chair) | Ch 02, 10: the film's quiet ending | 40 | Now a hero asset: 4K, 40k faces |
| 19 | Dining table | Ch 10 | 30 | Unchanged |
| 20 | Detention cell door | Ch 06, 08 | 30 | Unchanged |
| 21 | Visitor's chair | Ch 06: the empty visitation chair; also the dock and booth seats | 30 | Unchanged |
| 22 | Visiting-room telephone | Ch 08: one each side of the glass | 30 | Replaces the whole booth; counter and glass built in Blender |
| 23 | Steel bunk bed | Ch 08 and the Void Stage cell | 30 | Unchanged |
| 24 | High-backed leather chair | Ch 07: three behind the judges' bench; Ch 09 | 30 | Replaces the bench; the bench is built in Blender |
| 25 | One courtroom gallery bench | Ch 07, duplicated into rows | 30 | Replaces "two rows" |
| 26 | Gooseneck desk microphone | Ch 09, and the judges' bench | 30 | Replaces the witness table; table and cloth built in Blender |

The defendant's dock moves to Blender entirely (panels and a rail, with the visitor's chair inside).

**All batches as revised: 26 assets, 830 reference credits** (plus `delight`, if Tripo charges for it). Spent so far: 520 on batches 1 and 2.

The leather market (Ch 04) reuses the three handbags and the extra bag, recoloured in Blender, hung on a stall frame built in Blender.

## Prompts (sent exactly as written)

1. **dawn-suitcase** ★ — A medium-size soft-sided travel suitcase standing upright on four spinner wheels, about 66 cm tall, charcoal grey ballistic nylon fabric, a zip running all the way round the edge with two metal zip pulls, a large zipped front pocket, a padded top carry handle and a retracted telescopic handle, piping along the edges, lightly worn and scuffed, plain with no logo, realistic everyday luggage.
2. **extra-bag-closed** — A cheap rolling duffel bag lying on its base, about 75 cm long, black polyester fabric, full and slightly bulging, a heavy plastic zip along the top with two pulls, two black webbing carry handles joined by a wrap, two small hard wheels and a plastic foot at one end, plain with no logo, realistic market-stall luggage.
3. **extra-bag-open** — A cheap black polyester rolling duffel bag, about 75 cm long, lying on its base with its top zip fully open and the opening pulled wide, the inside empty and lined with dark grey fabric, two black webbing handles falling to the sides, two small wheels at one end, plain with no logo, realistic.
4. **handbag-tote** ★ — A structured designer-style tote handbag standing upright, about 35 cm wide, smooth tan calf leather, two rolled leather top handles, a zip closure along the top, neat edge stitching, four small gold-coloured metal feet on the base, plain front with no logo, monogram or text, realistic luxury leather goods.
5. **handbag-satchel** ★ — A top-handle satchel handbag standing upright, about 30 cm wide, black pebbled leather, a single arched leather handle with gold-coloured metal rings, a front flap with a gold-coloured turn-lock clasp, a thin shoulder strap clipped on, structured shape, plain with no logo, monogram or text, realistic luxury leather goods.
6. **handbag-shoulder** ★ — A soft shoulder handbag, about 32 cm wide, deep burgundy leather with a slightly slouchy shape, a long leather shoulder strap, a zip across the top with a leather pull tab, a small zipped front pocket, plain with no logo, monogram or text, realistic luxury leather goods.
7. **xray-scanner** — An airport security X-ray baggage scanner, about 3 m long: a boxy light grey machine housing with a rectangular tunnel through it, black rubber strip curtains hanging at the tunnel entrance and exit, a flat black conveyor belt running through, short roller tables at both ends, and a small operator monitor and keyboard on a stand at the side, realistic.
8. **checkin-desk** — An airport check-in desk module, about 1.6 m wide: a counter with a pale grey laminate front and a dark top, an agent's computer monitor on the counter, and beside it at floor level a baggage scale platform with a stainless steel plate, a small digital weight display on a short post, and a black rubber conveyor belt behind, realistic.
9. **luggage-trolley** — An airport luggage trolley, chrome-grey tubular steel frame, a flat wire-mesh base platform low to the ground, an upright back frame, a push handle with a brake bar, four small black wheels, empty, realistic.
10. **gate-seating** — A row of four linked airport departure-gate chairs on a single horizontal steel beam with two legs, perforated grey metal seats and backs, slim armrests between the seats, realistic.
11. **stanchion** — A chrome airport queue stanchion post, about 1 m tall, with a retractable black belt cassette at the top and a heavy round weighted base, realistic.
12. **peaked-cap** — A navy blue uniform peaked cap, a stiff round crown, a black glossy visor, a black chin strap above the visor, a plain dark band, no badge, no insignia, no text, realistic.
13. **desk-lamp** — An adjustable metal desk lamp, dark gunmetal grey paint, a conical shade, two jointed arms with springs, a heavy round base, slightly worn, realistic.
14. **laptop** — An open laptop computer from around 2014, silver aluminium body, black keyboard, trackpad, the screen tilted back about 110 degrees and switched off, a plain lid with no logo, realistic.
15. **file-folders** — A stack of worn manila case file folders, about ten folders, slightly misaligned, a few loose sheets of paper sticking out of the edges, plain with no writing, realistic.
16. **reception-desk** — A hotel reception desk, about 2.4 m wide, a gently curved front panel in dark walnut wood, a pale stone counter top, a lower working surface behind it with a computer monitor, realistic contemporary hotel lobby furniture.
17. **kitchen-table** — A small round kitchen table, about 90 cm across, worn honey oak wood, a single pedestal base with four feet, realistic home furniture.
18. **dining-chair** ★ — A traditional wooden dining chair, dark walnut, a spindle back with a curved top rail, a padded seat in faded dark fabric, turned legs, slightly worn, realistic home furniture.
19. **dining-table** — A rectangular wooden dining table for six, about 1.8 m long, dark walnut, four turned legs, a lightly worn top, realistic home furniture.
20. **cell-door** — A heavy grey-painted steel detention cell door in its steel frame, a small rectangular observation window with bars, a closed food hatch at waist height, large hinges, a lock plate, chipped paint, realistic.
21. **visitor-chair** — A plain institutional visitor's chair, grey moulded plastic seat and back on a dark steel tube frame, realistic.
22. **visiting-phone** — A wall-mounted prison visiting telephone: a sturdy black handset resting on a small stainless steel wall box with a hook, connected by a short armoured steel cord, no keypad, no text, realistic.
23. **bunk-bed** — A two-tier steel bunk bed, grey-painted steel frame bolted to the floor, thin dark mattresses, a folded grey blanket on the lower bunk, a short ladder at one end, realistic.
24. **judge-chair** — A high-backed office chair upholstered in dark leather, a tall padded back, padded arms, a five-star swivel base on castors, realistic courtroom furniture.
25. **gallery-bench** — A single long wooden courtroom gallery bench, about 2 m long, pale wood, a straight slatted back and a plain seat, sturdy legs, realistic.
26. **microphone** — A black gooseneck conference microphone, about 45 cm tall, on a small round desk base with a push button, a slim flexible neck and a small foam-covered head, no text, realistic.

Replaced and not generated: the visiting booth, the judges' bench, the defendant's dock, the gallery benches in rows and the witness table (prompts in this file's history).

## Built in Blender, not generated (free)

- **Architecture:** the inspection room, terminal, corridors, courtroom, visiting room, cell, hearing room, dining room, kitchen, walls, floors, ceilings, fluorescent fittings, window blinds and glass partitions. Straight edges and exact sizes matter here, and Blender does them cleanly.
- **Flat surfaces:** the steel inspection bench, security trays, the evidence table top and the market-stall frame.
- **Arrangements Tripo gets wrong:** the check-in counter with its scale and belt, the queue post with its belt, the visiting-booth counter and glass, the raised judges' bench, the defendant's dock, the witness table with its cloth, and water glasses. The generated single objects (phones, chairs, microphones) are placed on them.
- **Paper props that carry our own typography:** the luggage tag, passport, plane tickets, the receipt, the recreated email, photographs, documents, the sealed envelope and the calendar pages. Their faces are our motion-graphics renders, so the dates and text are exact, which Tripo cannot print.
- **The hidden seam and the lining cross-section:** motion graphics, as the script asks.

## After generation (free)

Download each model as GLB into `noir-kit/assets/props/` (outside git; licences recorded in `assets/README.md`), scale it to the real size given in its prompt, regrade its textures into the film's desaturated palette, and place it in Blender with the cast.
