#!/usr/bin/env python3
"""Casting stills and character sheets for The Weight of Heaven.

    python3 ai-film/the-weight-of-heaven/tools/char_prompts.py

The author's character-sheet template (.claude/skills/cines-engine/assets/ai-film/character-sheet.md) builds a
three-panel sheet FROM a reference image of the character, the single source of truth. This film has no actors and no
reference photographs, so each principal is first cast as an original person: a casting still (full figure in
costume on the left, head and shoulders on the right, on the same mid-grey as the sheet), made from the bible and
the script. Once the author approves a casting still, the sheet is made from it with the template used verbatim.

Faces are proposals (design/DECISIONS.md): an original, mixed cast; the two peoples are told apart by weight, bearing,
dress and hands, as the bible says, never by ethnicity. No one is to resemble a real actor or public figure.

Writes prompts/refs/CHAR_<code>_<slug>.md (notes, the current prompt, a take log kept across runs) and CHAR_ALL.md.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(HERE, '..', 'prompts', 'refs')
SHEET_TEMPLATE = os.path.join(ROOT, '..', '..', '.claude', 'skills', 'cines-engine', 'assets', 'ai-film', 'character-sheet.md')

ABOVE = ('Orison, a kingdom of white marble floating in the cloud (an invented world, Year 800 of the Ascension; no '
         'electricity). Everyone above wears white. Sky people are narrow and upright, gloved and unhurried: nobody '
         'here has ever carried anything.')
FLEET = ('the fleet of Orison, white ships that sail the air (an invented world, Year 800 of the Ascension; no '
         'electricity). Everyone above wears white.')
GROUND = ('the ground beneath Orison, the bearing-lands of the eleven nations (an invented world, Year 800 of the '
          'Ascension; no electricity). Ground people are broad and bare-handed; everything they wear is undyed, '
          'worn and mended, and they have carried weight all their lives.')

PALETTE = ('The film\'s palette, for colour only: marble #E9E6DE, cloud #AEB4B8, slate #4B5258, rock dust #8A857B, '
           'basalt #141517; gold #C8A45A belongs only to Serath\'s collar and the cup. Cool and muted.')

P02 = ('refs/PROP_P02_gold-collar.jpg', 'the approved prop sheet of Serath\'s gold collar',
       'the collar\'s exact shape, gold and clasp, worn closed at her throat over the coat\'s standing collar; ignore the printed labels')
P03 = ('refs/PROP_P03_seal-ring.jpg', 'the approved prop sheet of her seal ring',
       'the blackened-silver signet with the anchor in a ring of seven stars, worn over the glove on her right ring finger; ignore the wax and the printed labels')


def casting(C):
    refs = ''
    if C.get('refs'):
        refs = ('\nREFERENCE IMAGES\n'
                + '\n'.join(f'@Image {i} — {what}. Use it for: {use}.' for i, (_, what, use) in enumerate(C['refs'], 1))
                + '\n')
    return f"""# THE WEIGHT OF HEAVEN — CASTING REFERENCE

## {C['name']}

