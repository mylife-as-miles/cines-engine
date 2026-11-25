#!/usr/bin/env python3
"""Fill the author's environment-reference template for every location of The Weight of Heaven.

    python3 ai-film/the-weight-of-heaven/tools/env_prompts.py

Writes prompts/refs/ENV_<code>_<slug>.md (one per location: notes, the prompt, an empty take log) and
prompts/refs/ENV_ALL.md (every prompt in one file, for copying). The template's structure and wording are the
author's (.claude/skills/cines-engine/assets/ai-film/environment-reference.md). As the template asks, the title, the
COLOR IDENTITY palette, the LIGHTING DESIGN rules and the CAMERA / OPTICAL LANGUAGE package are swapped for this
film's bible (design/DECISIONS.md). Two further changes, recorded in DECISIONS: the template's generic "Examples"
lists under MATERIALS and ATMOSPHERE are replaced by each location's own, and a SCALE line is added where the bible
asks for a person in the frame. The shared blocks come from one place, so they are word for word the same in every
prompt.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'prompts', 'refs')

ABOVE_REGION = ('The Kingdom of Orison, one of seven kingdoms that float two miles up in the cloud (an invented '
                'world). Its architecture is impossible by design and explicitly required: spans too long, columns '
                'too thin, towers with open tops, nothing braced. Everything else obeys real stone, cloth and light.')
GROUND_REGION = ('The ground: the bearing-lands of the eleven nations, beneath the floating kingdom of Orison (an '
                 'invented world, built from real northern volcanic and upland country: columnar basalt, slate, '
                 'dry-stone, heavy soil).')
FLEET_REGION = ('The fleet of Orison: white ships that sail the air, built by the same hands as the cathedral '
                '(an invented world). Every ship is a church nave laid on its side: a spire for a mast, lancet '
                'gunports, a keel like an upturned roof.')
PERIOD = ('Year 800 of the Ascension. Pre-industrial: stone, bronze, brass, glass, oak, iron, chain, cloth, paper and '
          'wax. No electricity, no electric light, no radio, no engines visible, no plastic, no concrete.')

COLOUR_PALETTE = """LIGHT ABOVE, HEAVY BELOW — COOL, MUTED.

Permanent THE WEIGHT OF HEAVEN palette:

- marble #E9E6DE (never pure white)
- cloud #AEB4B8
- slate #4B5258
- rock dust #8A857B
- basalt #141517 (dark, never pure black; stone keeps its texture)

Accents, each belonging to one thing only and appearing on nothing else: gold #C8A45A (her collar, the cup) · seal red #9E2A22 (her wax seal) · vale green #5D7A4A (Sarn Vale) · lamp amber #E0A050 (Karst's lamp, the hearths) · signal white (the signal lamps)."""

COLOUR_CLOSE = """The palette should be FELT rather than displayed: cool, muted, whites holding their detail.

Never neon.

Never saturated.

Never generic teal-and-orange cinema grading."""

CAMERA = """CAMERA:
ARRI Alexa 65, large format

ASPECT RATIO:
2.39:1 (compose for a 2.39:1 frame)

LENS:
spherical large-format primes, no anamorphic

LENS CHARACTER:
clean, modern, high-resolving rendering; low distortion; no flare; no bloom"""

CAMERA_MAINTAIN = """Maintain:

- deep focus: the whole location sharp from foreground to far distance
- dimensional space
- natural microcontrast
- smooth highlight roll-off, whites holding their detail
- fine, even, film-like grain
- natural textures

The environment should look like a frame from THE WEIGHT OF HEAVEN, not a location catalogue."""

FILM_NEGATIVE = [
    'glow, beams, god rays, visible light shafts, shimmer or haze bloom (weight is invisible)',
    'lens flare, bloom, halation',
    'readable text, English or Latin lettering, numbers, signage, words on banners',
    'electric light, modern objects, plastic, concrete, steel girders, engines',
    'fire, smoke from guns, explosions',
    'fantasy-game styling, glowing runes, magic effects, crystals',
    'teal-and-orange grading',
]


def bullets(items):
    return '\n'.join(f'- {i}' for i in items)


