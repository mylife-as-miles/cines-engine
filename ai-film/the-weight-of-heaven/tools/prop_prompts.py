#!/usr/bin/env python3
"""Fill the author's prop-reference template for the hero props of The Weight of Heaven.

    python3 ai-film/the-weight-of-heaven/tools/prop_prompts.py

Writes prompts/refs/PROP_<code>_<slug>.md (notes, the prompt, a take log kept across runs) and PROP_ALL.md.
The template is the author's (.claude/skills/cines-engine/assets/ai-film/prop-reference.md). As it asks, the title and
the palette paragraph under COLOR LOCK are swapped for this film's bible, and sections that do not apply are left out
(SCREEN / DISPLAY LOCK for every prop here: there is no electricity in this world; MOVING / FUNCTIONAL PARTS where
nothing moves). As with the locations, the template's generic "Examples" lists (phones, headphones, coats) are replaced
by each prop's own, and the film's negatives are added under the template's. Designs the script leaves open are the
bible's, or proposals recorded in design/DECISIONS.md.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'prompts', 'refs')

PERIOD = ('Year 800 of the Ascension. Pre-industrial: cast bronze, forged iron, gold, brass, glass, oak, paper, wax. '
          'No electricity, no plastic, no machine-made modern parts.')
ABOVE = 'The Kingdom of Orison, a city of white marble that floats in the cloud (an invented world).'
GROUND = 'The ground beneath Orison: the bearing-lands of the eleven nations (an invented world).'
FLEET = 'The fleet of Orison: white ships that sail the air (an invented world).'

PALETTE = """This film's palette, for reference only: marble #E9E6DE, cloud #AEB4B8, slate #4B5258, rock dust #8A857B, basalt #141517. Five accents each belong to one thing and appear on nothing else: gold #C8A45A (her collar and the cup), seal red #9E2A22 (her wax seal), vale green #5D7A4A (Sarn Vale), lamp amber #E0A050 (Karst's lamp, the hearths), signal white (the signal lamps). Cool and muted; never neon, never saturated."""

FILM_NEGATIVE = [
    'readable text, English or Latin lettering, numbers, logos, makers\' marks',
    'view labels, captions, arrows, measurements or any typography on the sheet',
    'glow, sparkle, magic effects, glowing runes',
    'fantasy-game or steampunk styling',
    'teal-and-orange grading',
]


def bullets(items):
    return '\n'.join(f'- {i}' for i in items)


def numbered(items):
    return '\n'.join(f'{n}. {i}' for n, i in enumerate(items, 1))


def render(P):
    refs = ''
    if P.get('refs'):
        refs = ('\n---\n\n# REFERENCE IMAGES\n\n'
                + '\n'.join(f'@Image {i} — {what}. Use it for: {use}.' for i, (_, what, use) in enumerate(P['refs'], 1))
                + '\n\nTake from each reference only the object\'s design as listed. The sheet itself is the plain grey '
                  'reference described below: no environment, no other objects from the reference.\n')
    comps = '\n\n'.join(f"## COMPONENT {n} — {c['name']}\n\nShape:\n{c['shape']}\n\nPosition:\n{c['position']}\n\n"
                        f"Material:\n{c['material']}\n\nColor:\n{c['color']}\n\nScale:\n{c['scale']}"
                        for n, c in enumerate(P['components'], 1))
    moving = ''
    if P.get('moving'):
        m = P['moving']
        moving = f"""
---

# MOVING / FUNCTIONAL PARTS

If the object has moving components, preserve their mechanical logic.

For this prop:

{bullets(m['parts'])}

Define:

RESTING POSITION:
{m['resting']}

RANGE OF MOVEMENT:
{m['range']}

HINGE / PIVOT LOCATION:
{m['pivot']}

Nothing should articulate in an impossible way.
"""
    return f"""# THE WEIGHT OF HEAVEN — PROP REFERENCE PROMPT

## {P['name']}

Create a photorealistic film-production prop reference image for:

{P['name']}

This is an EXACT CONTINUITY REFERENCE for the feature film THE WEIGHT OF HEAVEN.

This is not advertising photography.
This is not a product commercial.
This is not stylized concept art.

The primary goal is to establish one specific physical object that can remain visually identical across multiple scenes, camera angles, lighting conditions, and generated video clips.
{refs}
---

# PROP IDENTITY

PROP:
{P['prop']}

OWNER / USER:
{P['owner']}

STORY PERIOD:
{PERIOD}

COUNTRY / REGION:
{P['region']}

FUNCTION:
{P['function']}

STORY FUNCTION:
{P['story']}

The object should feel like a real physical item that existed before the camera arrived.

It must not look artificially designed to communicate symbolism.

---

# CORE DESIGN

Establish one exact design.

OBJECT TYPE:
{P['type']}

OVERALL SHAPE:
{P['shape']}

PROPORTIONS:
{P['proportions']}

DIMENSIONS / SCALE:
{P['dimensions']}

PRIMARY COLOR:
{P['primary_color']}

SECONDARY COLOR:
{P['secondary_color']}

CONSTRUCTION:
{P['construction']}

DISTINCTIVE GEOMETRY:
{P['geometry']}

The silhouette must be immediately recognizable from multiple angles.

Do not redesign the object between views.

---

# MATERIAL LOCK

PRIMARY MATERIAL:
{P['mat_primary']}

SECONDARY MATERIAL:
{P['mat_secondary']}

SURFACE FINISH:
{P['finish']}

TEXTURE:
{P['texture']}

TRANSPARENCY / OPACITY:
{P['opacity']}

REFLECTIVITY:
{P['reflectivity']}

EDGE CHARACTER:
{P['edges']}

Materials must behave physically correctly.

For this prop:

{bullets(P['materials'])}

Do not substitute materials.

---

# COLOR LOCK

Exact object color:

{P['color']}

Maintain the same color across all views.

Color response should remain physically believable under neutral reference lighting.

{PALETTE}

However:

DO NOT force the film's palette onto an object that should naturally be another color.

Object credibility comes first.

---

# AGE + CONDITION

The prop is:

{P['condition']}

Specify physical history:

{bullets(P['history'])}

Wear must be subtle and physically plausible.

The object must not appear artificially distressed.

---

# UNIQUE IDENTITY MARKERS

Preserve these exact identifying features:

{numbered(P['markers'])}

These details distinguish this specific prop from generic versions of the same object.

These markers must survive every later generation.

---

# COMPONENT GEOMETRY

Define important components individually.

{comps}

Maintain the exact spatial relationship between components.

No component may move, disappear, duplicate, or change design between views.

---

# SCALE REFERENCE

The object must maintain believable real-world scale.

APPROXIMATE DIMENSIONS:

HEIGHT:
{P['height']}

WIDTH:
{P['width']}

DEPTH:
{P['depth']}

WEIGHT / PHYSICAL FEEL:
{P['weight']}

If relevant, communicate scale through neutral visual presentation rather than adding random objects.

Do not accidentally enlarge or miniaturize the prop.

---

# FUNCTIONAL STATE

Default reference state:

{P['state']}

The reference establishes the object's DEFAULT physical state.
{moving}
---

# REFERENCE-SHEET COMPOSITION

Create a clean multi-view production reference showing the SAME EXACT PROP.

## VIEW 1 — HERO 3/4

Primary identifying view.

Show the complete object.

Natural three-quarter angle.

Clearly establish:

- silhouette
- proportions
- primary materials
- major identifying features

---

## VIEW 2 — FRONT

Straight-on view.

Minimal perspective distortion.

Clearly show the object's face/front geometry.

---

## VIEW 3 — SIDE

Exact same object.

Clear profile.

Show:

- thickness
- depth
- side controls
- seams
- structural geometry

---

## VIEW 4 — BACK

Exact same object.

Show rear construction and identifying details.

---

# OPTIONAL DETAIL VIEW

If useful, include a close detail showing the prop's most important continuity marker:

{P['detail']}

The detail must belong to the exact same object.

---

# BACKGROUND LOCK

Use a plain neutral mid-grey seamless background.

Approximately:

#808080

No environmental context.

No table unless structurally necessary.

No hands.

No character holding the object.

No unrelated accessories.

No decorative background.

The prop must be easy to isolate and reference later.

---

# LIGHTING LOCK

Neutral soft studio reference lighting.

LOW CONTRAST.

Use:

- broad diffused source
- gentle fill
- soft contact shadow
- realistic material response
- readable dark surfaces
- controlled highlights

The purpose is to reveal physical construction.

No dramatic cinematic lighting.

No colored light.

No hard spotlight.

No glossy commercial beauty lighting.

---

# CAMERA / OPTICAL REFERENCE

Natural perspective.

Approximately 50–85mm equivalent perspective depending on prop size.

Keep geometry accurate.

Moderate depth of field.

Entire object readable.

Avoid extreme shallow focus.

Avoid wide-angle distortion.

Avoid exaggerated perspective.

This is primarily an IDENTITY REFERENCE.

---

# PHOTOREALISM LOCK

Photorealistic physical object.

Maintain:

- realistic materials
- real manufacturing seams
- realistic edge thickness
- believable mechanical construction
- correct reflections
- correct contact shadows
- appropriate surface imperfections

It must look physically manufacturable and usable.

No concept-art abstraction.

---

# IDENTITY CONSISTENCY — ABSOLUTE LOCK

EVERY VIEW DEPICTS THE EXACT SAME PHYSICAL OBJECT.

Maintain exactly:

- shape
- proportions
- dimensions
- materials
- colors
- seams
- controls
- logos if specifically required
- wear
- scratches
- attachments
- openings
- hardware

Think of the prop as one object being rotated in front of the camera.

Not several similar objects.

---

# PHYSICS LOCK

Maintain:

{bullets(P['physics'])}

The object's physical behavior must match its real material.

---

# CONTINUITY LOCK

This image becomes the authoritative reference for the prop's:

- identity
- silhouette
- dimensions
- proportions
- construction
- color
- materials
- hardware
- wear
- unique identifying details

Every future THE WEIGHT OF HEAVEN scene containing this prop should preserve these properties.

Lighting and physical orientation may change later.

THE OBJECT ITSELF DOES NOT.

---

# NEGATIVE LOCK

Avoid:

