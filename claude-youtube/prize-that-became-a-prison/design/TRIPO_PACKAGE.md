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

## Batch 3: home, detention, court and hearing (11 assets, 330 credits)

| # | Asset | Used in | Credits |
| --- | --- | --- | --- |
| 17 | Round kitchen table | Ch 02 | 30 |
| 18 | Wooden dining chair (the empty chair) | Ch 02, 10 | 30 |
| 19 | Dining table | Ch 10 | 30 |
| 20 | Detention cell door | Ch 06, 08 | 30 |
| 21 | Visitor's chair | Ch 06: the empty visitation chair | 30 |
| 22 | Prison visiting booth | Ch 08 | 30 |
| 23 | Steel bunk bed | Ch 08 and the Void Stage cell | 30 |
| 24 | Courtroom judges' bench | Ch 07 | 30 |
| 25 | Defendant's dock | Ch 07 | 30 |
| 26 | Courtroom gallery benches | Ch 07 | 30 |
| 27 | Hearing-room witness table | Ch 09 | 30 |

**All three batches: 27 assets, 850 reference credits** (plus `delight`, if Tripo charges for it).

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
18. **dining-chair** — A traditional wooden dining chair, dark walnut, a spindle back with a curved top rail, a padded seat in faded dark fabric, turned legs, slightly worn, realistic home furniture.
19. **dining-table** — A rectangular wooden dining table for six, about 1.8 m long, dark walnut, four turned legs, a lightly worn top, realistic home furniture.
20. **cell-door** — A heavy grey-painted steel detention cell door in its steel frame, a small rectangular observation window with bars, a closed food hatch at waist height, large hinges, a lock plate, chipped paint, realistic.
21. **visitor-chair** — A plain institutional visitor's chair, grey moulded plastic seat and back on a dark steel tube frame, realistic.
22. **visiting-booth** — A prison visiting booth: a narrow counter divided by a thick glass partition in a steel frame, a black wall-mounted telephone handset on each side of the glass, a fixed round steel stool in front, painted pale grey steel, realistic.
23. **bunk-bed** — A two-tier steel bunk bed, grey-painted steel frame bolted to the floor, thin dark mattresses, a folded grey blanket on the lower bunk, a short ladder at one end, realistic.
24. **judges-bench** — A raised courtroom judges' bench, about 3.5 m wide, a panelled front in pale wood, three high-backed dark leather chairs behind it, no emblem, no text, realistic.
25. **dock** — A courtroom defendant's dock, a waist-high rectangular enclosure of pale wood panels with a wooden railing on top and a small gate, a single plain chair inside, realistic.
26. **gallery-benches** — Two rows of wooden courtroom gallery benches, pale wood, straight backs, realistic.
27. **witness-table** — A long hearing-room witness table, about 2.4 m long, covered with a plain dark blue cloth skirt to the floor, two black gooseneck microphones on small bases, two water glasses, a blank nameplate holder, realistic.

## Built in Blender, not generated (free)

- **Architecture:** the inspection room, terminal, corridors, courtroom, visiting room, cell, hearing room, dining room, kitchen, walls, floors, ceilings, fluorescent fittings, window blinds and glass partitions. Straight edges and exact sizes matter here, and Blender does them cleanly.
- **Flat surfaces:** the steel inspection bench, security trays, the evidence table top and the market-stall frame.
- **Paper props that carry our own typography:** the luggage tag, passport, plane tickets, the receipt, the recreated email, photographs, documents, the sealed envelope and the calendar pages. Their faces are our motion-graphics renders, so the dates and text are exact, which Tripo cannot print.
- **The hidden seam and the lining cross-section:** motion graphics, as the script asks.

## After generation (free)

Download each model as GLB into `noir-kit/assets/props/` (outside git; licences recorded in `assets/README.md`), scale it to the real size given in its prompt, regrade its textures into the film's desaturated palette, and place it in Blender with the cast.