def render(L):
    scale = f"\n\nScale: {L['scale']}" if L.get('scale') else ''
    materials_note = f"\n\n{L['materials_note']}" if L.get('materials_note') else ''
    return f"""# THE WEIGHT OF HEAVEN — ENVIRONMENT REFERENCE PROMPT

## {L['name']}

Create a photorealistic cinematic environment reference image for {L['name']}.

This is a FILM PRODUCTION LOCATION REFERENCE, not concept art, not an architectural visualization, not advertising photography.

The environment must feel physically real, inhabited, spatially coherent, and suitable for repeated use as a continuity reference across multiple generated film shots.

---

# LOCATION IDENTITY

LOCATION:
{L['location']}

COUNTRY / REGION:
{L['region']}

SETTING:
{L['setting']}

TIME PERIOD:
{L.get('period', PERIOD)}

SOCIAL / ECONOMIC CHARACTER:
{L['social']}

OVERALL FEEL:
{L['feel']}

The location should feel like a place that existed before the camera arrived.

It must not feel production-designed for symbolism.

---

# SPATIAL GEOGRAPHY

Establish clear, believable geography.

Include:

{bullets(L['geography'])}

The geography must be easy to understand and remain reproducible from different camera angles.

Do not create impossible architecture.

Do not create furniture that blocks basic movement.

Do not create a room that changes scale from one side to another.

---

# ARCHITECTURE

Preserve believable architecture appropriate to:

- country
- building age
- social class
- function
- climate

Specify:

WALLS:
{L['walls']}

CEILING:
{L['ceiling']}

FLOOR:
{L['floor']}

WINDOWS:
{L['windows']}

DOORS:
{L['doors']}

TRIM / MOULDING:
{L['trim']}

FIXTURES:
{L['fixtures']}

Architectural details should feel ordinary and regionally credible.

---

# MATERIALS + TEXTURE

Use tactile, photorealistic materials.

For this location:

{bullets(L['materials'])}

Surfaces should contain subtle wear.

Nothing should look freshly generated, pristine, glossy, or showroom-perfect unless story requires it.{materials_note}

---

# PRODUCTION DESIGN

Include only story-relevant objects.

PRIMARY OBJECTS:

{bullets(L['primary'])}

SECONDARY LIVED-IN DETAILS:

{bullets(L['secondary'])}

Objects should feel casually accumulated over time.

Avoid excessive dressing.

Avoid obvious symbolic props unless specifically requested.

The environment should remain visually usable for performance.

---

# COLOR IDENTITY

{COLOUR_PALETTE}

For this environment specifically:

DOMINANT:
{L['dominant']}

SECONDARY:
{L['secondary_colour']}

ACCENT:
{L['accent']}

NEUTRALS:
{L['neutrals']}

{COLOUR_CLOSE}

---

# LIGHTING DESIGN

LIGHT ABOVE, HEAVY BELOW.
{L['light_head']}

Primary motivated source:

{L['light_primary']}

Secondary motivated source:

{L['light_secondary']}

Maintain:

- broad soft illumination
- gentle highlight roll-off
- retained shadow information
- natural falloff
- realistic practical-light behavior
- believable exposure

For this location:

{bullets(L['light_rules'])}

No beauty lighting.

No hard artificial key unless story requires it.

No exaggerated rim light.

No glossy commercial lighting.

No glow, no beams, no god rays, no visible light shafts, no shimmer.

---

# CAMERA / OPTICAL LANGUAGE

{CAMERA}

THIS REFERENCE:
{L['lens']}

{CAMERA_MAINTAIN}

---

# COMPOSITION

Create a useful master environment reference.

Prefer:

- wide or medium-wide view
- clear room geography
- human eye-level perspective
- enough negative space to understand circulation
- major architectural anchors visible simultaneously

Do not use an extreme cinematic angle that hides geography.

The image must be useful later for generating:

- wides
- mediums
- close-ups
- reverse angles
- entrances
- exits{scale}

---

# ATMOSPHERE

Atmosphere:

{L['atmosphere']}

Physical conditions:

{bullets(L['conditions'])}

Atmosphere must emerge from physical conditions, not digital effects.

---

# REALISM LOCK

Photorealistic.

Physically believable.

Architecturally coherent.

Regionally credible.

Lived-in.

Understated.

No fantasy architecture unless explicitly required.

No impossible reflections.

No floating props.

No warped furniture.

No excessive depth-of-field blur that hides the location.

---

# CONTINUITY LOCK

The final environment must establish a stable reference for:

- architecture
- room dimensions
- major furniture
- doors
- windows
- practical lights
- material palette
- object positions
- camera geography

Future generations should be able to reproduce this exact location.

---

# NEGATIVE LOCK

Avoid:

- generic AI interiors
- luxury redesign
- excessive décor
- glossy architectural visualization
- showroom cleanliness
- extreme HDR
- oversaturation
- neon
- cyberpunk lighting
- random signage
- impossible room proportions
- duplicated furniture
- floating objects
- distorted architecture
- fisheye
- dramatic concept-art composition
{bullets(FILM_NEGATIVE + L.get('negative', []))}
"""