- alternate designs between views
- different colors between views
- different proportions
- material changes
- duplicated components
- missing components
- floating pieces
- impossible construction
- oversized object
- miniature object
- glossy advertising aesthetic
- luxury product photography
- dramatic reflections
- extreme depth of field
- dramatic cinematic background
- environmental scene
- random hands
- random characters
- random accessories
- random labels
- random logos
- unnecessary typography
- generic AI redesign
- stylization
- concept art
- cartoon
{bullets(FILM_NEGATIVE + P.get('negative', []))}
"""


def C(name, shape, position, material, color, scale):
    return dict(name=name, shape=shape, position=position, material=material, color=color, scale=scale)


PROPS = [
    dict(
        code='P01', slug='marriage-bell', name='THE MARRIAGE BELL', shots='1.4 to 1.10, recalled in 7.9; seen in E01',
        refs=[('refs/candidates/E01_t4a.jpg', 'the cathedral nave with the bell hanging in its open tower (approved location)',
               'the bell\'s profile and its dark bronze, as it hangs in the film')],
        prop='A new cast-bronze bell the size of a house, ninety tons, hung for the wedding in the open tower of the Cathedral of the Ascension',
        owner='The Cathedral of the Ascension, Orison', region=ABOVE,
        function='A great bell, struck from outside by a swinging hammer; it hangs from a single stone beam.',
        story='Its lifting warrant carries Serath\'s seal. The hour it is hung, the mountain in Anvil Vale gives way: "Every bell is a mountain now."',
        type='A great church bell in a classical tall profile, with its crown and its iron hanging strap.',
        shape='Tall waisted bell: a rounded shoulder, gently concave waist, flaring to a thick sound-bow and a plain lip. A crown of six heavy cast loops on top.',
        proportions='Height of the body roughly equal to the diameter of the mouth. Walls thick at the sound-bow, thinner at the waist.',
        dimensions='About 6 m tall to the top of the crown; mouth about 5.8 m across; walls about 40 cm thick at the sound-bow.',
        primary_color='Dark, even, chemically darkened bronze: deep brown-black with faint olive.',
        secondary_color='Slightly lighter bronze where the striking point and lip catch the light; black forged iron on the strap.',
        construction='One single casting, with its crown loops cast in one piece with the head; a forged iron strap and pin through the loops.',
        geometry='Three thin raised bands round the shoulder, two round the waist, three round the sound-bow. A plain flat striking patch on one side of the sound-bow. No inscription, no figures, no decoration beyond the bands.',
        mat_primary='Cast bell bronze (copper and tin), dark-finished.', mat_secondary='Forged iron (hanging strap and pin).',
        finish='Satin, even; the casting skin smoothed but not polished.', texture='Fine casting texture, faint lathe marks on the bands.',
        opacity='Opaque.', reflectivity='Low and soft; dark bronze, no mirror highlights.', edges='Rounded lip, crisp raised bands.',
        materials=['cast bronze, darkened, satin', 'forged black iron', 'no gilding anywhere'],
        color='Dark bronze, nearly black-brown; never golden, never bright copper. In its scene it is the darkest object in a white room.',
        condition='New: cast for this wedding, hung this morning.',
        history=['a faint bright scuff on the striking patch from the first stroke', 'clean, unweathered bronze', 'tool marks on the iron strap from fitting'],
        markers=['three thin raised bands at the shoulder, two at the waist, three at the sound-bow', 'six heavy crown loops cast in one with the head', 'the plain flat striking patch on one side of the sound-bow', 'no inscription anywhere'],
        components=[
            C('BODY', 'Tall waisted bell, flared sound-bow, plain lip.', 'The whole object.', 'Cast bronze.', 'Dark bronze.', 'About 6 m tall, 5.8 m across the mouth.'),
            C('CROWN', 'Six heavy cast loops arranged in a ring on the head.', 'Top centre.', 'Cast bronze, one with the body.', 'Dark bronze.', 'Each loop about 60 cm tall.'),
            C('HANGING STRAP', 'A thick forged iron strap passing through the crown loops, with a heavy iron pin.', 'Above the crown.', 'Forged iron.', 'Black iron.', 'Strap about 25 cm wide.'),
        ],
        height='About 6 m to the top of the crown.', width='About 5.8 m across the mouth.', depth='About 5.8 m (round).',
        weight='Ninety tons. It must look immensely heavy and still.',
        state='Hanging still from its iron strap, mouth level, nothing inside the mouth.',
        detail='the crown loops with the iron strap, and the three raised bands of the sound-bow beside the striking patch',
        physics=['realistic gravity: it hangs perfectly plumb', 'thick bronze walls at the lip', 'correct dull bronze reflections', 'no clapper visible: it is struck from outside'],
        negative=['a golden or shiny bell', 'a small bell', 'inscriptions, saints, crests or ornament', 'a church tower or beam behind it', 'a clapper hanging below the lip'],
    ),
    dict(
        code='P02', slug='gold-collar', name='SERATH\'S GOLD COLLAR', shots='1.6, 6.2, 9.16, 11.6',
        prop='The Grand Admiral\'s collar of office: a rigid collar of heavy gold worn high at the throat',
        owner='Grand Admiral Serath', region=ABOVE,
        function='A badge of rank worn closed around the neck over the high collar of her white coat; it opens on a hinge and closes with a clasp at the back.',
        story='Rank, and nothing else. Up there it weighs almost nothing; on the ground it drags at her neck like a hand; at the end she unclasps it and lays it on the chart table.',
        type='A rigid neck collar (a broad torc-like band), hinged and clasped.',
        shape='A smooth closed ring, slightly oval to fit a neck, a broad flat band that is taller at the front than at the back.',
        proportions='Band about 4.5 cm tall at the front, tapering to 3 cm at the back; thick and heavy, not delicate.',
        dimensions='Inside about 12 × 13.5 cm; band 3 to 4.5 cm tall; metal about 6 mm thick.',
        primary_color='Gold #C8A45A: a warm, slightly pale, satin gold. Not brassy yellow, not rose.',
        secondary_color='Darker gold in the hinge and clasp recesses.',
        construction='Two halves of solid gold joined by a barrel hinge at one side, closed by a flat box clasp with a tongue at the back.',
        geometry='Perfectly plain outer face with one single fine engraved line running round the band, 4 mm in from the top edge. Rolled top and bottom edges. Nothing else: no gems, no emblem.',
        mat_primary='Solid gold.', mat_secondary='None.',
        finish='Satin, softly brushed; edges a little brighter from handling.', texture='Smooth, with very fine brushing.',
        opacity='Opaque.', reflectivity='Soft, warm, broad highlights; never mirror-chrome.', edges='Rolled, softly rounded.',
        materials=['solid gold, satin', 'no enamel, no gems, no fabric'],
        color='Gold #C8A45A, satin. It is one of the only two gold things in the film.',
        condition='Lightly used for thirty years and well kept.',
        history=['the inner edge polished smooth by wear against the coat collar', 'faint fine scratches near the clasp from opening it', 'no dents'],
        markers=['the single fine engraved line round the band near the top edge', 'the band taller at the front than the back', 'the barrel hinge on the wearer\'s left', 'the flat box clasp at the back'],
        components=[
            C('BAND', 'Broad flat rigid band, slightly oval, taller at the front.', 'The whole ring.', 'Solid gold.', 'Gold #C8A45A satin.', '3 to 4.5 cm tall.'),
            C('HINGE', 'A short barrel hinge.', 'On the wearer\'s left side.', 'Gold.', 'Gold, darker in the knuckles.', 'About 1.2 cm long.'),
            C('CLASP', 'A flat box clasp with a tongue that pushes in.', 'Centre back.', 'Gold.', 'Gold.', 'About 2 cm wide.'),
        ],
        height='3 cm at the back to 4.5 cm at the front.', width='About 14 cm outside.', depth='About 15 cm outside (front to back).',
        weight='About 1.5 kg: very heavy for its size.',
        state='Closed, standing upright on its lower edge as if worn.',
        moving=dict(parts=['the hinge', 'the clasp'], resting='closed', range='opens on the hinge to about 60 degrees so it can be put round the neck', pivot='the barrel hinge on the left side'),
        detail='the flat box clasp at the back and the fine engraved line beside it',
        physics=['realistic weight: it stands firmly, does not flex', 'solid metal thickness at the cut ends', 'correct soft gold reflections'],
        negative=['a necklace or chain', 'jewels, enamel or emblems', 'yellow brass', 'a neck or mannequin wearing it'],
    ),
    dict(
        code='P03', slug='seal-ring', name='SERATH\'S SEAL RING AND HER RED WAX SEAL', shots='1.8, 7.6, 7.8 (and on every warrant)',
        prop='The Grand Admiral\'s signet ring, and the impression it makes in red wax: an anchor in a ring of stars',
        owner='Grand Admiral Serath', region=ABOVE,
        function='A heavy signet ring worn over her white glove; pressed into red sealing wax it seals the day\'s lifting warrants.',
        story='Thirty years of her hand: hundreds of warrants on the hall floor all carry this one seal. She seals them without reading.',
        type='A signet ring with an oval face engraved in reverse, and one round seal of red wax showing its impression.',
        shape='Ring: a heavy band rising to a flat oval face. Seal: a round blob of wax pressed flat, with a slightly rough spread edge.',
        proportions='Ring face about 2.2 × 1.8 cm; seal about 3.5 cm across.',
        dimensions='Ring inner diameter about 21 mm (worn over a thin glove); band 5 mm wide at the back.',
        primary_color='Ring: dark blackened silver. Wax: seal red #9E2A22, a deep matte brick red.',
        secondary_color='The bright silver of the raised edges of the engraving.',
        construction='Ring cast and engraved by hand; the device cut in reverse into the face. The seal is real sealing wax, pressed once.',
        geometry='The device: a plain anchor (ring at the top, a straight crossbar stock, a straight shank, two curved arms with pointed flukes) inside a circle of seven small five-pointed stars evenly spaced. Nothing else on the face. On the wax it reads the right way round, in relief.',
        mat_primary='Silver, darkened (oxidised) everywhere except the high edges.', mat_secondary='Red sealing wax (for the impression).',
        finish='Ring satin and worn; wax matte with a faint sheen.', texture='Crisp engraving; the wax shows fine impression detail.',
        opacity='Opaque.', reflectivity='Low on the darkened silver; soft on the wax.', edges='Ring edges softened by wear; wax edge irregular where it spread.',
        materials=['blackened silver, never gold', 'red sealing wax, never glossy plastic'],
        color='Ring dark grey-black silver with brighter worn edges. Wax seal red #9E2A22. This red appears on nothing else in the film.',
        condition='Ring: old, worn by thirty years of daily use. Wax: fresh.',
        history=['the band thinned and polished on the underside', 'the face\'s edges rounded by use', 'a tiny nick on one edge of the face'],
        markers=['the anchor with its straight crossbar stock and two curved fluked arms', 'exactly seven five-pointed stars in a circle round it', 'the oval face, longer from top to bottom', 'the tiny nick on the face\'s lower right edge'],
        components=[
            C('RING FACE', 'Flat oval face engraved in reverse with the anchor and seven stars.', 'Top of the ring.', 'Blackened silver.', 'Dark silver, bright edges.', '2.2 × 1.8 cm.'),
            C('BAND', 'Heavy band tapering toward the back.', 'Below the face.', 'Blackened silver.', 'Dark silver.', '5 mm wide at the back.'),
            C('WAX SEAL', 'A round pressed seal showing the anchor in its ring of seven stars, the right way round.', 'Beside the ring on the sheet, lying flat.', 'Red sealing wax.', 'Seal red #9E2A22.', 'About 3.5 cm across.'),
        ],
        height='Ring about 2.6 cm tall.', width='Ring about 2.4 cm.', depth='Ring band 5 mm; wax seal 4 mm thick.',
        weight='Heavy for a ring.',
        state='The ring upright, face visible; the wax seal lying flat beside it on its own, not on paper.',
        detail='the ring face engraving and the wax impression side by side, both clearly showing the anchor and the seven stars',
        physics=['correct mirror reversal: engraved in reverse on the ring, the right way round in the wax', 'the wax spread naturally at its edge', 'solid metal'],
        negative=['a gold ring', 'gems', 'letters or initials on the face', 'more or fewer than seven stars', 'a ship\'s wheel or other emblem', 'paper under the seal'],
    ),
    dict(
        code='P04', slug='lifting-warrant', name='A LIFTING WARRANT', shots='1.8, 7.6 (hundreds on the hall floor)',
        prop='A lifting warrant of Orison: one sheet of heavy white paper with a hand-drawn plan, a written order, and the Grand Admiral\'s red wax seal',
        owner='Orison\'s Admiralty; sealed by Serath; drawn by Karst', region=ABOVE,
        function='An order authorising a lift (a bell, a battery, a tower) whose weight will fall on a marked place below.',
        story='She signs them without reading. Karst drew where each one would fall. Hundreds lie on the Treaty House floor, each held down by a stone.',
        type='A single sheet document with a seal.',
        shape='A flat rectangular sheet, portrait, with deckled edges.',
        proportions='About 2 : 3.',
        dimensions='About 24 × 36 cm.',
        primary_color='Warm white rag paper (close to marble #E9E6DE), never bright white.',
        secondary_color='Dark brown-black iron-gall ink; one seal of red wax.',
        construction='Hand-made rag paper; hand-written; one fold-line across the middle from being carried; the seal pressed directly on the paper at the foot.',
        geometry='Top two-thirds: a small, precise ink plan of a valley seen from above (contour lines, a river, a few houses) with a single small circle marking where the weight will fall. Below it, six short lines of an invented script that belongs to no real language. At the foot, centred, the round red wax seal: an anchor in a ring of seven stars.',
        mat_primary='Heavy rag paper.', mat_secondary='Iron-gall ink; red sealing wax.',
        finish='Matte paper; the wax with a faint sheen.', texture='Laid paper texture, deckled edges.',
        opacity='Opaque paper; a little show-through of the ink on the back.', reflectivity='None on the paper.', edges='Soft deckled edges.',
        materials=['rag paper, not card, not parchment', 'brown-black ink, hand-drawn', 'red sealing wax'],
        color='Warm white paper; brown-black ink; seal red #9E2A22 wax.',
        condition='New: written this morning.',
        history=['one soft fold across the middle', 'a faint thumb smudge in the corner', 'ink slightly heavier where the pen started each line'],
        markers=['the small ink plan of a valley with a single circle marking where the weight falls', 'six lines of invented script below it', 'the red wax seal centred at the foot', 'the fold across the middle'],
        components=[
            C('SHEET', 'Portrait rectangle with deckled edges.', 'The whole object.', 'Rag paper.', 'Warm white.', '24 × 36 cm.'),
            C('PLAN', 'A small ink plan of a valley with one marked circle.', 'Upper two-thirds.', 'Ink.', 'Brown-black.', 'About 16 × 14 cm.'),
            C('SEAL', 'Round wax seal: anchor in a ring of seven stars.', 'Centred at the foot.', 'Red sealing wax.', 'Seal red.', '3.5 cm across.'),
        ],
        height='Lies flat: 36 cm long.', width='24 cm.', depth='Paper under 0.5 mm; the seal 4 mm.',
        weight='Light paper, the wax a small weight at the foot.',
        state='Lying flat, unfolded, face up.',
        detail='the red wax seal on the paper with the last line of the invented script above it',
        physics=['the paper lies flat with a soft fold ridge', 'the wax sits on the paper surface, spread at its edge', 'ink absorbed into the fibres, not floating'],
        negative=['readable words or letters of any real alphabet', 'a ribbon, a scroll, a roll', 'parchment or aged brown paper', 'a stone on the paper'],
    ),
    dict(
        code='P05', slug='the-shard', name='THE SHARD OF ANVIL VALE', shots='7.8, 7.10, 9.8, 11.9',
        prop='A grey shard of rock broken from the mountain of Anvil Vale when it collapsed',
        owner='Karst; then Serath', region=GROUND,
        function='A stone holding down the newest warrant on the hall floor; then carried by Serath in her glove and set down on the plain.',
        story='A piece of Anvil Vale, broken the hour her marriage bell was hung. She lays her bare hand on it; at the end she sets it down among the black.',
        type='A broken piece of rock that fits in one hand.',
        shape='An irregular wedge with three sharp fresh fracture faces and one older, weathered face; one pointed end.',
        proportions='Longer than it is wide; thick at one end, tapering to the point.',
        dimensions='About 14 × 8 × 5 cm.',
        primary_color='Rock dust #8A857B: a mid warm grey on the fresh faces.',
        secondary_color='A darker brown-grey weathered face; a thin white vein.',
        construction='Natural fracture: conchoidal, sharp-edged faces; no tool marks.',
        geometry='Three fresh faces meeting in sharp edges; one weathered face, rounded and darker, with a small pale lichen spot; a thin straight white calcite vein running diagonally across two faces.',
        mat_primary='Fine-grained grey sandstone of the mountain.', mat_secondary='A thin calcite vein; fine grey rock dust.',
        finish='Rough matte.', texture='Fine granular rock; powdery dust in the hollows.',
        opacity='Opaque.', reflectivity='None.', edges='Sharp on the fresh faces, rounded on the weathered one.',
        materials=['natural grey stone, never basalt-black', 'loose grey dust'],
        color='Rock-dust grey #8A857B on the fresh faces, darker brown-grey on the weathered face, a white vein.',
        condition='Freshly broken three days ago, still shedding dust.',
        history=['fine grey dust in every hollow', 'a few grains falling from the point', 'the weathered face old, the others new'],
        markers=['the thin straight white vein crossing two faces diagonally', 'the one darker weathered face with a pale lichen spot', 'the pointed end', 'three sharp fresh faces'],
        components=[
            C('FRESH FACES', 'Three sharp conchoidal fracture faces.', 'Front, top and one side.', 'Grey sandstone.', 'Rock-dust grey.', 'The bulk of the shard.'),
            C('WEATHERED FACE', 'One rounded, older outer surface.', 'The back.', 'Weathered stone with a lichen spot.', 'Darker brown-grey.', 'About 12 × 6 cm.'),
            C('VEIN', 'A thin straight white line.', 'Diagonally across the front and top faces.', 'Calcite.', 'White.', '2 mm wide.'),
        ],
        height='About 5 cm lying down.', width='About 8 cm.', depth='About 14 cm long.',
        weight='About 800 g: heavy for its size, a stone you feel in the hand.',
        state='Lying on its weathered face, the point to one side, a little dust around it.',
        detail='the white vein crossing the edge between two fresh faces, with dust in the fracture',
        physics=['realistic gravity: rests on its broadest face', 'dust settles in hollows, not floating', 'no glow'],
        negative=['a crystal, a gem or polished stone', 'black basalt', 'glowing veins', 'carving'],
    ),
    dict(
        code='P06', slug='wooden-bowl', name='THE CHILD\'S WOODEN BOWL', shots='2.3, 6.5, 11.4, 11.13',
        prop='A small turned wooden bowl that belonged to the farmer\'s daughter',
        owner='The farmer\'s daughter; then the farmer, at his belt', region=GROUND,
        function='A drinking and eating bowl; later carried at the farmer\'s belt on a leather thong.',
        story='She brings her father water in it and the water trembles. After the collapse it hangs at his belt. At the end he fills it, and the water does not move.',
        type='A small hand-turned wooden bowl.',
        shape='A shallow round bowl with gently curved walls, a slightly flared rim and a low foot ring.',
        proportions='About twice as wide as it is deep.',
        dimensions='About 14 cm across the rim, 6.5 cm deep.',
        primary_color='Warm mid-brown wood (bowl wood #8F5E33), darker in the grain.',
        secondary_color='Paler, rubbed-bright wood on the rim; a dark iron staple; a dark brown leather thong.',
        construction='Turned on a pole lathe from one piece of wood; a crack mended with a small iron staple; a hole drilled through the rim for a thong.',
        geometry='A fine split running down from the rim on one side, mended with one small iron staple across it. A small hole drilled through the rim opposite the crack, with a knotted loop of dark leather thong through it. Faint turning rings inside.',
        mat_primary='Turned hardwood (alder or birch), oiled by use.', mat_secondary='A small forged iron staple; a leather thong.',
        finish='Matte, softly oiled from hands.', texture='Visible wood grain, faint lathe rings.',
        opacity='Opaque.', reflectivity='Very low.', edges='Rim rounded and smoothed by use.',
        materials=['turned wood', 'forged iron staple', 'leather thong'],
        color='Warm mid-brown wood, the rim paler from handling; the only warm object in Anvil Vale.',
        condition='Old and much used; mended.',
        history=['the rim rubbed pale and smooth', 'a mended crack with an iron staple', 'a darker water stain inside', 'small dents on the foot'],
        markers=['the iron staple across the crack on one side of the rim', 'the drilled hole and knotted leather thong opposite it', 'the paler rubbed rim', 'the low foot ring'],
        components=[
            C('BOWL', 'Shallow round bowl, slightly flared rim, low foot ring.', 'The whole object.', 'Turned wood.', 'Warm mid-brown.', '14 cm across, 6.5 cm deep.'),
            C('STAPLE', 'A small flat iron staple across a short split.', 'On the rim, one side.', 'Forged iron.', 'Dark grey-black.', 'About 2 cm long.'),
            C('THONG', 'A knotted loop of thin dark leather through a drilled hole.', 'Through the rim opposite the staple.', 'Leather.', 'Dark brown.', 'Loop about 12 cm long.'),
        ],
        height='6.5 cm.', width='14 cm.', depth='14 cm (round).',
        weight='Light, about 150 g.',
        state='Empty, upright on its foot, the thong loop hanging loose over the rim.',
        detail='the mended crack with its iron staple, at the rim',
        physics=['the thong hangs with real gravity', 'wood grain continuous through the bowl', 'the bowl sits flat on its foot'],
        negative=['carving or painted decoration', 'a ceramic or metal bowl', 'a large salad bowl', 'liquid in the bowl'],
    ),
    dict(
        code='P07', slug='gold-cup', name='THE GOLD CUP OF WINE', shots='3.2, 4.1 (seen in E01 and E02)',
        prop='A gold wine cup on a stem, filled with dark red wine',
        owner='The court of Orison', region=ABOVE,
        function='A wine cup; it stands on the cathedral gallery rail at the wedding and on the council table three days later.',
        story='Above, its surface is perfectly still while the valley below shakes. Three days later the wine in it trembles.',
        type='A stemmed cup (a goblet).',
        shape='A wide, shallow-rounded bowl on a slender stem with one small round knop, on a round spreading foot.',
        proportions='Bowl about as wide as the cup is half tall.',
        dimensions='About 16 cm tall; bowl 9 cm across; foot 8 cm across.',
        primary_color='Gold #C8A45A, satin.',
        secondary_color='Dark red wine, nearly black in the depth of the bowl.',
        construction='Raised and spun gold, the stem and foot soldered to the bowl; plain.',
        geometry='Perfectly plain bowl with a thin rolled lip; a single round knop halfway down the stem; a plain foot with one fine raised ring at its edge. No ornament.',
        mat_primary='Gold.', mat_secondary='Red wine.',
        finish='Satin gold, softly brushed.', texture='Smooth.',
        opacity='Opaque cup; the wine dark and opaque at depth, faintly translucent at the edge of the surface.',
        reflectivity='Soft warm highlights on the gold; the wine surface a calm, mirror-flat reflection.', edges='Thin rolled lip.',
        materials=['gold, satin', 'dark red wine'],
        color='Gold #C8A45A, the only gold in its rooms; wine a very dark red, almost black.',
        condition='Old, well kept.',
        history=['faint fine scratches on the foot', 'the lip a little brighter from use'],
        markers=['the single round knop halfway down the stem', 'the fine raised ring at the edge of the foot', 'the thin rolled lip', 'no ornament at all'],
        components=[
            C('BOWL', 'Wide rounded bowl with rolled lip.', 'Top.', 'Gold.', 'Gold satin.', '9 cm across.'),
            C('STEM AND KNOP', 'Slender stem with one round knop.', 'Middle.', 'Gold.', 'Gold.', 'Knop 1.8 cm.'),
            C('FOOT', 'Round spreading foot with a fine raised ring.', 'Bottom.', 'Gold.', 'Gold.', '8 cm across.'),
        ],
        height='About 16 cm.', width='9 cm at the bowl.', depth='9 cm.',
        weight='Heavy for its size.',
        state='Filled two-thirds with dark red wine, the surface perfectly still and level.',
        detail='looking straight down into the bowl: the dark wine surface perfectly flat, the gold lip in a ring around it',
        physics=['the wine surface perfectly level and still', 'correct meniscus at the gold', 'real gold reflections, soft'],
        negative=['gems or engraving', 'a chalice with a cross', 'brass or yellow metal', 'ripples on the wine', 'a table under it'],
    ),
    dict(
        code='P08', slug='the-truce', name='THE HARVEST TRUCE', shots='7 (scene 7), folded into her coat',
        prop='The truce of the eleven nations: one large sheet of new paper with ten grey wax seals along its foot',
        owner='Karst, for the eleven nations; given to Serath', region=GROUND,
        function='A written truce: no hand raised against anyone who comes down unarmed, until the harvest is in.',
        story='Ten seals of eleven; the eleventh is Marl\'s, and she has not given it. It is the first paper Serath reads.',
        type='A single sheet document with a row of seals.',
        shape='A flat landscape rectangle with straight-cut edges.',
        proportions='About 4 : 3, landscape.',
        dimensions='About 40 × 30 cm.',
        primary_color='Clean new paper, a cool pale grey-white (rougher and greyer than Orison\'s warrants).',
        secondary_color='Black ink; ten seals of plain grey wax.',
        construction='Coarse new paper; hand-written; the seals pressed directly on the paper in one row along the foot.',
        geometry='Eight short lines of an invented script in black ink across the upper half. Along the foot, ten round grey wax seals in a single even row, each with a different simple emblem (a wheel, a sheaf, a spear, a bowl, a hand, a mountain, a river, a tree, a gate, a star). At the right end of the row, an empty space where an eleventh seal would go.',
        mat_primary='Coarse new paper.', mat_secondary='Black ink; grey sealing wax.',
        finish='Matte.', texture='Coarse paper fibres.',
        opacity='Opaque.', reflectivity='None.', edges='Straight cut, slightly rough.',
        materials=['coarse paper', 'black ink', 'grey sealing wax, never red'],
        color='Pale grey-white paper, black ink, mid-grey wax seals.',
        condition='New: written in the last days.',
        history=['a faint crease where it was rolled', 'small smudges near some seals'],
        markers=['ten grey wax seals in one row along the foot, each with a different simple emblem', 'the empty space for an eleventh seal at the right end', 'eight lines of invented script', 'grey wax, not red'],
        components=[
            C('SHEET', 'Landscape rectangle.', 'The whole object.', 'Coarse paper.', 'Pale grey-white.', '40 × 30 cm.'),
            C('TEXT', 'Eight lines of invented script.', 'Upper half.', 'Black ink.', 'Black.', 'Lines about 30 cm long.'),
            C('SEALS', 'Ten round grey wax seals, one row, each different; an empty place for an eleventh.', 'Along the foot.', 'Grey wax.', 'Mid grey.', 'Each about 3 cm across.'),
        ],
        height='Lies flat: 30 cm.', width='40 cm.', depth='Paper under 0.5 mm; seals 4 mm.',
        weight='Light paper with the small weight of the seals.',
        state='Lying flat, face up.',
        detail='the right end of the row of seals: the tenth grey seal and the empty space beside it',
        physics=['the paper lies flat', 'the wax sits on the paper surface', 'ink absorbed into the fibres'],
        negative=['red wax', 'readable words or letters of any real alphabet', 'a ribbon or scroll', 'eleven seals'],
    ),
    dict(
        code='P09', slug='karsts-lamp', name='KARST\'S LAMP', shots='7.6 (scene 7)',
        prop='A hand-carried oil lamp: an old imperial surveyor\'s lantern of brass and glass with its insignia filed off',
        owner='Karst', region=GROUND,
        function='A lantern for working in the dark: a flame behind glass, with a hinged brass hood that throws the light down.',
        story='He holds it over the floor of warrants: the only warm light in the hall. Like his coat, it was imperial, and the insignia has been cut away.',
        type='A hand lantern.',
        shape='A squat cylinder of glass between a round brass base (the oil font) and a domed brass top with a chimney and a carrying ring; a curved brass hood hinged on one side.',
        proportions='Taller than wide, about 3 : 2.',
        dimensions='About 30 cm tall with the ring; 18 cm across.',
        primary_color='Old brass, darkened and worn, brighter at the handle and edges.',
        secondary_color='Clear glass with soot at the top; the flame lamp amber #E0A050.',
        construction='Spun and riveted brass; a glass chimney held by four brass uprights; a wick turned by a small brass knob.',
        geometry='On the domed top, a rough filed patch where an emblem has been removed. A curved brass hood on a hinge covers one side of the glass. A carrying ring of thick brass wire. Four uprights around the glass. A small wick knob on the font.',
        mat_primary='Brass.', mat_secondary='Glass; a cotton wick.',
        finish='Worn satin brass, darkened in recesses.', texture='Dents and scratches; filed roughness on the top.',
        opacity='Clear glass, sooted at the top.', reflectivity='Soft brass highlights; glass reflections subtle.', edges='Rolled brass edges, dented.',
        materials=['brass, old and worn', 'glass, sooted', 'a small real flame'],
        color='Darkened brass; the flame lamp amber #E0A050.',
        condition='Old, heavily used, repaired.',
        history=['the filed patch on the top where the imperial insignia was removed', 'a dent in the font', 'soot on the inside of the glass at the top', 'the ring and hood hinge polished by hands'],
        markers=['the rough filed patch on the domed top', 'the hinged curved hood on one side', 'four brass uprights around the glass', 'the dent in the font'],
        components=[
            C('FONT', 'Round brass oil base with a wick knob.', 'Bottom.', 'Brass.', 'Darkened brass.', '18 cm across, 7 cm tall.'),
            C('GLASS AND UPRIGHTS', 'Cylindrical glass held by four uprights.', 'Middle.', 'Glass and brass.', 'Clear, sooted at top.', '12 cm tall.'),
            C('TOP, HOOD AND RING', 'Domed top with chimney and a filed patch; a hinged curved hood; a thick wire ring.', 'Top and one side.', 'Brass.', 'Brass.', 'Ring 8 cm across.'),
        ],
        height='About 30 cm with the ring up.', width='About 18 cm.', depth='About 18 cm.',
        weight='About 1.5 kg with oil.',
        state='Lit with a small steady flame; the hood half open; the ring upright.',
        moving=dict(parts=['the hood on its hinge', 'the carrying ring'], resting='hood half open, ring upright', range='hood swings 120 degrees round the glass; ring folds flat', pivot='the hood hinges on one upright; the ring on two lugs at the top'),
        detail='the filed patch on the domed top, beside the chimney',
        physics=['a small, real, steady flame', 'soot only where smoke would rise', 'the hood hangs on a real hinge'],
        negative=['an electric lamp', 'a glowing halo around the lamp', 'insignia or emblems', 'ornate decoration'],
    ),
    dict(
        code='P10', slug='signal-post', name='THE FLEET SIGNAL POST: SIGNAL ARM AND SIGNAL LAMP', shots='8.4, 9.9, 9.14, 10.3, 10.4',
        prop='The signal post carried by every ship of Orison\'s fleet: one long signal arm on a mast and a shuttered signal lamp beneath it',
        owner='Every ship of the fleet', region=FLEET,
        function='The fleet has no radio. Orders are pictures: a lamp flashes, an arm rises or drops. An arm raised high means ready; dropped in one sharp chop it means fire; anchors are ordered by lamp.',
        story='When Serath raises her hand, a signal arm rises with it on every ship. Cassiel\'s arm drops: the chop that means fire. Not one gun answers.',
        type='A signal mast with a pivoting arm and a large shuttered lamp.',
        shape='A slender white mast; near its top a single long flat arm pivoting at one end; below it, a large round brass lamp with a front of horizontal shutter slats.',
        proportions='The arm about as long as two-thirds of the mast\'s visible height.',
        dimensions='Mast about 6 m; arm about 4 m long and 40 cm wide; lamp about 70 cm across.',
        primary_color='White-painted timber (marble #E9E6DE) for mast and arm; a single dark slate band across the end of the arm.',
        secondary_color='Brass on the lamp body and pivot; the lamp glass clear.',
        construction='Built like the fleet\'s ships: white-painted timber framing, brass fittings, iron pins.',
        geometry='The arm ends in a pointed lancet tip, like the fleet\'s gunports. The pivot is a brass boss with an iron pin. The lamp has eleven horizontal shutter slats worked by a side lever; a lancet-shaped brass hood over it.',
        mat_primary='Painted timber.', mat_secondary='Brass; glass; iron.',
        finish='Satin paint, slightly worn; satin brass.', texture='Painted wood grain under the paint.',
        opacity='Opaque; clear glass behind the shutters.', reflectivity='Low paint; soft brass.', edges='Crisp painted edges, softened at handholds.',
        materials=['white-painted timber', 'brass', 'glass', 'iron pins'],
        color='White timber with one dark slate band at the arm\'s tip; brass lamp. When open, the lamp is signal white.',
        condition='Well maintained navy equipment, lightly worn.',
        history=['paint worn at the lever and the pivot', 'small chips at the arm tip'],
        markers=['the pointed lancet tip of the arm with its single dark band', 'the brass pivot boss', 'eleven horizontal shutter slats on the lamp', 'the lancet-shaped hood over the lamp'],
        components=[
            C('MAST', 'Slender square-section white post.', 'Vertical, centre.', 'Painted timber.', 'White.', '6 m tall, 18 cm square.'),
            C('SIGNAL ARM', 'Long flat arm with a lancet tip and a dark band.', 'Pivoting near the mast top.', 'Painted timber.', 'White, dark slate band.', '4 m long, 40 cm wide.'),
            C('SIGNAL LAMP', 'Round brass lamp with eleven horizontal shutters and a lancet hood.', 'On the mast below the arm.', 'Brass and glass.', 'Brass.', '70 cm across.'),
        ],
        height='About 6 m.', width='About 4.5 m with the arm out.', depth='About 1 m at the lamp.',
        weight='Solid naval timber and brass.',
        state='Arm lowered, hanging straight down along the mast; lamp shutters closed.',
        moving=dict(parts=['the signal arm on its pivot', 'the lamp shutters on their lever'], resting='arm hanging down along the mast; shutters closed', range='the arm swings up to point straight up, or out level; the shutters open and close together', pivot='the brass boss near the top of the mast'),
        detail='the lamp\'s shutter slats and lever beside the brass pivot of the arm',
        physics=['the arm pivots only at its boss', 'the shutters move together on one lever', 'the lamp is not lit in this reference'],
        negative=['a railway semaphore with coloured lenses', 'flags', 'electric lights', 'ropes and rigging clutter'],
    ),
    dict(
        code='P11', slug='anchor-and-chain', name='THE ANCHOR OF THE FLEET AND ITS CHAIN', shots='10.1, 10.5 to 10.7, 11.7 (seen in E13)',
        refs=[('refs/candidates/E13_t2b.jpg', 'the anchor chain at the foot of the lowest terrace (approved location)',
               'the chain\'s links: dark iron stud-link chain, each link taller than a man')],
        prop='The great iron anchor of a ship of Orison\'s fleet, with the first links of its mile of chain',
        owner='The flagship (every ship of the line carries the same pattern)', region=FLEET,
        function='An anchor let go from a ship hanging a mile up; it falls on a mile of chain and bites into the basalt.',
        story='The first anchor answers the wedding bell: one iron note. Then the sky rains iron, and there is a forest of chain between heaven and the ground. Its shape is the anchor of Serath\'s seal.',
        type='An admiralty-pattern anchor with a ring, a crossbar stock and two arms, shackled to stud-link chain.',
        shape='A long straight shank with a large ring at the top, a straight crossbar stock just below the ring, set at right angles to two curved arms ending in broad pointed flukes.',
        proportions='Stock about as long as the shank; arms spanning about two-thirds of the shank length.',
        dimensions='Shank about 15 m; stock about 14 m; ring about 3 m across; each chain link about 2.2 m long.',
        primary_color='Dark forged iron, near black, with dull brown rust in pits.',
        secondary_color='Slightly lighter iron where the flukes are worn.',
        construction='Forged iron, hammer-finished; the stock pinned through the shank; the ring joined to the chain by a heavy shackle; stud-link chain.',
        geometry='The silhouette is the same anchor as on Serath\'s seal: ring, straight crossbar stock, straight shank, two curved arms with pointed flukes. A heavy shackle and six stud-link links attached to the ring.',
        mat_primary='Forged iron.', mat_secondary='Forged iron chain.',
        finish='Rough hammer finish, matte.', texture='Hammer marks, pitting, dull rust in hollows.',
        opacity='Opaque.', reflectivity='Very low.', edges='Heavy, slightly rounded forged edges.',
        materials=['forged iron', 'stud-link chain'],
        color='Near-black iron with dull brown rust.',
        condition='Old navy iron, sound and heavy, never used at the ground before today.',
        history=['hammer marks along the shank', 'rust in pits, not flaking', 'the fluke tips a little brighter'],
        markers=['the straight crossbar stock just below the ring', 'two curved arms with broad pointed flukes', 'the heavy shackle at the ring', 'stud-link chain, each link with a cross stud'],
        components=[
            C('SHANK AND RING', 'Long straight shank with a large ring at the top.', 'Centre, vertical.', 'Forged iron.', 'Dark iron.', 'Shank 15 m; ring 3 m.'),
            C('STOCK', 'Straight crossbar through the shank below the ring, at right angles to the arms.', 'Top, across the shank.', 'Forged iron.', 'Dark iron.', 'About 14 m long.'),
            C('ARMS AND FLUKES', 'Two curved arms ending in broad pointed flukes.', 'Bottom.', 'Forged iron.', 'Dark iron.', 'About 10 m tip to tip.'),
            C('CHAIN', 'A heavy shackle and six stud-link links.', 'Attached to the ring, rising out of frame.', 'Forged iron.', 'Dark iron.', 'Each link 2.2 m long.'),
        ],
        height='About 15 m, plus the chain.', width='About 14 m across the stock.', depth='About 10 m across the arms.',
        weight='Hundreds of tons. Immensely heavy.',
        state='Hanging plumb from its chain, which rises straight up from the ring out of the top of the frame; the flukes a little above the floor.',
        detail='the shackle joining the ring to the first stud link',
        physics=['the chain hangs perfectly straight under its weight', 'real forged-iron thickness', 'no glow, no sparks'],
        negative=['a modern stockless ship anchor', 'a small boat anchor', 'decorative anchor', 'rope'],
    ),
    dict(
        code='P12', slug='weir-wheel', name='THE WHEEL OF THE WEIR AND ITS LOCK-PIN', shots='8.7, 9.11, 10.4, 10.11 to 10.14 (seen in E06)',
        prop='The great wheel that works the nine gates of the Weir, with its oak frame and iron lock-pin',
        owner='The Weir at Sarn; turned by the people of the ground for eight hundred years', region=GROUND,
        function='Turned by hand, it opens and closes the Weir\'s gates. A lock-pin holds it still.',
        story='Fighters put their shoulders to it to open all nine gates at once; Karst keeps his hand on the lock-pin. At the end he draws the pin and turns it, a hand\'s breadth at a time.',
        type='A giant upright hand-wheel like a ship\'s wheel, in a timber frame.',
        shape='A plain upright spoked wheel: a thick rim of oak segments bound with iron, twenty-four spokes, and each spoke continuing beyond the rim as a round turned handle. A heavy axle into an oak frame of posts and braces.',
        proportions='Rim forty feet across; the handles project about a metre beyond the rim; the hub about a tenth of the diameter.',
        dimensions='Rim about 12 m across; handles about 1 m long and as thick as a man\'s thigh; frame about 14 m tall.',
        primary_color='Dark weathered oak, grey-brown.',
        secondary_color='Pale worn oak on the handles; black forged iron on the bands, hub and pin.',
        construction='Oak segments jointed and pegged, bound with forged iron bands; spokes mortised into an iron-banded hub; an iron axle; an oak frame of two posts with diagonal braces bolted with iron.',
        geometry='Twenty-four spokes, each running through the rim into a turned handle. No paddles, buckets, blades or boards on the rim: it is not a water-wheel. The lowest handles pass about half a metre above the ground, so people push the handles at shoulder height as they come round. The lock-pin: a thick iron bar with a ring at its end, through the lower crossbeam of the frame and between two of the lowest handles, at chest height.',
        mat_primary='Oak.', mat_secondary='Forged iron.',
        finish='Weathered matte oak; the handles polished smooth and pale by hands.', texture='Open oak grain, checks and splits; hammered iron.',
        opacity='Opaque.', reflectivity='Very low; a soft sheen on the worn handles.', edges='Softened by age; handle ends rounded.',
        materials=['oak, old and weathered', 'forged iron bands, bolts, hub and pin'],
        color='Dark grey-brown oak, pale worn handles, black iron.',
        condition='Eight hundred years old, repaired many times, sound.',
        history=['every handle worn pale and smooth by hands', 'some rim segments replaced with newer, less weathered oak', 'iron bands re-forged and re-bolted', 'the lock-pin hole worn oval'],
        markers=['twenty-four spokes, each continuing past the rim into a handle', 'no paddles or buckets anywhere on the rim', 'the iron lock-pin with its ring at chest height between two low handles', 'a few newer, paler rim segments among the old'],
        components=[
            C('RIM AND SPOKES', 'Thick oak rim of segments with iron bands; twenty-four spokes.', 'The wheel.', 'Oak and iron.', 'Dark oak, black iron.', '12 m across.'),
            C('HANDLES', 'Round turned handles continuing each spoke past the rim.', 'Around the outside of the rim.', 'Oak.', 'Pale, polished by hands.', '1 m long each.'),
            C('HUB AND FRAME', 'Iron-banded hub on an iron axle; an oak frame of two posts with diagonal braces and a lower crossbeam.', 'Centre and behind.', 'Oak and iron.', 'Dark oak, black iron.', 'Frame about 14 m tall.'),
            C('LOCK-PIN', 'A thick iron bar with a ring at its outer end.', 'Through the lower crossbeam, between two of the lowest handles, at chest height.', 'Forged iron.', 'Black iron.', 'About 1.5 m long, 10 cm thick.'),
        ],
        height='About 14 m with the frame.', width='About 14 m including handles.', depth='About 4 m with the frame.',
        weight='Tons of oak and iron; it turns only under many shoulders.',
        state='Still, held by the lock-pin; one handle at the bottom.',
        moving=dict(parts=['the wheel on its axle', 'the lock-pin sliding out of the crossbeam'], resting='locked by the pin', range='the wheel turns slowly either way when the pin is drawn', pivot='the axle at the hub'),
        detail='the lock-pin and its ring through the crossbeam, between two pale worn handles',
        physics=['the frame stands on the ground, braced', 'the handles worn where hands push', 'the pin passes through solid timber'],
        negative=['a water-wheel', 'paddles, buckets, blades or troughs on the rim', 'a crank handle', 'water', 'a mill', 'a wall behind the wheel'],
    ),
]



# ---------------------------------------------------------------------------------------------------------------
# The fleet (V01 to V06) and the secondary props (P13 to P19, P21), added 25 November at the author's ask. Same
# template, same model (Nano Banana Pro), one candidate each. The ships carry the locked bridge and gun-deck images so
# they agree with the fleet already seen through the bridge glass (E10) and with the ships' own interiors (E11).
# P20, the thing thrown in 11.8, waits for the author: the script does not say what it is.
# ---------------------------------------------------------------------------------------------------------------

R_E10 = ('refs/ENV_E10_flagship-bridge.jpg', 'the flagship bridge with the fleet outside at dusk (approved location)',
         'the look of the fleet as already established: white church-nave superstructures with spires and lancet windows on long hulls, hanging in the air')
R_E11 = ('refs/ENV_E11_gun-deck.jpg', 'a gun deck of the fleet (approved location)',
         'the ships\' building language: white-painted timber framing, pointed lancet gunports, dark iron cannon')

SHIP_PHYSICS = ['it hangs level in the air with no visible means: no balloons, sails, propellers, engines, jets, smoke or glow',
                'a soft shadow on the floor beneath it, as if it hovered a little above a studio floor',
                'real timber, iron and brass thickness and joinery']
SHIP_NEG = ['sails, balloons, gas bags, propellers, engines, jets or exhausts', 'a sea, water or waves', 'a zeppelin or airship',
            'steampunk pipes and gears', 'flags with emblems or colours', 'glow beneath the hull']


def mk(**kw):
    d = dict(opacity='Opaque.', reflectivity='Low.', mat_secondary='None.', secondary_color='None.',
             finish='Matte to satin.', texture='Natural.', edges='Softened by use.', negative=[], history=[])
    d.update(kw)
    return d


SHIP_STORY = 'The fleet is Orison under arms: every order is a picture the whole fleet can read; no gun ever fires in this film.'

FLEET_LIST = [
    mk(code='V01', slug='flagship', name='THE FLAGSHIP OF ORISON', shots='8.1 to 8.9, 9 (from inside), 10.1, 10.8', refs=[R_E10, R_E11],
       prop='The flagship of the fleet of Orison: the greatest ship of the line, a cathedral nave built as a hull, hanging in the air',
       owner='The Grand Admiral\'s flag; its Flag Captain', region=FLEET,
       function='Command ship of the fleet: the bridge at the bow, gun decks along the sides, signal posts on deck, the anchor at the keel.',
       story=SHIP_STORY + ' From here Serath lowers her hand and orders anchors; from its keel the first anchor falls a mile.',
       type='A great air-ship of the line built like a church: a long white hull carrying a nave superstructure and one tall spire.',
       shape='A long, narrow hull whose keel is shaped like an upturned pitched roof; on it, a long nave with pointed lancet windows and buttresses, one tall slender spire rising from the middle as a mast, and at the bow the glazed bridge with its tall gridded lancet glass.',
       proportions='About eight times as long as it is wide; the spire about as tall as the hull is long divided by three.',
       dimensions='About 320 m long, 40 m wide; the spire about 110 m tall above the deck.',
       primary_color='Hull white #E9E6DE: white-painted timber, warm where the light reaches, never pure white.',
       secondary_color='Brass fittings; dark chain iron at the hawse; slate-grey roofing on the nave.',
       construction='White-painted timber planking and framing over a timber keel, iron-strapped; brass at the bridge and the signal posts.',
       geometry='Three rows of pointed lancet gunports along each side of the hull, closed. A great white banner on the spire. Two fleet signal posts (white masts with lancet-tipped arms and round brass lamps) on the deck. An anchor hawse at the bow of the keel. The bridge glass at the bow: a tall wall of gridded lancet panes.',
       mat_primary='Painted timber.', mat_secondary='Brass, glass, forged iron, slate.', finish='Satin paint, slightly weathered.',
       texture='Planking seams and paint texture.', reflectivity='Low; brass and glass soft.',
       materials=['white-painted timber', 'brass', 'glass', 'forged iron', 'slate roofing'],
       color='Hull white with slate-grey nave roofs and brass details.', condition='Well kept, eight hundred years of the same pattern.',
       history=['paint weathered on the keel', 'brass worn at the bridge rails'],
       markers=['the single tall spire mid-ship carrying the great white banner', 'three rows of lancet gunports each side', 'the glazed lancet bridge at the bow', 'the keel shaped like an upturned roof'],
       components=[C('HULL AND KEEL', 'Long narrow hull, keel like an upturned pitched roof.', 'Bottom.', 'Painted timber, iron straps.', 'Hull white.', '320 m long.'),
                   C('NAVE', 'Long nave with lancet windows and buttresses, slate roof.', 'On the deck, most of the length.', 'Painted timber and slate.', 'White, slate roof.', '200 m long.'),
                   C('SPIRE', 'One tall slender spire with the great white banner.', 'Mid-ship.', 'Painted timber.', 'White.', '110 m tall.'),
                   C('BRIDGE', 'Glazed bow with tall gridded lancet glass.', 'The bow.', 'Timber, brass, glass.', 'White and brass.', '30 m wide.')],
       height='About 150 m from keel to spire tip.', width='About 40 m.', depth='About 320 m long.', weight='Immense, yet it hangs as if weightless.',
       state='Hanging level, gunports closed, banner hanging from the spire, anchor stowed.',
       detail='the glazed lancet bridge at the bow and the first row of gunports below it', physics=SHIP_PHYSICS, negative=SHIP_NEG),
    mk(code='V02', slug='ship-of-the-line', name='A SHIP OF THE LINE (CASSIEL\'S SHIP IS ONE)', shots='8, 10, 11.19', refs=[R_E10, R_E11],
       prop='A standard ship of the line of the fleet of Orison: a smaller sister of the flagship', owner='The fleet; the second ship of the line is Cassiel\'s',
       region=FLEET, function='A gunship of the line, hundreds in the fleet, rank above rank.',
       story=SHIP_STORY + ' Cassiel\'s ship does not strike its colours; it turns, alone, and climbs back into the cloud.',
       type='An air-ship of the line built like a church.', shape='The flagship\'s pattern, shorter: a narrow hull with a keel like an upturned roof, a nave with lancet windows, one spire, a small glazed bow.',
       proportions='About seven times as long as wide.', dimensions='About 180 m long, 25 m wide; spire about 60 m.',
       primary_color='Hull white #E9E6DE.', secondary_color='Slate roofs, brass, iron.',
       construction='As the flagship.', geometry='Two rows of lancet gunports each side; one spire with a white banner; one signal post with a lancet-tipped arm on the deck near the bow; an anchor hawse in the keel.',
       mat_primary='Painted timber.', mat_secondary='Brass, glass, iron, slate.', materials=['white-painted timber', 'brass', 'iron', 'slate'],
       color='Hull white, slate roofs, brass.', condition='Well kept.', markers=['one spire with a white banner', 'two rows of lancet gunports', 'one signal post near the bow', 'the upturned-roof keel'],
       components=[C('HULL', 'Narrow hull, upturned-roof keel.', 'Bottom.', 'Timber.', 'White.', '180 m.'), C('NAVE AND SPIRE', 'Nave with lancets, one spire.', 'Deck.', 'Timber, slate.', 'White.', 'Spire 60 m.'), C('SIGNAL POST', 'White mast, lancet-tipped arm, brass lamp.', 'Deck, near the bow.', 'Timber, brass.', 'White and brass.', '6 m.')],
       height='About 85 m.', width='25 m.', depth='180 m long.', weight='Immense.', state='Hanging level, ports closed, banner up, signal arm down.',
       detail='the signal post on the deck and the spire\'s banner', physics=SHIP_PHYSICS, negative=SHIP_NEG),
    mk(code='V03', slug='small-ship', name='THE SMALL SHIP THAT ANCHORS FIRST', shots='10.6', refs=[R_E10, R_E11],
       prop='One of the fleet\'s smallest ships: a chapel-sized hull, far down the line', owner='The fleet', region=FLEET,
       function='A light ship of the line.', story=SHIP_STORY + ' After Cassiel signals fire and no gun answers, this small ship lets go its anchor first, and then the sky rains iron.',
       type='A small air-ship built like a chapel.', shape='A short hull with an upturned-roof keel, a small chapel-like cabin with lancet windows, a short spire.',
       proportions='About four times as long as wide.', dimensions='About 45 m long, 11 m wide; spire about 18 m.',
       primary_color='Hull white.', secondary_color='Slate roof, iron.', construction='As the larger ships.',
       geometry='One row of four lancet gunports each side; a short spire with a small white banner; an anchor hawse.',
       mat_primary='Painted timber.', materials=['white-painted timber', 'iron', 'slate'], color='Hull white, slate roof.', condition='Well kept, a little weathered.',
       markers=['one short spire', 'four lancet gunports each side', 'the small chapel cabin', 'the upturned-roof keel'],
       components=[C('HULL', 'Short hull, upturned-roof keel.', 'Bottom.', 'Timber.', 'White.', '45 m.'), C('CHAPEL CABIN AND SPIRE', 'Small cabin with lancet windows, a short spire.', 'Deck.', 'Timber, slate.', 'White.', 'Spire 18 m.')],
       height='About 28 m.', width='11 m.', depth='45 m.', weight='Heavy.', state='Hanging level, anchor stowed.',
       detail='the anchor hawse in the keel', physics=SHIP_PHYSICS, negative=SHIP_NEG),
    mk(code='V04', slug='cutter', name='THE NAVAL CUTTER', shots='5.1 to 5.3, 6.1 to 6.3', refs=[R_E10, R_E11],
       prop='The small fast ship that carries the Grand Admiral down to the ground', owner='The fleet', region=FLEET,
       function='A courier and passenger ship; it can set down on level ground.', story='Serath has never seen her kingdom from below. The cutter drops out of the cloud beneath it, the only white thing in the frame, and sets her down in the Treaty House yard.',
       type='A small air-ship built like a covered boat with a chapel roof.', shape='A slim pointed hull with an upturned-roof keel and two short landing skids, an open deck aft, a small enclosed cabin with lancet windows forward, a low stubby spire.',
       proportions='About five times as long as wide.', dimensions='About 24 m long, 5 m wide.', primary_color='Hull white.', secondary_color='Brass rails, slate roof on the cabin.',
       construction='Painted timber, brass rails, iron skids.', geometry='Two iron landing skids under the keel; a short gangway that folds down from the side; no guns.',
       mat_primary='Painted timber.', mat_secondary='Brass, iron.', materials=['white-painted timber', 'brass', 'iron'], color='Hull white, brass rails.', condition='Well kept.',
       markers=['two iron landing skids', 'the folding side gangway', 'the small lancet-windowed cabin forward', 'no gunports'],
       components=[C('HULL AND SKIDS', 'Slim hull, two iron skids.', 'Bottom.', 'Timber, iron.', 'White, black iron.', '24 m.'), C('CABIN', 'Small cabin with lancet windows and a slate roof, a stubby spire.', 'Forward.', 'Timber, slate.', 'White.', '8 m.'), C('GANGWAY', 'A short folding gangway.', 'Side, amidships.', 'Timber, brass.', 'White.', '3 m.')],
       height='About 9 m.', width='5 m.', depth='24 m.', weight='Light for a ship.', state='Hanging just above the floor on its skids\' height, gangway up.',
       moving=dict(parts=['the side gangway'], resting='folded up against the hull', range='folds down to the ground', pivot='a hinge at the deck edge'),
       detail='the landing skids and the folded gangway', physics=SHIP_PHYSICS, negative=SHIP_NEG + ['cannon']),
    mk(code='V05', slug='bell-barge', name='THE FLEET BARGE THAT LIFTS THE BELL', shots='1.4 to 1.9', refs=[R_E10, R_E11, ('refs/PROP_P01_marriage-bell.jpg', 'the approved marriage bell', 'the bell slung beneath the barge, at its true size')],
       prop='A heavy lifting barge of the fleet, with the ninety-ton marriage bell slung beneath it in chains', owner='The fleet', region=FLEET,
       function='Lifts and sets down great weights: here, the new bell, lowered into the cathedral\'s open tower.', story='The barge lets go, its chains fall slack, the bell settles onto the cathedral\'s own beam, and the kingdom takes its weight. Ninety tons; in Anvil Vale, the same hour, a mountain falls.',
       type='A broad, flat-bottomed air-barge with a lifting frame.', shape='A wide, shallow white hull with an upturned-roof keel; on deck, a tall white timber lifting frame like an open bell-cote, with great iron chains running down through the hull to a cradle that holds the bell beneath.',
       proportions='About twice as long as wide.', dimensions='About 60 m long, 30 m wide; the bell 6 m tall beneath.',
       primary_color='Hull white.', secondary_color='Dark chain iron; the bell\'s dark bronze.', construction='Painted timber, iron chains and cradle.',
       geometry='Four great chains from the lifting frame to an iron cradle round the bell\'s shoulder. A small spire at one end of the frame.',
       mat_primary='Painted timber.', mat_secondary='Forged iron chain; the bronze bell.', materials=['white-painted timber', 'forged iron chain', 'cast bronze bell'],
       color='Hull white, black iron, dark bronze.', condition='Working ship, well kept.',
       markers=['the open lifting frame like a bell-cote on deck', 'four chains to an iron cradle', 'the bell hanging beneath', 'the wide shallow hull'],
       components=[C('HULL', 'Wide shallow hull.', 'Top.', 'Timber.', 'White.', '60 × 30 m.'), C('LIFTING FRAME', 'Tall open timber frame.', 'On deck.', 'Painted timber.', 'White.', '25 m tall.'), C('CHAINS AND BELL', 'Four chains to an iron cradle holding the bell.', 'Beneath.', 'Iron, bronze.', 'Black and dark bronze.', 'Bell 6 m.')],
       height='About 50 m with the bell.', width='30 m.', depth='60 m.', weight='The bell is ninety tons.', state='Hanging level, the bell slung beneath in its chains, chains taut.',
       detail='the iron cradle round the bell\'s shoulder', physics=SHIP_PHYSICS + ['the chains hang taut and straight under the bell\'s weight'], negative=SHIP_NEG),
    mk(code='V06', slug='six-kingdoms', name='THE SIX OTHER KINGDOMS', shots='11.16 to 11.19 (far on the horizon)', refs=[('refs/ENV_E12_orison-whole.jpg', 'Orison seen whole (approved location)', 'the kind of thing a kingdom is: a city of white stone on a mountain of raw rock hanging in the air; the other six differ in shape')],
       prop='The six other floating kingdoms of the Ascension, each a city on a mountain of rock in the sky, shown side by side for reference', owner='The six other kingdoms (still in the air)', region='The sky over the ground (an invented world).',
       function='Seen only far away, on the horizon, in the last sun, with signal lamps passing between them.', story='When Orison has landed, six more are still in the air; a lone white ship climbs toward the nearest.',
       type='Six floating kingdoms, each a city on an inverted mountain of rock, shown as six small elevations in a row.',
       shape='Each a different silhouette: one tall and needle-towered, one long and low with terraces, one domed, one stepped like a ziggurat, one ringed by walls, one with a single great tower. All white stone above, raw dark rock below.',
       proportions='Each about as wide as it is tall, rock included.', dimensions='Each between eight and fifteen miles across.',
       primary_color='White and pale stone cities.', secondary_color='Dark raw rock undersides.', construction='Stone cities on floating rock.',
       geometry='Six clearly different city silhouettes in one row, the same scale, each with its rock underside and a few hanging chains.',
       mat_primary='White stone.', mat_secondary='Raw dark rock.', materials=['white stone', 'raw dark rock'], color='White cities, dark rock.', condition='Ancient, kept.',
       markers=['six distinct silhouettes', 'each on an inverted mountain of rock', 'white above, dark below', 'none of them glows'],
       components=[C('CITIES', 'Six different white stone cities.', 'Above each rock.', 'Stone.', 'White.', 'Each 8 to 15 miles.'), C('ROCK UNDERSIDES', 'Inverted mountains of raw rock with roots and chains.', 'Beneath each city.', 'Rock.', 'Dark.', 'Each as deep as the city is wide.')],
       height='Each several miles.', width='Each 8 to 15 miles.', depth='Same.', weight='Immense.', state='Hanging in the air, in even neutral light.',
       detail='the underside of one kingdom with its hanging chains', physics=['they hang still with no visible means', 'no glow, no lights'],
       negative=['glowing cities or lights', 'fantasy-game castles', 'identical copies of Orison', 'clouds hiding them']),
]

SECONDARY = [
    mk(code='P13', slug='petal-basket', name='THE PETAL GIRL\'S BASKET', shots='1.2, 1.7',
       prop='A small basket of white petals carried by the petal girl at the wedding', owner='The petal girl', region=ABOVE,
       function='Holds the petals she strews; it slips from her hands and drifts, and Serath catches it without looking.', story='Above, everything falls slowly: the basket leaves her hands and drifts.',
       type='A small round hand basket with one arched handle.', shape='A shallow round basket with a single arched handle.', proportions='Twice as wide as deep.', dimensions='About 24 cm across, 10 cm deep; handle 18 cm high.',
       primary_color='Pale cream woven cane.', secondary_color='White petals.', construction='Finely woven pale cane, a wrapped handle.', geometry='A tight, even weave; a plain rim; the handle wrapped in white ribbon.',
       mat_primary='Woven cane.', mat_secondary='White ribbon; white petals.', materials=['pale woven cane', 'white silk ribbon', 'white petals'],
       color='Pale cream cane, white ribbon, white petals; never red or pink petals.', condition='New, made for the wedding.',
       markers=['the white-ribbon-wrapped handle', 'the even pale weave', 'heaped white petals'],
       components=[C('BASKET', 'Shallow round woven basket.', 'Bottom.', 'Cane.', 'Pale cream.', '24 cm.'), C('HANDLE', 'Arched, ribbon-wrapped.', 'Top.', 'Cane and ribbon.', 'White.', '18 cm.'), C('PETALS', 'Loose white petals heaped.', 'Inside.', 'Petals.', 'White.', 'Each 2 to 3 cm.')],
       height='About 28 cm with the handle.', width='24 cm.', depth='24 cm.', weight='Very light.', state='Full of white petals, upright.',
       detail='the ribbon-wrapped handle and the petals', physics=['the petals rest in the basket', 'light, delicate weave']),
    mk(code='P14', slug='warrant-stones', name='THE STONES ON THE WARRANTS', shots='7.6, 7.7',
       prop='Three of the stones that hold down the warrants on the Treaty House floor: a hearthstone, a roof slate and the corner of a doorstep', owner='The people of the bearing-lands', region=GROUND,
       function='Each holds down one warrant; each came from a house that the warrant\'s weight destroyed.', story='Hundreds of warrants, each held down by a stone from a place it fell on. Thirty years of her hand.',
       type='Three broken pieces of houses, shown together.', shape='A square-ish hearthstone fragment blackened on one face; a broken grey roof slate with a nail hole; the broken corner of a worn stone doorstep.',
       proportions='Each about hand to forearm size.', dimensions='Hearthstone 25 × 20 × 6 cm; slate 30 × 18 × 1.5 cm; doorstep corner 22 × 18 × 12 cm.',
       primary_color='Dark grey and brown-grey stone.', secondary_color='Soot black on the hearthstone.', construction='Natural stone, cut by masons long ago, broken recently.',
       geometry='The hearthstone soot-black on its top face; the slate with one square nail hole and a chipped edge; the doorstep corner with a worn, rounded tread edge.',
       mat_primary='Sandstone, slate, limestone.', materials=['soot-blackened sandstone', 'grey roof slate', 'worn limestone'],
       color='Greys and browns; soot black.', condition='Old, newly broken.', markers=['the soot-black face of the hearthstone', 'the nail hole in the slate', 'the worn tread edge of the doorstep'],
       components=[C('HEARTHSTONE', 'Square-ish fragment, soot on top.', 'Left.', 'Sandstone.', 'Brown-grey, black top.', '25 cm.'), C('ROOF SLATE', 'Broken slate with a nail hole.', 'Middle.', 'Slate.', 'Blue-grey.', '30 cm.'), C('DOORSTEP CORNER', 'Corner with a worn tread.', 'Right.', 'Limestone.', 'Pale grey.', '22 cm.')],
       height='Up to 12 cm.', width='Up to 30 cm.', depth='Up to 20 cm.', weight='Heavy stones.', state='The three lying side by side.',
       detail='the worn tread edge of the doorstep corner', physics=['real broken stone edges', 'lying flat on the floor']),
    mk(code='P15', slug='spears', name='THE SPEARS OF THE GROUND', shots='6.3 to 6.5, 8.5, 11.13',
       prop='The plain spear Marl hands out in the Treaty House yard, and the bundle she hands them from', owner='The armies of the ground; the farmer holds one', region=GROUND,
       function='A thrusting spear for farmers made soldiers.', story='She puts one into the farmer\'s hands. At the end his knuckles are white on it; the spear does not move.',
       type='A long spear, and a tied bundle of the same spears.', shape='A straight ash shaft with a leaf-shaped iron head on a socket, a plain iron butt cap.',
       proportions='Long and thin.', dimensions='About 2.4 m long; head 25 cm.', primary_color='Pale grey-brown ash wood.', secondary_color='Dark forged iron.',
       construction='Hand-shaved ash shaft; forged iron head riveted through its socket; iron butt cap.', geometry='Some heads forged from strips of white-painted hull-plate, a fleck of white paint still on them; the shafts unvarnished, hand-shaved facets visible.',
       mat_primary='Ash wood.', mat_secondary='Forged iron.', materials=['ash wood', 'forged iron, some from hull-plate'],
       color='Pale ash, dark iron, a fleck of white paint on some heads.', condition='New-made, rough.', markers=['leaf-shaped head on a socket with one rivet', 'hand-shaved shaft facets', 'a fleck of white hull paint on the head', 'the bundle tied with rope'],
       components=[C('SPEAR', 'One spear lying full length.', 'Top of the sheet.', 'Ash and iron.', 'Pale wood, dark iron.', '2.4 m.'), C('BUNDLE', 'About twelve spears tied with rope.', 'Below.', 'Ash, iron, rope.', 'Same.', '2.4 m.')],
       height='Lying: 10 cm.', width='2.4 m.', depth='Bundle 30 cm across.', weight='About 2 kg each.', state='One spear lying flat; the bundle lying beside it.',
       detail='the leaf head with its rivet and the fleck of white paint', physics=['straight shafts', 'rope tight round the bundle']),
    mk(code='P16', slug='ox-and-yoke', name='THE OX OF ANVIL VALE AND ITS YOKE', shots='2.5, 2.6',
       prop='The farmer\'s ox and its wooden yoke', owner='The farmer', region=GROUND,
       function='Pulls the plough; it drags at its rope before the mountain falls.', story='The causes come first: the trembling water, the ox, the crows, a line of dust.',
       type='A living working ox with a wooden neck yoke, shown as an animal reference.', shape='A heavy, low-built ox, short horns, a deep chest; a single carved wooden yoke over its neck with a rope.',
       proportions='Long-bodied and heavy.', dimensions='About 1.4 m at the shoulder, 2.6 m long.', primary_color='Dusty grey-brown coat.', secondary_color='Dark worn wood yoke; hemp rope.',
       construction='A real animal; the yoke carved from one piece of wood, pegged, with an iron ring.', geometry='Short forward-curving horns; a pale muzzle; the yoke worn smooth where it sits; a hemp lead rope.',
       mat_primary='Living animal.', mat_secondary='Wood, iron, hemp.', materials=['a real ox', 'carved wood', 'iron ring', 'hemp rope'],
       color='Grey-brown, dusty.', condition='A working animal, strong, thin.', markers=['short forward-curving horns', 'the pale muzzle', 'the worn single yoke with an iron ring', 'the hemp lead'],
       components=[C('OX', 'Heavy working ox.', 'Whole sheet.', 'Animal.', 'Grey-brown.', '1.4 m at shoulder.'), C('YOKE', 'Carved single neck yoke, iron ring.', 'On the neck.', 'Wood, iron.', 'Dark wood.', '1 m wide.')],
       height='1.4 m at the shoulder.', width='About 70 cm.', depth='2.6 m.', weight='About 700 kg.', state='Standing square, head level, the yoke on its neck.',
       detail='the yoke where it sits on the neck, with its iron ring', physics=['a real animal\'s weight and stance', 'the rope hangs naturally'], negative=['a cartoon animal', 'decorations or bells']),
    mk(code='P17', slug='banners', name='THE BANNERS OF THE SEVEN KINGDOMS', shots='1.3, 10.20',
       prop='The seven long banners of the seven kingdoms that hang in the Cathedral of the Ascension', owner='The seven kingdoms; the cathedral', region=ABOVE,
       function='Hang from the high galleries at the wedding.', story='They have floated for eight hundred years; when the kingdom lands they drop and hang straight.',
       type='Seven long cloth banners, shown hanging side by side.', shape='Long narrow rectangles with a pointed lower end, hanging from plain white rods.',
       proportions='About one to six.', dimensions='About 1.2 m wide, 7 m long.', primary_color='Undyed cream and pale grey cloth.', secondary_color='A woven border in mid grey, different on each.',
       construction='Fine woven cloth, hemmed, hung from white rods by loops.', geometry='Each banner differs only in its woven border: a plain band, a double band, a chevron, a step, a wave, a line of dots, a key pattern. No emblems, no colours, no words.',
       mat_primary='Fine wool and linen cloth.', mat_secondary='Painted white rods.', materials=['fine cream and pale grey cloth', 'woven grey borders', 'white rods'],
       color='Cream and pale grey, borders mid grey (as in the approved cathedral).', condition='Old, perfectly kept.', markers=['seven different woven grey borders', 'pointed lower ends', 'no emblems', 'white rods'],
       components=[C('BANNERS', 'Seven long cloths.', 'Side by side.', 'Cloth.', 'Cream and pale grey.', '7 m.'), C('BORDERS', 'Seven different woven patterns.', 'Along the edges.', 'Woven cloth.', 'Mid grey.', '10 cm wide.')],
       height='7 m.', width='About 10 m for all seven.', depth='Thin cloth.', weight='Light cloth.', state='Hanging straight down under their own weight (the landed state).',
       detail='three of the woven borders side by side', physics=['cloth hangs straight with real weight'], negative=['emblems, crests, animals', 'bright colours', 'gold thread']),
    mk(code='P18', slug='gun-and-lanyard', name='A FLEET GUN AND ITS LANYARD', shots='8.3, 10.4', refs=[R_E11],
       prop='One of the fleet\'s guns on its carriage, with the firing lanyard', owner='The gun crews', region=FLEET,
       function='A muzzle-loading cannon fired by pulling a lanyard. It never fires in this film.', story='A gunner of nineteen with the lanyard round his fist and the road in his sight; nobody will be first.',
       type='A muzzle-loading cannon on a wooden truck carriage, with a lanyard.', shape='A long dark iron barrel with reinforcing rings on a four-wheeled oak carriage, ropes and rings at the sides, a lanyard from the firing lock.',
       proportions='Long barrel, low carriage.', dimensions='Barrel about 3 m; carriage 1.5 m long.', primary_color='Dark iron barrel.', secondary_color='Pale oak carriage; hemp ropes.',
       construction='Cast iron barrel; oak carriage with iron fittings; hemp breeching rope.', geometry='A flintlock-style lock at the breech with a lanyard of thin cord running back, its end in a loop. The carriage painted white like the deck. No markings on the barrel.',
       mat_primary='Cast iron.', mat_secondary='Oak, iron, hemp.', materials=['cast iron', 'white-painted oak', 'hemp rope'],
       color='Dark iron; white-painted carriage; pale hemp.', condition='Well kept, never fired in years.', markers=['the white-painted carriage', 'the lock at the breech with its lanyard loop', 'no markings on the barrel', 'the breeching rope'],
       components=[C('BARREL', 'Long iron barrel with rings.', 'On the carriage.', 'Cast iron.', 'Dark.', '3 m.'), C('CARRIAGE', 'Four-wheeled truck carriage.', 'Beneath.', 'Oak.', 'White-painted.', '1.5 m.'), C('LANYARD', 'Thin cord from the lock, a loop at its end.', 'From the breech.', 'Cord.', 'Pale.', '3 m.')],
       height='About 1.2 m.', width='About 1 m.', depth='About 3.5 m.', weight='Several tons.', state='Run out, loaded, the lanyard slack.',
       detail='the lock at the breech with the lanyard', physics=['real iron weight', 'ropes hang naturally'], negative=['firing, smoke or flame', 'engraving']),
    mk(code='P19', slug='farmers-flask', name='THE FARMER\'S FLASK', shots='11.4',
       prop='The farmer\'s water flask, on a strap', owner='The farmer', region=GROUND,
       function='Carries water; at the end he pours from it into the bowl, and the water does not move.', story='The last pour of water in the film.',
       type='A flat round leather water flask with a wooden stopper.', shape='A flat round body of stitched leather, a short neck, a wooden stopper on a thong, a leather shoulder strap.',
       proportions='Round and flat.', dimensions='About 20 cm across, 7 cm thick.', primary_color='Dark brown leather.', secondary_color='Pale wood stopper; worn strap.',
       construction='Two discs of hardened leather stitched round the edge, a turned wooden neck and stopper.', geometry='Heavy stitching round the rim; a dark water stain at the neck; the strap knotted where it was mended.',
       mat_primary='Hardened leather.', mat_secondary='Wood, thong.', materials=['hardened leather', 'turned wood', 'leather strap'],
       color='Dark brown leather, pale wood.', condition='Old, much used, mended.', markers=['heavy stitching round the rim', 'the stopper on a thong', 'the knotted mended strap', 'the water stain at the neck'],
       components=[C('BODY', 'Flat round stitched leather body.', 'Centre.', 'Leather.', 'Dark brown.', '20 cm.'), C('NECK AND STOPPER', 'Turned wooden neck and stopper on a thong.', 'Top.', 'Wood.', 'Pale.', '5 cm.'), C('STRAP', 'Leather strap, knotted once.', 'From the shoulders of the body.', 'Leather.', 'Worn brown.', '1 m.')],
       height='About 25 cm with the neck.', width='20 cm.', depth='7 cm.', weight='About 1.5 kg full.', state='Full, stoppered, strap loose.',
       detail='the stitched rim and the stopper on its thong', physics=['the strap hangs with gravity', 'leather with real thickness']),
    mk(code='P21', slug='bell-hammer', name='THE HAMMER OF THE MARRIAGE BELL', shots='1.10', refs=[('refs/PROP_P01_marriage-bell.jpg', 'the approved marriage bell', 'the bronze and iron it belongs with, and its scale')],
       prop='The great hammer that strikes the marriage bell from outside: "a hammer the size of a door"', owner='The Cathedral of the Ascension', region=ABOVE,
       function='Hangs beside the bell on a swinging arm; drawn back and released, it strikes the bell\'s flat striking patch.', story='The bell is struck. One stroke. It does not fade.',
       type='A great swinging striker: a heavy head on a long arm pivoting from a beam.', shape='A long white timber arm with a heavy rounded head of dark iron bound in leather on the striking face, pivoting at its top on an iron pin.',
       proportions='The head about the size of a door laid on its side.', dimensions='Head about 2 m long, 1 m tall, 60 cm thick; arm about 5 m.',
       primary_color='Dark iron head.', secondary_color='White-painted timber arm; pale leather striking pad.', construction='Forged iron head bolted to a timber arm with iron straps; leather pad riveted on the face; iron pivot pin.',
       geometry='A plain rounded rectangular head; a pale leather pad on the striking face; two iron straps binding it to the arm.',
       mat_primary='Forged iron.', mat_secondary='Painted timber, leather.', materials=['forged iron', 'white-painted timber', 'thick leather'],
       color='Dark iron, white arm, pale leather.', condition='New, made with the bell.', markers=['the pale leather striking pad', 'two iron straps', 'the white timber arm', 'the pivot pin at the top'],
       components=[C('HEAD', 'Rounded rectangular iron head, leather pad.', 'Bottom of the arm.', 'Iron, leather.', 'Dark, pale pad.', '2 × 1 m.'), C('ARM', 'Long white timber arm.', 'Above the head.', 'Painted timber.', 'White.', '5 m.'), C('PIVOT', 'Iron pin through the top of the arm.', 'Top.', 'Iron.', 'Black.', '20 cm.')],
       height='About 6 m.', width='2 m.', depth='60 cm.', weight='Several tons.', state='Hanging still, vertical.',
       moving=dict(parts=['the arm on its pivot'], resting='hanging vertical', range='swings back about 60 degrees and forward to strike', pivot='the iron pin at the top'),
       detail='the leather striking pad and the iron straps', physics=['it hangs plumb from its pin'], negative=['a sledgehammer', 'a clapper inside a bell', 'a mallet']),
]
PROPS = PROPS + SECONDARY + FLEET_LIST

def current(code):
    P = next(p for p in PROPS if p['code'] == code)
    return render(P), [f for f, _, _ in P.get('refs', [])], 'prop'


def main():
    os.makedirs(OUT, exist_ok=True)
    combined = ['# The Weight of Heaven: hero prop reference prompts\n\n',
                'Twelve hero props. Each prompt fills the author\'s prop template with this film\'s bible. Generate a '
                '16:9 sheet at 2K, one candidate; where reference images are listed, attach them in order.\n']
    for P in PROPS:
        prompt = render(P)
        refs = ' · '.join(f'@Image {i} = `{f}`' for i, (f, _, _) in enumerate(P.get('refs', []), 1)) or 'none'
        head = (f"# {P['code']} — {P['name']}\n\nShots: {P['shots']}\n\n"
                f"Prompt v1. Generate: 16:9, 2K, one candidate. Reference images: {refs}.\n\n")
        body = f"```text\n{prompt}```\n"
        log = '\n## Takes\n\n(none yet)\n'
        path = os.path.join(OUT, f"PROP_{P['code']}_{P['slug']}.md")
        if os.path.exists(path):
            old = open(path).read()
            if '\n## Takes\n' in old:
                log = old[old.index('\n## Takes\n'):]
        with open(path, 'w') as f:
            f.write(head + body + log)
        combined.append('\n---\n\n' + head + body)
    with open(os.path.join(OUT, 'PROP_ALL.md'), 'w') as f:
        f.write(''.join(combined))
    print(f'{len(PROPS)} prop prompts written to {os.path.normpath(OUT)}')


if __name__ == '__main__':
    main()