Create a photorealistic casting reference photograph of an original character for the feature film THE WEIGHT OF HEAVEN. A real-looking person photographed in costume, not a render, not a painting, not concept art. The person is invented and must not resemble any real actor or public figure.
{refs}
LAYOUT
One landscape image, two panels side by side on one continuous neutral mid-grey (#808080) seamless background, with no divider line, border or gap. LEFT PANEL: the whole figure standing straight, facing the camera, arms relaxed at the sides, from the top of the head to the footwear, with a little space above and below. RIGHT PANEL: the same person, head and shoulders, facing the camera, eyes to the lens, a serious neutral expression. The same person, the same costume, the same light in both panels.

WHO
{C['who']}

WORLD
{C['world']}

FACE AND BODY
{C['face']}

HAIR
{C['hair']}

WARDROBE
{C['wardrobe']}

HANDS
{C['hands']}

BEARING
{C['bearing']} For this reference, they stand straight and neutral.

CONDITION
{C['condition']}

LIGHT AND CAMERA
Soft, even, low-contrast studio light from a large diffused source with gentle fill; true skin tone and real skin texture (pores, lines, small marks); neutral white balance. Full-frame camera, about 50 mm for the figure and 85 mm for the portrait; deep focus; sharp throughout.

COLOUR
{PALETTE}

NEGATIVE
No text, labels, captions, names, numbers or typography anywhere. No props unless listed above. No jewellery unless listed. No glamour make-up, no fashion styling, no fantasy or game costume styling, no cosplay. No medals, badges, logos or emblems unless listed. No other people. No resemblance to any real person.
"""


def sheet_prompt():
    t = open(SHEET_TEMPLATE).read()
    return re.sub(r'<!--.*?-->\s*', '', t, flags=re.S).strip() + '\n'


CHARS = [
    dict(code='C01', slug='serath', name='GRAND ADMIRAL SERATH', refs=[P02, P03],
         who='Grand Admiral of Orison\'s fleet, in her mid-fifties. Thirty years of being certain, spent in one afternoon.',
         world=ABOVE,
         face='A woman of fifty-five with deep brown skin; a long, lean face, high cheekbones, a straight nose, a firm, closed mouth; fine lines at the eyes; tall and spare, a long neck.',
         hair='Short-cropped, tightly curled black hair going steel-grey at the temples.',
         wardrobe='An ankle-length coat of heavy white wool, cut like a naval greatcoat crossed with a cassock: a high standing collar, a single row of small covered white buttons from throat to hem, long narrow sleeves. White trousers; soft white leather boots; close-fitting white kid gloves. Around her throat, over the standing collar, the rigid gold collar of office from @Image 1, closed. On the right ring finger, over the glove, the blackened-silver seal ring from @Image 2. No medals, braid, epaulettes or insignia.',
         hands='Gloved in white.',
         bearing='Narrow and upright, perfectly still, economical in every movement.',
         condition='Immaculate: nothing worn, nothing dusty.'),
    dict(code='C02', slug='karst', name='KARST',
         who='An engineer of the ground in his mid-fifties, once the empire\'s own; he drew where every warrant would fall. Too tired to be angry; he has done the sums.',
         world=GROUND,
         face='A man of fifty-six with medium-brown South Asian skin; a long, tired face, heavy-lidded dark eyes, deep lines from nose to mouth; a short grey-black beard.',
         hair='Thinning black hair gone grey, cut short, uncombed.',
         wardrobe='A long engineer\'s coat that was once white imperial wool, now worn to the grey-cream of rock dust, mended at the elbows and the hem. On the chest and on the collar, clean patches of brighter cloth where the insignia were cut away, the stitch holes still showing. A plain undyed shirt, dark wool trousers, worn and mended leather boots.',
         hands='Bare. Ink stains on the fingers of the right hand and under the nails.',
         bearing='Slightly stooped, still, watchful; a man who stands at doorways.',
         condition='Worn, mended, dusty at the hem.'),
    dict(code='C03', slug='marl', name='MARL',
         who='A fighter of the ground in her thirties, from Anvil Vale; she dug for two days. Grief that has not been given leave yet.',
         world=GROUND,
         face='A woman of thirty-four, clearly in her early thirties: young, strong, unlined but for a frown line; light brown skin with freckles; a broad face, a strong jaw, a nose broken once and healed slightly crooked, watchful grey-green eyes.',
         hair='Dark brown hair, not grey, in one thick braid. A fine powder of pale rock dust from Anvil Vale lies on the top of the hair and the braid like flour, so the dark brown shows clearly underneath it.',
         wardrobe='Armour beaten from imperial hull-plate: a breastplate, a back-plate and shoulder guards hammered from the white-painted hull plates of the sky fleet, the white paint scuffed and flaking to rust-brown metal beneath, joined with rivets and leather straps. Under it, rough undyed wool and linen in grey-brown; leather bracers; heavy boots. Everything mended.',
         hands='Bare, scarred, dirt in the knuckles.',
         bearing='Broad and planted, always with her hands on something.',
         condition='Grey with rock dust from hair to boots.'),
    dict(code='C04', slug='cassiel', name='VICE ADMIRAL CASSIEL',
         who='Vice Admiral of Orison\'s fleet, in his sixties. He has wanted the Grand Admiral\'s collar for ten years. He is not cruel; he is correct.',
         world=ABOVE,
         face='A man of sixty-three with pale olive skin; a narrow face, a high forehead, thin lips, clean-shaven, perfectly composed.',
         hair='Silver hair combed straight back, exact.',
         wardrobe='The same ankle-length white wool coat as the Grand Admiral\'s, with its high standing collar and single row of small covered white buttons, every button fastened. White trousers, soft white leather boots, white gloves. No gold collar.',
         hands='Gloved in white.',
         bearing='Upright and correct, hands behind his back.',
         condition='Immaculate.'),
    dict(code='C05', slug='hierophant', name='THE HIEROPHANT',
         who='The high priest of Orison, in his seventies. Certainty that has never been tested.',
         world=ABOVE,
         face='A man of seventy-four with light brown skin; a long face, deep-set dark eyes, a close-trimmed white beard, an untroubled face.',
         hair='White at the temples; the rest hidden under the headdress.',
         wardrobe='Layered white robes of fine wool and linen falling to the floor, wide sleeves that fall back from the forearms when he raises his arms. A tall white headdress: a plain tapering cylinder about forty centimetres high. No gold, no jewels, no crosses or religious symbols.',
         hands='Bare, soft, never worked.',
         bearing='Frontal and symmetrical, like the cathedral; arms that rise easily.',
         condition='Immaculate.'),
    dict(code='C06', slug='chancellor', name='THE CHANCELLOR',
         who='The Chancellor of Orison, in her sixties: tired and decent. She knows the cost and orders it anyway.',
         world=ABOVE,
         face='A woman of sixty-four with pale, freckled skin; a tired, kind face, grey eyes with heavy lids, fine wrinkles.',
         hair='Grey hair in one plain braid.',
         wardrobe='A plain long white robe-coat buttoned high, long sleeves, no ornament at all. White gloves; plain white shoes.',
         hands='Gloved in white.',
         bearing='Upright but tired.',
         condition='Immaculate.'),
    dict(code='C07', slug='flag-captain', name='THE FLAG CAPTAIN',
         who='Captain of the flagship, in his forties: a good officer finding out what that means.',
         world=FLEET,
         face='A man of forty-five with East Asian features; a square face, steady dark eyes, clean-shaven.',
         hair='Short black hair with a little grey.',
         wardrobe='A white wool officer\'s coat to the knee (shorter than the Grand Admiral\'s), high standing collar, single row of small covered white buttons; white trousers, white boots, white gloves.',
         hands='Gloved in white.',
         bearing='Upright; half a step behind his admiral.',
         condition='Immaculate.'),
    dict(code='C08', slug='engineer', name='THE ENGINEER OF ORISON',
         who='An old engineer of Orison who reports to the Council; he would rather not say what he has to say.',
         world=ABOVE,
         face='A man of seventy-two with ruddy pale skin; a round, worn face, white eyebrows, small careful eyes.',
         hair='Bald on top with a fringe of white hair.',
         wardrobe='Long white working robes, plainer than the court\'s, belted with a cord; the hem and the robes up to the knee grey with dust from the lower terraces: the only dirt in the chamber.',
         hands='Bare: big, careful hands.',
         bearing='Standing in the middle of a room with nothing to lean on.',
         condition='Clean above the knee, dusty below it.'),
    dict(code='C09', slug='farmer', name='THE FARMER',
         who='A farmer of Anvil Vale in his forties. After the collapse he has nothing left to protect.',
         world=GROUND,
         face='A man of forty-five with pale, weathered skin that has never seen open sun; broad and thick-set; a heavy brow, a dark beard flecked with grey.',
         hair='Dark brown hair cut short with a knife.',
         wardrobe='An undyed tunic and trousers of rough wool in grey-brown; a heavy wool overshirt patched at the shoulders; a leather belt; cloth-wrapped legs and old leather boots. Nothing dyed.',
         hands='Huge, bare, cracked.',
         bearing='Broad; a back bent by carrying all his life. When he stands he does not straighten.',
         condition='Worn and mended; a little field dirt.'),
    dict(code='C10', slug='petal-girl', name='THE PETAL GIRL',
         who='A girl of seven from Orison who strews petals at the wedding. Curious before she is afraid.',
         world=ABOVE,
         face='A girl of seven with olive skin, round cheeks, curious dark eyes.',
         hair='Dark curly hair tied back with a white ribbon.',
         wardrobe='A white dress of fine light cloth to the shin, long sleeves; white shoes.',
         hands='Bare.',
         bearing='Light on her feet.',
         condition='Immaculate.'),
    dict(code='C11', slug='gunner', name='THE GUNNER',
         who='A gunner of Orison\'s fleet, nineteen. Waiting for someone else to go first.',
         world=FLEET,
         face='A young man of nineteen with dark brown skin; slim, a narrow, boyish face.',
         hair='Short black hair.',
         wardrobe='The fleet\'s gun-crew dress: a white canvas smock with the sleeves rolled to the elbow, white trousers, a dark leather belt, soft white shoes. A short length of rope lanyard wound round his right fist.',
         hands='Bare; the lanyard round the right fist.',
         bearing='Upright, young, tense.',
         condition='Clean, a little powder-grey at the cuffs.'),
    dict(code='C12', slug='farmers-daughter', name='THE FARMER\'S DAUGHTER',
         who='The farmer\'s daughter, six, of Anvil Vale. She brings him water and keeps looking at it.',
         world=GROUND,
         face='A girl of six with pale skin, a small serious face, grey eyes; she looks like the farmer\'s child.',
         hair='Fair-brown hair in a short plait.',
         wardrobe='An undyed grey-brown wool smock over a linen shift, a small knitted shawl, small leather shoes.',
         hands='Bare.',
         bearing='Small and watchful.',
         condition='Worn, mended, clean.'),
]

# Approved casting stills, as the author approves them: code -> take tag (refs/candidates/<tag>.jpg). The sheet is
# then made from that still with the template.
APPROVED_CASTING = {c: f'{c}_t1a' for c in ('C01', 'C02', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12')}
APPROVED_CASTING['C03'] = 'C03_t2a'   # Marl recast younger, dust on dark hair

# One correction appended after the template, where the approved still has a fault the sheet should not keep.
SHEET_CORRECTIONS = {
    'C08': 'WARDROBE CORRECTION: the hem of the white robe is whole, not torn or frayed; keep the grey dust up to the knee exactly as in the reference.',
}


# Edits of a finished sheet, sent with only that sheet attached.
SHEET_EDITS = {
    'C08': dict(base='C08_t2a', text="""Edit Image 1, a three-panel character reference sheet of an old engineer in white working robes. This is a photoreal costume reference.

Keep everything exactly as it is: the three panels, the person, his face, the robes, the cord belt, the grey dust on the robes up to the knee, the shoes, the background, the light and the framing.

Change only the hem of the robe in the two full-body panels: the hem is whole and straight, neatly finished, not torn, frayed or ragged. Keep the dust on it.

No text, no labels."""),
}


def current(code):
    if code in SHEET_EDITS:
        E = SHEET_EDITS[code]
        full = f"out/refs/{E['base']}_full.jpg"
        if not os.path.exists(os.path.join(ROOT, full)):
            from PIL import Image
            Image.open(os.path.join(ROOT, f"out/refs/{E['base']}.png")).convert('RGB').save(os.path.join(ROOT, full), quality=95)
        return E['text'], [full], 'sheet-edit'
    C = next(c for c in CHARS if c['code'] == code)
    if code in APPROVED_CASTING:
        tag = APPROVED_CASTING[code]
        full = f'out/refs/{tag}_full.jpg'
        if not os.path.exists(os.path.join(ROOT, full)) and os.path.exists(os.path.join(ROOT, f'out/refs/{tag}.png')):
            from PIL import Image
            Image.open(os.path.join(ROOT, f'out/refs/{tag}.png')).convert('RGB').save(os.path.join(ROOT, full), quality=95)
        img = full if os.path.exists(os.path.join(ROOT, full)) else f'refs/candidates/{tag}.jpg'
        prompt = sheet_prompt()
        if code in SHEET_CORRECTIONS:
            prompt += '\n' + SHEET_CORRECTIONS[code] + '\n'
        return prompt, [img], 'sheet'
    return casting(C), [f for f, _, _ in C.get('refs', [])], 'casting'


def main():
    os.makedirs(OUT, exist_ok=True)
    combined = ['# The Weight of Heaven: characters\n\n',
                'Step 1, casting stills (one per principal, 16:9, 2K, one candidate); step 2, the author\'s character '
                'sheet made from the approved still.\n']
    for C in CHARS:
        prompt, imgs, kind = current(C['code'])
        refs = ' · '.join(f'@Image {i} = `{f}`' for i, f in enumerate(imgs, 1)) or 'none'
        step = 'Character sheet (the author\'s template, verbatim)' if kind == 'sheet' else 'Casting still'
        head = (f"# {C['code']} — {C['name']}\n\n{step}. Generate: 16:9, 2K, one candidate. "
                f"Images, in this order: {refs}.\n\n")
        body = f"```text\n{prompt}```\n"
        log = '\n## Takes\n\n(none yet)\n'
        path = os.path.join(OUT, f"CHAR_{C['code']}_{C['slug']}.md")
        if os.path.exists(path):
            old = open(path).read()
            if '\n## Takes\n' in old:
                log = old[old.index('\n## Takes\n'):]
        with open(path, 'w') as f:
            f.write(head + body + log)
        combined.append('\n---\n\n' + head + body)
    with open(os.path.join(OUT, 'CHAR_ALL.md'), 'w') as f:
        f.write(''.join(combined))
    print(f'{len(CHARS)} character prompts written to {os.path.normpath(OUT)}')


if __name__ == '__main__':
    main()