LOCATIONS = [
    dict(
        code='E01', slug='cathedral', name='THE CATHEDRAL OF THE ASCENSION — NAVE AND OPEN TOWER',
        scenes='1, 3, 10.20', state='Day, the wedding (scene 1). Nave empty of guests; banners, petals and the bell in place.',
        location='The Cathedral of the Ascension, at the summit of the Kingdom of Orison: the nave, the high galleries and the open bell tower',
        region=ABOVE_REGION,
        setting='cathedral interior: a long nave of slender columns open to the cloud, ending in an open-topped bell tower',
        social='The holiest and highest building of a rich, sheltered kingdom whose people have never carried anything. Cared for, unhurried, serene.',
        feel='Weightless, hushed, white on white. Vast and soft. Nothing in the room seems to weigh anything.',
        geography=[
            'the nave runs straight away from camera to the open tower at the far end; a broad pale aisle down its centre',
            'columns no thicker than a man stand in long rows either side of the aisle and climb about two hundred feet into mist; their tops are lost in it',
            'the open tower at the far end: a tall square tower open to the sky at the top, cloud visible through it, a single massive stone beam across it from which the bronze bell hangs',
            'beneath the tower, a low wide marble step where a bride and groom would kneel',
            'high galleries along both sides of the nave, open balconies of pale stone, from which petals fall',
            'tall open arches in the outer walls behind the columns: beyond them no land and no horizon, only cloud, and far off the pale shapes of white ships at anchor in the air',
            'the nave floor either side of the aisle is open standing ground for a great congregation (empty in this reference)',
            'camera positions: the aisle centre-line slightly above head height looking along; between the columns of the side aisles; the galleries looking down',
        ],
        walls='Few walls: tall open arches of pale marble between slender columns, so thin that no load seems to pass through them.',
        ceiling='None visible. The columns rise into soft mist and no vault is ever seen.',
        floor='Honed pale marble in large slabs, faintly veined, matte, not polished to a mirror.',
        windows='No glazing anywhere. Open arches onto cloud.',
        doors='None in view; the nave is open along its sides.',
        trim='Fine shallow fluting on the columns; plain capitals; no ornament heavier than a hand could lift.',
        fixtures='Long cloth banners of the seven kingdoms hanging from the galleries; the tower beam and the bell.',
        materials=[
            'honed white marble, cool on the cloud side, faintly warm where the light reaches',
            'long banners of fine undyed cream and pale grey cloth, each kingdom marked only by a different plain woven border in muted grey',
            'dark old bronze on the bell, the darkest thing in the room',
            'loose white petals',
        ],
        materials_note='Story requires it here: nothing in Orison is worn, patched or dusty. The stone is honed and cared for: soft, matte and clean, never new, glossy or plastic.',
        primary=[
            'the bronze bell, the size of a house, hanging from the stone beam of the open tower',
            'the long banners of the seven kingdoms, drifting slowly sideways from the galleries as if under water',
            'white petals in the air, falling far too slowly, many still high up',
        ],
        secondary=[
            'the low marble step beneath the tower',
            'on a gallery rail, one small gold cup of wine, the only gold in the room',
            'a few petals resting on the aisle',
        ],
        dominant='marble #E9E6DE in cloud light #F4F1EA',
        secondary_colour='cloud #AEB4B8 in the mist and the soft shadowless greys between the columns',
        accent='the dark bronze of the bell; the tiny gold cup on the gallery rail',
        neutrals='warm and cool whites; no black anywhere',
        light_head='SOFT LIGHT FROM EVERY SIDE. HIGH KEY.',
        light_primary='diffuse daylight from the cloud, coming in through the open arches on every side and down through the open tower',
        light_secondary='daylight bounced off the pale marble floor and columns, filling every shadow',
        light_rules=[
            'no cast shadows anywhere: the columns throw none on the floor',
            'whites hold their detail; nothing clips',
            'no shafts or beams from the tower: the light is everywhere at once',
            'a face would never be the brightest thing in this room',
        ],
        lens='24 mm, slightly above head height, centred on the aisle and symmetrical, looking along the nave to the open tower and the bell.',
        scale='one small figure in white stands in the aisle halfway to the tower, back to camera, so the columns read as no thicker than a person and two hundred feet tall.',
        atmosphere='Day, very still. Cloud drifts through the open arches and hides the column tops. Petals hang in the air, falling as if through water. The banners drift.',
        conditions=['cloud mist moving slowly through the arches', 'soft daylight from the whole sky', 'no wind: the banners and petals drift, never flap or swirl'],
        negative=['a vaulted ceiling', 'stained glass', 'candles, chandeliers', 'crowds or guests', 'gold anywhere but the one cup', 'red or pink petals'],
    ),
    dict(
        code='E02', slug='council-chamber', name='THE COUNCIL CHAMBER OF ORISON',
        scenes='4, 10.21', state='Day, three days after the wedding. The city is sinking: cloud rising through the lower terraces outside.',
        location='The Council Chamber of Orison, a round chamber high on the city, open to the cloud on every side',
        region=ABOVE_REGION,
        setting='round council chamber ringed with open arches, looking down over the lower terraces of the city',
        social='The seat of government of the richest kingdom in the sky: austere, plain, certain of itself.',
        feel='Cool, grey-white, quiet. Grand without weight. Something is wrong outside: the cloud is coming up.',
        geography=[
            'a round room; a ring of tall round-headed open arches all the way round, no glazing',
            'through the arches: the city falling away below in terraces and towers, and cloud rising up through the lower terraces like a tide',
            'a single long plain white stone table near the centre of the room; on it a gold cup of wine',
            'one arch on the far side, where a person can stand at the edge and look down (Serath stands here)',
            'one tall plain doorway in a short section of wall opposite that arch, with a pale door standing open (Cassiel waits here)',
            'the middle of the floor is open, with nothing to lean on (the engineer stands here)',
            'a few low plain marble benches against the piers',
            'camera positions: eye level across the table to the arches; from the far arch back to the doorway; along the ring of arches',
        ],
        walls='Slender marble piers between tall round-headed arches, open to the air.',
        ceiling='A shallow plain dome high above, pale, barely distinct from the light.',
        floor='Honed pale marble, plain, matte.',
        windows='The arches themselves; no glass.',
        doors='One tall plain doorway with a pale wooden door standing open.',
        trim='None beyond plain mouldings at the springing of the arches.',
        fixtures='The table; the low benches.',
        materials=['honed white marble', 'pale limed wood on the door', 'the gold cup and dark red wine'],
        materials_note='Story requires it here: nothing in Orison is worn, patched or dusty. Clean, honed, cared for; never glossy or new.',
        primary=['the long white stone table', 'the gold cup of wine on it, its surface visible', 'the ring of open arches onto the cloud'],
        secondary=['the low marble benches', 'outside, distant bell towers of the city', 'the lower terraces going under the cloud'],
        dominant='marble #E9E6DE and cloud #AEB4B8',
        secondary_colour='slate #4B5258 in the rising cloud below',
        accent='gold #C8A45A: the cup, and nothing else',
        neutrals='cool greys and whites',
        light_head='SOFT LIGHT FROM EVERY SIDE. HIGH KEY, COOLER AND GREYER THAN THE CATHEDRAL.',
        light_primary='diffuse grey cloud light through all the arches at once',
        light_secondary='soft bounce from the marble floor and the white table',
        light_rules=['no hard shadow', 'the cup is lit softly from every side', 'a slightly greyer, cooler day than the wedding'],
        lens='28 mm, slightly above head height, looking across the table and the cup to the far arch and the city below.',
        scale=None,
        atmosphere='A grey day. Cloud is welling up from below through the lower terraces and drifting in at the foot of the arches.',
        conditions=['cloud rising from below the city', 'flat grey cloud light', 'still air'],
        negative=['a council of people', 'thrones', 'gold anywhere but the cup', 'glass in the arches'],
    ),
    dict(
        code='E03', slug='anvil-vale', name='ANVIL VALE — A FIELD AND A HOUSE BUILT TO BEAR',
        scenes='2', state='Day, before the collapse. The mountain whole.',
        location='A field in Anvil Vale, a bearing-land beneath Orison, at the foot of the mountain the valley is named for',
        region=GROUND_REGION,
        setting='a ploughed field, a low stone farmhouse and a dry-stone wall, at the foot of a flat-topped mountain',
        social='Poor farming people who have carried the kingdom\'s weight all their lives. Everything is built to bear and everything has been mended.',
        feel='Quiet, heavy, low, oppressive. Nobody here stands straight.',
        geography=[
            'a ploughed field of dark furrows running away from camera toward the mountain',
            'a low dry-stone wall across the foreground, waist high, wide and flat-topped',
            'to one side, the farmhouse: low, of rough dark stone, buttressed like a fort with thick sloping buttresses, walls leaning inward, wider at the bottom than the top, a low heavy slate roof weighted with stones, one small dark door',
            'across the field, the mountain: broad, flat-topped and sheer-faced, like an anvil',
            'overhead, a low grey sky, and in it one far darker shape covering half of it: the underside of the kingdom, very high, soft in the haze',
            'at the end of a furrow, a wooden plough and an ox yoke resting on the ground',
            'a worn path from the house to the field',
            'camera positions: low, at the eye level of a bent back; from the wall across the field to the mountain; from the house door',
        ],
        walls='Rough dark fieldstone, thick, laid dry, leaning inward, buttressed.',
        ceiling='Open-air: a low grey overcast, with the dark underside of the kingdom covering half the sky. No blue anywhere.',
        floor='Heavy dark soil in furrows; trampled grass at the edges of the field.',
        windows='Few, small and deep-set in the farmhouse walls.',
        doors='One low, heavy wooden door, dark, mended with iron straps.',
        trim='None. Heavy slate lintels.',
        fixtures='Buttresses; a slate roof weighed down with stones; a stone trough by the house.',
        materials=['rough dark fieldstone and slate', 'heavy dark wet soil', 'undyed timber rubbed pale by hands', 'forged iron straps and tools', 'coarse grass'],
        primary=['the buttressed farmhouse', 'the anvil mountain', 'the dry-stone wall in the foreground'],
        secondary=['the wooden plough and ox yoke', 'a stone water trough', 'a worn footpath', 'a few crows on the furrows'],
        dominant='slate #4B5258 and under-light grey #7F8A90',
        secondary_colour='rock dust #8A857B and dark soil',
        accent='none in the location itself',
        neutrals='basalt-dark #141517 in the shadows, never pure black',
        light_head='LOW LIGHT UNDER A DARK ROOF. LOW CONTRAST.',
        light_primary='grey daylight coming in low from the horizon, under the kingdom',
        light_secondary='soft overcast sky-light, a stop under',
        light_rules=['light reaches faces and walls from the side, never from above', 'the top of the frame is always darker than the bottom', 'no sunlight, no cast shadows'],
        lens='28 mm, low, about the height of a bent back, locked off, looking across the wall and the field to the mountain, the house to one side.',
        scale=None,
        atmosphere='A still, heavy, overcast day. Low haze over the fields. Nothing moves.',
        conditions=['overcast under the kingdom', 'low haze in the valley', 'damp ground'],
        negative=['open blue sky', 'sunshine', 'a picturesque cottage', 'green lush meadow', 'the floating kingdom drawn sharp or detailed'],
    ),
    dict(
        code='E04', slug='beneath-orison', name='BENEATH ORISON — THE UNDERSIDE OF THE KINGDOM',
        scenes='5, 10', state='Day (scene 5): the cutter has just dropped out of the cloud.',
        location='The air beneath the Kingdom of Orison, just under the cloud, above the basalt plain and the Weir',
        region=GROUND_REGION + ' Above: the underside of the floating kingdom, whose impossible scale is explicitly required.',
        setting='aerial exterior: the raw rock underside of a floating kingdom, over a black volcanic plain',
        social='The side of the kingdom no one above has ever seen.',
        feel='Not beautiful. Enormous, raw, and slowly sinking.',
        geography=[
            'the top half of the frame: the underside of the kingdom fills the sky from edge to edge: raw rock in inverted crags, hanging roots, and ancient iron chains as thick as towers hanging down from it, their lower ends free in the air',
            'where the rock meets the cloud, the city itself is hidden above',
            'between the rock and the ground, one narrow band of grey daylight at the horizon',
            'below: a plain of black basalt to the horizon, in columns, like a city no one finished',
            'at the far edge of the plain, across the head of a green valley, the Weir: a long low black wall with nine arched gates',
            'beyond it, Sarn Vale: terraces, orchards, the thin smoke of many hearths',
            'a small white naval cutter, just below the rock, gives the size of everything',
            'camera position: at the cutter\'s height, level, looking along between the rock and the plain',
        ],
        walls='None: open air. The underside of the kingdom is the only structure.',
        ceiling='The underside: raw dark rock, roots and tower-thick chains, wider than the horizon.',
        floor='The basalt plain far below.',
        windows='None.',
        doors='None.',
        trim='None.',
        fixtures='The hanging chains.',
        materials=['raw fractured dark rock, damp, with earth and roots', 'old dark iron chain, each link the size of a house', 'black columnar basalt far below', 'green terraced valley in the distance'],
        primary=['the underside of the kingdom', 'the tower-thick chains', 'the basalt plain', 'the Weir and Sarn Vale at the far edge'],
        secondary=['hanging roots and earth trailing from the rock', 'the tiny white cutter'],
        dominant='slate #4B5258 and basalt #141517',
        secondary_colour='under-light grey #7F8A90 in the band of day',
        accent='vale green #5D7A4A: Sarn Vale, the only colour',
        neutrals='dark greys; the cutter is the only white',
        light_head='LOW LIGHT UNDER A DARK ROOF. LOW CONTRAST.',
        light_primary='one band of grey daylight between the rock and the plain, at the horizon',
        light_secondary='faint grey light bounced up from the plain onto the underside',
        light_rules=['the underside sits two stops under the band of day', 'the cutter is the only white', 'the valley is the only colour'],
        lens='24 mm, level at the cutter\'s height, the underside across the top of the frame, the plain and the Weir across the bottom.',
        scale='the small white cutter below the rock: the underside is hundreds of times its size.',
        atmosphere='Grey day. Mist trailing from the underside. Haze over the plain.',
        conditions=['mist and cloud clinging to the underside', 'haze over the far plain', 'no sun'],
        negative=['open blue sky', 'sunbeams', 'waterfalls pouring from the rock', 'floating rocks or debris', 'a city visible from below'],
    ),
    dict(
        code='E05', slug='basalt-plain', name='THE BASALT PLAIN',
        scenes='5, 8, 10, 11', state='Grey day under the kingdom (scenes 5 and 6). The dusk (8, 10) and last-light (11) versions are made from this one once it is chosen.',
        location='The plain beneath Orison: black basalt to the horizon, where no one lives',
        region=GROUND_REGION + ' A lava plain from an eruption eight hundred years ago: "it was stone within forty years".',
        setting='a vast, dead volcanic plain of columnar basalt',
        social='No one lives here. Neutral ground between the eleven nations and the Weir.',
        feel='Black, stone, empty, old. A city no one finished.',
        geography=[
            'level black basalt pavement, the tops of hexagonal columns, running to the horizon',
            'clusters of taller basalt columns standing at irregular heights, like the stumps of an unfinished city, breaking the horizon',
            'wide open level ground between the clusters, where an army could stand',
            'far to one side, on the lip of the plain, the Treaty House: a low, old fort',
            'on the far side, the Weir as a long low black line with nine gates',
            'overhead: the dark underside of the kingdom fills the top of the frame; there is no open sky over the plain, only a pale band at the horizon',
            'camera positions: eye level standing on the basalt; low at the edge of a column cluster',
        ],
        walls='Natural basalt columns, hexagonal, black, cracked, some standing tall, some broken off.',
        ceiling='Open-air: the dark underside of the kingdom and cloud, covering the sky. No open sky.',
        floor='Black basalt column-tops in a rough hexagonal pavement, with grey grit in the joints.',
        windows='None.',
        doors='None.',
        trim='None.',
        fixtures='None.',
        materials=['black columnar basalt, matte, with fine cracks and grey weathering', 'grey grit and rock dust in the joints', 'no vegetation'],
        primary=['the basalt pavement', 'the standing column clusters', 'the Weir and the Treaty House on the horizon'],
        secondary=['fallen column sections', 'drifts of grey grit'],
        dominant='basalt #141517',
        secondary_colour='slate #4B5258 overhead',
        accent='none',
        neutrals='rock dust #8A857B in the grit; under-light grey #7F8A90 at the horizon',
        light_head='LOW LIGHT UNDER A DARK ROOF. LOW CONTRAST.',
        light_primary='grey daylight coming in low from the horizon, under the kingdom',
        light_secondary='faint sky-light from the pale band at the horizon',
        light_rules=['the top of the frame is always dark', 'no cast shadows', 'the basalt keeps its texture; never pure black'],
        lens='24 mm, eye level, standing on the basalt, looking across the plain with the Weir on the horizon and the underside of the kingdom across the top.',
        scale='one small figure standing far off on the open basalt.',
        atmosphere='A still grey day under the kingdom. Low haze at the horizon. Dead quiet.',
        conditions=['overcast and shadowed by the kingdom', 'haze at the horizon', 'dry stone'],
        negative=['open blue sky', 'grass or plants on the plain', 'lava or glowing cracks', 'smoke or steam vents'],
    ),
    dict(
        code='E06', slug='the-weir', name='THE WEIR AT SARN',
        scenes='5, 8, 10', state='Grey day (scene 5): nine gates, two shut. Dusk versions (8, 10) are made from this one.',
        location='The Weir at Sarn: the ancient station that takes the weight of Orison, across the head of a green valley at the edge of the basalt plain',
        region=GROUND_REGION + ' The Weir belongs to neither people and is older than both.',
        setting='a colossal ancient sluice-wall of black stone across the head of a valley, with nine gates and a great wheel',
        social='Older than everyone. The wheel was added by people and has been turned by hand for eight hundred years.',
        feel='Seamless, indifferent, unexplained. Simply older than everyone.',
        geography=[
            'a wall of fused black stone, a mile long, running across the frame at the edge of the basalt plain, without a seam, a joint or a tool-mark',
            'nine gates: tall arched openings through the wall at even intervals; two are shut by flush black gate-slabs, seven are open',
            'through the open gates, the green of Sarn Vale falling away beyond',
            'nothing visible pours through the open gates, but on the ground beneath each one the grass lies combed flat in one direction, toward the vale',
            'at the foot of the wall on the plain side, by the middle gate: the wheel that works the gates, upright, forty feet across, oak and iron, its spokes worn bright by eight hundred years of hands, mounted in a heavy oak-and-iron frame bolted to the stone, its lower spokes at shoulder height',
            'a thick iron lock-pin through the frame beside the hub, holding the wheel',
            'a worn path along the foot of the wall',
            'the one road out of Sarn Vale climbs past the far end of the Weir',
            'camera positions: eye level on the plain at an angle along the wall, so several gates and the wheel read together; at the wheel; looking through an open gate into the vale',
        ],
        walls='Fused black stone, smooth and continuous like glass-dulled rock, about a hundred feet high, matte, with no joints, no courses, no wear.',
        ceiling='Open-air: the dark underside of the kingdom and cloud over the plain; grey overcast over the vale.',
        floor='Black basalt on the plain side; grass on the vale side, combed flat beneath the open gates.',
        windows='None.',
        doors='Nine arched gates, about sixty feet high; the two shut gates are flush black slabs of the same stone.',
        trim='None. The stone has no ornament and no inscription.',
        fixtures='The wheel, its frame and the lock-pin: oak and iron, made by people, plainly a later addition to the stone.',
        materials=['fused black stone: seamless, matte, no wear at all', 'dark oak, iron straps and bolts on the wheel and its frame, weathered', 'spokes worn bright and smooth by hands', 'grass combed flat', 'black basalt'],
        primary=['the mile-long wall', 'the nine gates, two shut', 'the forty-foot wheel and its lock-pin'],
        secondary=['grass combed flat beneath the open gates', 'the worn path at the foot of the wall', 'the road climbing past the far end'],
        dominant='fused black stone and basalt #141517',
        secondary_colour='slate #4B5258 overhead',
        accent='vale green #5D7A4A seen through the open gates, the only colour',
        neutrals='weathered oak brown and the bright worn grey of the spokes',
        light_head='LOW LIGHT UNDER A DARK ROOF. LOW CONTRAST.',
        light_primary='grey daylight coming in low from the horizon',
        light_secondary='brighter grey daylight in the open vale beyond the gates',
        light_rules=['the stone is not specially lit and never glows', 'nothing about the gates is luminous: the vale beyond is simply lighter than the plain', 'two kinds of making kept apart: seamless ancient stone; worn human oak and iron'],
        lens='28 mm, eye level on the plain, angled along the wall: several gates receding, the wheel near camera, the vale green through the gates.',
        scale='two small figures at the foot of the wheel.',
        atmosphere='Grey, still day. The vale beyond the gates is brighter and green.',
        conditions=['overcast', 'faint haze along the wall', 'still air; the flat grass is the only sign of anything passing'],
        negative=['water pouring through the gates', 'glowing gates, energy, portals, light inside the arches', 'runes, carvings or inscriptions on the stone', 'joints, blocks or masonry courses in the stone', 'a modern dam'],
    ),
    dict(
        code='E07', slug='sarn-vale', name='SARN VALE AND THE ONE ROAD',
        scenes='5, 8, 9, 11', state='Grey day (scene 5): the vale lived in, hearths lit. The crowded road (8, 9) and the night hearths (11) are made from this one.',
        location='Sarn Vale, the green valley below the Weir, and the one road out of it',
        region=GROUND_REGION + ' Sarn Vale is not bearing-land: nothing there is built to carry weight.',
        setting='a long green farmed valley of terraces, orchards and villages, with a single road climbing out',
        social='Forty thousand people. Ordinary farming villages, modest and settled.',
        feel='Green, alive, ordinary. The only living colour on the ground.',
        geography=[
            'from the head of the vale, a long green valley falling away from camera',
            'terraced slopes of small fields and orchards on both sides',
            'villages of modest stone houses with slate roofs scattered down the valley, thin smoke rising from many hearths',
            'the one road: a single unpaved road winding up the side of the valley toward camera and out past the far end of the Weir onto the plain',
            'at one side of the frame, the black end of the Weir wall',
            'overhead: grey overcast; the edge of the kingdom\'s shadow',
            'camera positions: eye level on the road at the head of the vale looking down the valley; from the valley floor looking up at the road and the Weir',
        ],
        walls='Ordinary dry-stone field walls and modest stone houses; no buttresses.',
        ceiling='Open-air: grey overcast, the edge of the kingdom\'s shadow at the top of the frame.',
        floor='Green fields, orchard grass, the pale dirt road.',
        windows='Small house windows in the villages.',
        doors='House doors of plain wood.',
        trim='None.',
        fixtures='Field walls, orchard rows, chimneys.',
        materials=['green grass and orchard trees', 'grey stone houses and slate roofs', 'packed pale earth on the road', 'thin grey woodsmoke'],
        primary=['the terraced green valley', 'the one road climbing out', 'the end of the Weir'],
        secondary=['orchard rows', 'hearth smoke from the villages', 'field walls'],
        dominant='vale green #5D7A4A, muted, never lush or saturated',
        secondary_colour='slate #4B5258 and rock dust #8A857B in the houses and road',
        accent='none by day',
        neutrals='grey overcast',
        light_head='LOW LIGHT UNDER A DARK ROOF. LOW CONTRAST.',
        light_primary='grey daylight, brighter than on the plain, from the open sky down the valley',
        light_secondary='soft overcast fill',
        light_rules=['the green is felt, not saturated', 'no sunshine, no cast shadows'],
        lens='35 mm, eye level on the road at the head of the vale, looking down the valley, the end of the Weir at one edge of the frame.',
        scale=None,
        atmosphere='A grey, ordinary afternoon. Smoke rising straight from the hearths.',
        conditions=['overcast', 'light haze down the valley', 'still air'],
        negative=['picture-postcard village', 'bright saturated green', 'blue sky', 'people on the road (added per shot)'],
    ),
    dict(
        code='E08', slug='treaty-house-courtyard', name='THE TREATY HOUSE — COURTYARD',
        scenes='6', state='Day, before Serath lands. The yard empty of refugees (they are added per shot).',
        location='The courtyard of the Treaty House, an old fort on the lip of the basalt plain, older than either flag',
        region=GROUND_REGION,
        setting='the dusty yard of a massive old stone fort, with a landing ground for a small airship',
        social='Neutral ground for eight hundred years; now a refuge and a muster point.',
        feel='Old, heavy, dusty, crowded with waiting.',
        geography=[
            'the yard: open ground of packed grey dust, enclosed by thick basalt walls',
            'the main building across the yard: massive sloping walls with heavy buttresses, wider at the bottom, low, one dark arched door at its centre',
            'one side of the yard is open, level ground where a small airship can set down',
            'a gate in the outer wall onto the plain',
            'overhead: the dark underside of the kingdom and cloud; the top of the frame is dark',
            'camera positions: low eye level from the landing ground toward the arched door; from the door back to the landing ground',
        ],
        walls='Massive basalt masonry, very old, worn smooth at the corners, leaning inward, buttressed.',
        ceiling='Open-air: dark underside and cloud.',
        floor='Packed grey dust and grit over old flagstones.',
        windows='A few narrow slits high in the walls.',
        doors='One dark arched doorway in the main building, its heavy door open inward; a wide gate in the outer wall.',
        trim='None; heavy stone lintels and plain arches.',
        fixtures='Buttresses; iron rings set in the wall.',
        materials=['old dark basalt masonry, worn smooth', 'grey rock dust over everything', 'dark oak door with iron bands', 'iron rings'],
        primary=['the buttressed main building and its arched door', 'the landing ground', 'the outer gate'],
        secondary=['racks or bundles of spears against a wall', 'piles of dusty bundles', 'iron rings in the wall'],
        dominant='rock dust #8A857B',
        secondary_colour='basalt #141517 in the masonry',
        accent='none',
        neutrals='under-light grey #7F8A90',
        light_head='LOW LIGHT UNDER A DARK ROOF. FLAT AND SOFT.',
        light_primary='flat grey daylight through suspended rock dust',
        light_secondary='soft bounce from the dusty ground',
        light_rules=['the arched doorway is deep shadow', 'no sunlight, no cast shadows'],
        lens='28 mm, low eye level from the landing ground, looking across the yard to the arched door.',
        scale=None,
        atmosphere='Flat grey day. Fine rock dust hanging low in the air.',
        conditions=['rock dust in the air', 'overcast', 'still'],
        negative=['a castle with turrets and flags', 'crenellations', 'banners or emblems'],
    ),
    dict(
        code='E09', slug='treaty-house-hall', name='THE TREATY HOUSE — THE HALL OF THE TREATY',
        scenes='7', state='Day, shutters open (after 7.4). The closed-shutter state is the same room in the dark.',
        location='The hall of the Treaty House: the treaty wall, the shutters, and the floor of warrants',
        region=GROUND_REGION,
        setting='a long dark stone hall inside the old fort',
        social='The place where the treaty was made. Kept by the ground; never visited from above.',
        feel='Dark, solemn, uncertain, archival. Thirty years of paper on the floor.',
        geography=[
            'one long wall is a single face of natural basalt, cut with writing in two invented scripts side by side, the same size',
            'under both, worn almost flat, runs a third, larger script of broad worn curves that belongs to neither; the two scripts were cut straight across it',
            'at the foot of that wall, on one line: seven round carved crests, then eleven square carved seals, all the same size',
            'opposite the treaty wall: one tall opening closed by heavy wooden shutters, here open, showing daylight and the black plain',
            'the floor: covered with hundreds of white paper warrants laid in rows, each held down by a stone (a hearthstone, a roof slate, the corner of a doorstep), each with one small red wax seal',
            'narrow aisles between the rows of warrants to walk along',
            'one heavy door from the courtyard in an end wall',
            'camera positions: eye level from the door end looking along the hall, the treaty wall on one side and the shutters on the other; facing the treaty wall; from the shutters back',
        ],
        walls='The treaty face is one natural slab of basalt, cut with the scripts; the other walls are dark basalt masonry.',
        ceiling='Low and heavy: dark timber beams on stone corbels.',
        floor='Old flagstones, almost entirely covered by the warrants.',
        windows='One tall opening with heavy wooden shutters, open.',
        doors='One heavy dark oak door from the courtyard.',
        trim='None.',
        fixtures='Iron brackets on the walls, empty (no lamps lit).',
        materials=['natural basalt cut with fine chiselled letters', 'dark masonry', 'old timber', 'white rag paper, slightly curled', 'small red wax seals', 'assorted stones: hearthstone, slate, broken doorstep'],
        primary=['the treaty wall with its two scripts and the worn third beneath', 'the seven crests and eleven seals on one line', 'the floor of warrants under stones'],
        secondary=['the open shutters', 'the narrow aisles between the rows', 'iron brackets'],
        dominant='basalt #141517',
        secondary_colour='paper white, close to marble #E9E6DE',
        accent='seal red #9E2A22: hundreds of small red wax seals on the floor',
        neutrals='slate #4B5258 in the shadows',
        light_head='LOW KEY, ABOUT TWO STOPS UNDER.',
        light_primary='grey daylight from the open shutters, falling across the floor of paper',
        light_secondary='spill from the door; nothing else',
        light_rules=['the paper takes the light and the basalt does not', 'most of the treaty wall stays in the dark, its letters read by raking light only', 'no lamps lit'],
        lens='50 mm, eye level from the door end, looking down the hall: the treaty wall on one side, the open shutters on the other, the floor of warrants between.',
        scale=None,
        atmosphere='Dim and still. Dust in the air near the shutters, not lit as beams.',
        conditions=['daylight from one opening', 'dust settled on the paper edges', 'cool still air'],
        negative=['readable letters of any real alphabet in the scripts', 'Latin, Greek, runes or Chinese characters', 'lit lamps or candles', 'light beams through the shutters', 'warrants without stones'],
    ),
    dict(
        code='E10', slug='flagship-bridge', name='THE FLAGSHIP OF ORISON — THE BRIDGE',
        scenes='9', state='Dusk. No light inside: everything lit by the dusk through the glass.',
        location='The bridge of the flagship of the fleet of Orison, in the air at dusk',
        region=FLEET_REGION,
        setting='the command bridge of a great white ship of the air: brass, glass, quiet',
        period=PERIOD,
        social='A navy run like a church: ordered, ceremonial, silent.',
        feel='Brass, glass, quiet. A hundred people at their stations and no one speaking.',
        geography=[
            'a long high bridge; the forward wall is tall windows divided by slender mullions into a grid, and there is glass overhead',
            'through the forward glass: the fleet in ranks at dusk under the amber underside of the cloud',
            'overhead, through the glass roof: the roots of Orison hanging low',
            'the chart table: a broad table with a brass edge in the centre near the glass',
            'the sighting glass: a long brass telescope on a pedestal at the forward glass',
            'stations along both sides: brass speaking tubes, signal-record desks, a signal station facing a side window',
            'camera positions: eye level from the rear of the bridge looking forward into the glass; beside the sighting glass; across the chart table',
        ],
        walls='Pale painted panelling between the windows; slender pale stone-white ribs like a nave.',
        ceiling='Glass in a light framework of white ribs.',
        floor='Pale scrubbed deck planking.',
        windows='The forward wall of tall gridded windows; the glass roof.',
        doors='A plain door at the rear.',
        trim='Brass fittings, plain mouldings.',
        fixtures='The chart table, the sighting glass, the speaking tubes, the stations.',
        materials=['brass, worn soft at the edges', 'old glass with faint ripples', 'pale painted wood', 'scrubbed planking'],
        primary=['the gridded forward glass and the fleet beyond', 'the chart table', 'the brass sighting glass'],
        secondary=['speaking tubes', 'signal desks', 'stools at the stations'],
        dominant='dusk amber #D98A3D in the glass',
        secondary_colour='basalt-dark silhouettes of the bridge interior',
        accent='brass catching the dusk',
        neutrals='cold slate in the glass overhead',
        light_head='SILHOUETTE. THE DUSK THROUGH THE GLASS. NO LIGHT INSIDE.',
        light_primary='amber dusk light from the forward glass',
        light_secondary='cold slate light from the glass overhead',
        light_rules=['no practical lights lit', 'the interior falls to silhouette; brass picks up the dusk', 'faces would barely read'],
        lens='35 mm, eye level from the rear of the bridge, looking forward to the glass, the chart table in the middle ground.',
        scale=None,
        atmosphere='Dusk at the end of a long day. Very quiet.',
        conditions=['low amber light from beneath the cloud', 'still air inside'],
        negative=['screens, dials or electrics', 'a ship\'s wheel', 'steampunk gears and pipes', 'officers (added per shot)'],
    ),
    dict(
        code='E11', slug='gun-deck', name='THE FLEET OF ORISON — A GUN DECK',
        scenes='10.4', state='Dusk, ports open, guns run out.',
        location='A gun deck inside a ship of the line of the fleet of Orison, at dusk',
        region=FLEET_REGION,
        setting='a long low gun deck with a row of cannon at open gunports',
        social='Gun crews who have never seen the ground.',
        feel='Low, long, tense, held breath.',
        geography=[
            'a long low deck running away from camera, the hull side on one side',
            'a row of cannon on wooden carriages, each at an open lancet-shaped gunport',
            'through the ports: amber dusk light, and far below, the road out of Sarn Vale',
            'a central gangway between the guns and the inboard side',
            'low beams overhead',
            'camera positions: low, eye level along the row of guns; at one gun looking out through its port',
        ],
        walls='The hull side: pale painted timber framing, the lancet ports cut through it.',
        ceiling='Low, pale-painted deck beams.',
        floor='Scrubbed planking, worn.',
        windows='The open lancet gunports.',
        doors='A ladderway at one end.',
        trim='None.',
        fixtures='The cannon, their carriages, rope tackle, iron rings.',
        materials=['dark iron cannon', 'oak carriages', 'hemp rope', 'pale painted timber', 'scrubbed planking'],
        primary=['the row of cannon at open ports'],
        secondary=['rope tackle and iron rings', 'buckets and rammers'],
        dominant='shadowed slate and pale timber',
        secondary_colour='dusk amber #D98A3D through the ports',
        accent='none',
        neutrals='basalt-dark iron',
        light_head='DUSK THROUGH THE PORTS ONLY.',
        light_primary='amber dusk light coming in through each open port',
        light_secondary='faint bounce off the pale timber',
        light_rules=['the deck between the ports in shadow', 'no lanterns lit'],
        lens='28 mm, low eye level along the row of guns.',
        scale=None,
        atmosphere='Dusk. Dead still.',
        conditions=['dusk light from below the cloud', 'still air'],
        negative=['smoke, fire or firing', 'crew (added per shot)'],
    ),
    dict(
        code='E12', slug='orison-whole', name='THE KINGDOM OF ORISON — THE WHOLE CITY',
        scenes='10.15 to 10.23, 11.16 to 11.19', state='Blue dusk, descending, low over the plain; the last sun only on the cathedral\'s open tower.',
        location='The Kingdom of Orison seen whole, from the basalt plain, as it comes down out of the sky',
        region=ABOVE_REGION,
        setting='exterior: a floating city about twelve miles across, hanging low over the plain',
        social='Four million people; a city built tier over tier of white marble on a mountain of rock.',
        feel='Immense, quiet, coming down. The sound is not loud; it is large.',
        geography=[
            'the underside: a ceiling of raw dark rock, wider than the horizon, tapering down like an inverted mountain, roots and chains hanging from it',
            'on top, terraces of white marble climbing tier over tier, each tier an arcade of arches',
            'bridges between towers, hanging gardens trailing over the terrace edges, towers with open tops',
            'at the summit, the cathedral, its open tower holding the last of the sun',
            'mist streaming off the terraces as the city descends',
            'below: the black basalt plain, the Weir a low black line at one side',
            'camera position: eye level on the plain, far away, the whole city in frame',
        ],
        walls='Terraces of white marble arcades, tier over tier.',
        ceiling='Open-air: blue dusk sky over the city.',
        floor='The basalt plain.',
        windows='The arches of the arcades, dark inside.',
        doors='Gates at the foot of terraces.',
        trim='Thin spires and open-topped towers.',
        fixtures='Bridges, hanging gardens.',
        materials=['white marble terraces', 'raw dark rock underside', 'muted green of hanging gardens', 'black basalt plain'],
        materials_note='Story requires it here: Orison is not worn, patched or dusty.',
        primary=['the whole city with its rock underside', 'the cathedral\'s open tower at the summit'],
        secondary=['hanging gardens', 'bridges between towers', 'mist streaming off the tiers'],
        dominant='last light blue #3F556C on the plain and the city in shade',
        secondary_colour='marble #E9E6DE in shade, cool',
        accent='the last warm sun on the open tower only',
        neutrals='basalt #141517 below',
        light_head='BLUE DUSK BELOW. THE LAST SUN ONLY ON THE OPEN TOWER.',
        light_primary='blue dusk skylight',
        light_secondary='the last warm sun touching only the top of the open tower',
        light_rules=['no light comes from the kingdom itself', 'the city is in shade; only the tower is warm'],
        lens='35 mm, eye level on the plain, the whole kingdom in frame, a line of tiny figures on the plain in the foreground.',
        scale='a line of tiny standing figures on the plain in the foreground, dark against the basalt.',
        atmosphere='Blue dusk. Mist streaming off the terraces. Dust beginning to lift from the plain beneath.',
        conditions=['clear blue dusk', 'mist on the city', 'still air'],
        negative=['glowing windows or lights in the city', 'waterfalls pouring off the edges', 'anime or video-game fantasy styling', 'magic or energy beneath the city'],
    ),
    dict(
        code='E13', slug='lowest-terrace', name='THE FIRST GROUND — THE FOOT OF THE LOWEST TERRACE',
        scenes='11.1 to 11.15', state='Last light, after the landing. Open sky for the first time. Crowds on the rails added per shot.',
        location='The basalt plain at the foot of Orison\'s lowest terrace, after the city has come down',
        region=GROUND_REGION + ' The city of Orison now stands on it.',
        setting='exterior: a wall of white marble terraces standing on black basalt, a gate and a stair at its foot',
        social='The first ground both peoples have ever shared.',
        feel='Silent, open, level. A wall of white marble where this morning there was sky.',
        geography=[
            'a wall of white marble terraces rising tier over tier into the dusk, its base resting on the black basalt',
            'at the foot of the lowest terrace, an arched gate, dark inside',
            'its stair of marble steps, which ended in air for eight hundred years, now ends on the ground: the last step rests on the basalt',
            'in front of the stair, open basalt plain, dust settled in a thin even layer',
            'nearby, a great iron anchor chain hanging from far above, its anchor sunk into the plain',
            'over all, open sky for the first time: blue last light, one band of sun on the far horizon',
            'camera positions: eye level and level for both peoples, from the plain toward the stair; from the stair out across the plain',
        ],
        walls='The lowest terrace wall of white marble with a row of arches; tiers above.',
        ceiling='Open-air: open blue dusk sky.',
        floor='Black basalt with a fine layer of settled grey dust.',
        windows='The arches of the terraces.',
        doors='One arched gate at the foot of the lowest terrace.',
        trim='Plain marble balustrades on every terrace.',
        fixtures='The stair; the anchor chain.',
        materials=['white marble, now with dust at its foot', 'black basalt', 'settled grey dust', 'dark iron chain'],
        primary=['the marble terraces', 'the gate and the stair ending on the ground', 'the anchor chain'],
        secondary=['dust settled on the lowest steps', 'balustrades lining every terrace'],
        dominant='last light blue #3F556C',
        secondary_colour='marble #E9E6DE in cool shade',
        accent='none',
        neutrals='basalt #141517',
        light_head='LOW, COOL AND OPEN. BLUE LAST LIGHT.',
        light_primary='open blue dusk sky',
        light_secondary='one band of sun on the far horizon',
        light_rules=['no warm light on the marble', 'the camera is level: no low angle'],
        lens='35 mm, eye level, level, from the plain toward the stair, the terraces rising to the top of frame.',
        scale='one small figure standing on the plain near the stair, for scale.',
        atmosphere='Last light. Total stillness. Dust has settled and does not hang.',
        conditions=['clear blue dusk', 'still air', 'dust settled'],
        negative=['warm golden-hour light on the city', 'crowds on the rails (added per shot)', 'debris or damage'],
    ),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    combined = ['# The Weight of Heaven: environment reference prompts\n',
                'Thirteen locations. Each prompt fills the author\'s environment template with this film\'s bible. '
                'Generate each at 21:9 at the highest resolution, with no reference image; two to four candidates per '
                'location. The chosen image becomes @Image N for every shot set there.\n']
    for L in LOCATIONS:
        prompt = render(L)
        head = (f"# {L['code']} — {L['name']}\n\n"
                f"Scenes: {L['scenes']} · State in this reference: {L['state']}\n\n"
                f"Generate: 21:9, highest resolution, no reference image. Two to four candidates.\n\n")
        body = f"```text\n{prompt}```\n"
        log = '\n## Takes\n\n(none yet)\n'
        path = os.path.join(OUT, f"ENV_{L['code']}_{L['slug']}.md")
        if os.path.exists(path):  # keep the take log already written under the prompt
            old = open(path).read()
            if '\n## Takes\n' in old:
                log = old[old.index('\n## Takes\n'):]
        with open(path, 'w') as f:
            f.write(head + body + log)
        combined.append('\n---\n\n' + head + body)
    with open(os.path.join(OUT, 'ENV_ALL.md'), 'w') as f:
        f.write(''.join(combined))
    print(f'{len(LOCATIONS)} environment prompts written to {os.path.normpath(OUT)}')


if __name__ == '__main__':
    main()
