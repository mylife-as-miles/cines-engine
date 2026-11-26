#!/usr/bin/env python3
"""The Weight of Heaven: the v9 replacement effects. Every file in audio/sfx/v9/ is re-made from this script.

The effects review of cut v8 (edit/reviews/I_bell_v8_sound_effects.md, appendix C) lists the sounds that replace the
video model's own audio and the synthesised winds. This driver makes them, locally and for nothing, with the foundry's
own functions (tools/sfx_make.py, imported, not edited): Stable Audio 3.0 Small SFX on CPU through audio.cpp, and
earshot's catalogue for the fallbacks.

    PY=/root/leonxlnx/earshot/.venv/bin/python
    $PY tools/foundry_v9.py list                    the table: id, row, seconds asked, seeds
    $PY tools/foundry_v9.py gen [ID ...] [--all-seeds] [--part long|short]
                                                    raw Stable Audio takes -> audio/gen/ (cached, git-ignored)
    $PY tools/foundry_v9.py look ID [--seed N]      what a raw take holds: onsets, level by second (no models)
    $PY tools/foundry_v9.py audition ID [...]       every candidate of a sound, finished to /tmp and judged by earshot
    $PY tools/foundry_v9.py make [ID ...]           the delivered files -> audio/sfx/v9/<id>.flac
    $PY tools/foundry_v9.py check [ID ...]          earshot on the delivered files -> audio/sfx/v9/check.json
    $PY tools/foundry_v9.py manifest                audio/sfx/v9/manifest.json from the table, the files and check.json

The table (V9) is the plan: for each id the review's row, the prompt, the asked length, every seed tried and the
description and alternatives earshot chooses between. Under it are the candidates (`cands`), in the order they were
tried: other cuts of a take, reworded prompts, the review's fallbacks from earshot's catalogue and layered recipes.
`use` names the one that is delivered and carries the note for the mix. To rebuild: make, then check, then manifest
(make forgets a file's earlier check). Raw takes are cached by prompt, seed and length and are generated when a
recipe first asks for one, so a rebuild on the same machine is exact; on another machine the generator gives the
same take for the same seed only if audio.cpp and the weights are the same builds. A take of the same prompt and
seed at another length is a different sound.

Finishing, the same for every sound: 48 kHz (soxr), cut to the event with 50 ms kept before the first onset (padded
with silence where the take starts on the event; beds never use a take's first second), the mean and everything
under 20 Hz removed, raised-cosine fades at both ends, sample peak at -3 dBFS, 24-bit stereo FLAC. No reverb. A
filter, a change of speed, a loop or a mono bed made stereo from itself is used only where the table says so, and
the manifest says so for that file. Levels and tone are the mix's business.

What the search found, for whoever writes the next prompts: a steady noise never reads as wind to earshot, whatever
it is called (it is hiss, a waterfall or surf): the gusts carry the reading, so a wind bed cannot also be perfectly
steady. Single footsteps, clicks and peels from the generator fail when cut out alone even where the whole take
passes; the catalogue's are judged step by step in the manifest.

The earshot rule is sfx_make's (RULE): the description beats every alternative and is strong (z >= 3), or holds 60 %
of the choice and twice the best alternative. A fail is delivered as a fail.
"""
import argparse, importlib.util, json, os, sys, time

os.environ.setdefault('SFX_THREADS', '3')
HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('sfx_make', os.path.join(HERE, 'sfx_make.py'))
F = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F)

import numpy as np
import soundfile as sf

SR = F.SR
ROOT = F.ROOT
OUT = os.path.join(ROOT, 'audio', 'sfx', 'v9')
CHECK = os.path.join(OUT, 'check.json')
MANIFEST = os.path.join(OUT, 'manifest.json')
SCRATCH = os.environ.get('FOUNDRY_SCRATCH', '/tmp/foundry_v9')
PEAK_DB = -3.0
PRE = 0.050          # seconds of the take kept before a one-shot's first onset

# ------------------------------------------------------------------------------------------------- the table
# id -> row (the review's), kind ('shot' one event, 'multi' several events in one file, 'bed', 'roar' a long event
# that is also judged for realness), prompt, dur (asked), seeds (every seed of that prompt that was generated, in
# order), check (description, alternatives), and later `cands`, `use` and `note`.
# Prompts carry no negation: the text encoder ignores "no".

V9 = {}
ORDER = []


def snd(sid, row, kind, prompt, dur, seeds, check, **kw):
    V9[sid] = dict(id=sid, row=row, kind=kind, prompt=prompt, dur=float(dur), seeds=list(seeds), check=check, **kw)
    ORDER.append(sid)


FIELD_ALTS = ['static white noise hiss', 'ocean waves on a beach', 'a waterfall', 'rain']

# -- first: the three beds and the rockfall
snd('wind_vale_field', 'R17', 'bed',
    'Cold steady wind blowing across a wide open ploughed field and low stone walls, a low soft moan with slow '
    'gusts, grass hissing faintly, outdoors, wide',
    32, [917], ('wind blowing across an open field', FIELD_ALTS))
snd('wind_vale_farmland', 'R17 (alternative bed)', 'bed',
    'Open farmland under a heavy overcast sky, light steady wind over wet grass and a dry-stone wall, wide, quiet',
    32, [927, 1927, 2927], ('wind blowing across an open field', FIELD_ALTS))
snd('wind_altitude_arches', 'R18', 'bed',
    'High thin wind moaning through tall open stone arches at great height, hollow and airy, steady with slow swells',
    32, [918],
    ('wind in an open high place', ['ocean waves', 'static hiss', 'a waterfall', 'rain']))
snd('rockfall_boom', 'R1a', 'shot',
    'One enormous distant rockfall boom heard across a wide valley, a deep heavy impact that rolls like thunder and '
    'dies slowly, outdoors, far away',
    6, [901, 1901],
    ('a huge rockfall boom far away', ['a kick drum', 'a sub bass drop', 'a door slam', 'a close explosion']))
BODY_PROMPT = ('A mountainside collapsing far away: thousands of tons of rock and boulders sliding, tumbling and '
               'grinding, a continuous heavy roar of stone with cracks and knocks inside it, outdoors, heard across '
               'a valley')
BODY_CHECK = ('the roar of a rockslide, an avalanche of rock',
              ['a jet engine', 'strong wind in a microphone', 'a train passing', 'thunder', 'ocean waves'])
snd('rockfall_body_a', 'R1b', 'roar', BODY_PROMPT, 10, [911], BODY_CHECK)
snd('rockfall_body_b', 'R1b', 'roar', BODY_PROMPT, 10, [912], BODY_CHECK)
snd('rockfall_crack', 'extra (the lead\'s)', 'shot',
    'One sharp dry crack of rock splitting high on a cliff, far away, echoing across a wide valley',
    3, [931, 1931, 2931],
    ('a sharp crack of rock splitting far away, echoing across a valley',
     ['a gunshot', 'a stick snapping', 'a door slamming', 'a whip crack']))

# -- second: the valley's close sounds
snd('ox_snort', 'R2', 'shot',
    'A big ox startled, snorting and giving one short deep grunt, breath blown hard through the nose, close, '
    'outdoors in an open field',
    3, [902, 1902, 2902],
    ('an ox or a cow grunting, snorting', ['a lion growling', 'a man coughing', 'a dog barking', 'a pig oinking']))
snd('crows_burst', 'R3', 'shot',
    'Four crows bursting up off the ground together, heavy wings flapping hard, then settling again, outdoors, a '
    'few metres away',
    3, [903, 1903, 2903],
    ('birds taking off, wings flapping', ['cloth flapping', 'a whoosh', 'applause', 'paper rustling']))
snd('bowl_on_stone', 'R4', 'shot',
    'A heavy wooden bowl half full of water set down on a wet flat stone, one dull woody knock with a low thump, '
    'close, outdoors, quiet',
    2, [904, 1904],
    ('a wooden bowl set down on stone',
     ['a box lid closing', 'a metal pan clanging', 'a door knock', 'a plastic object dropped']))
snd('hoe_chop', 'R5', 'multi',
    'An iron hoe chopping into wet heavy soil, one dull earthy chop with a little grit, slow steady work, heard '
    'from far across an open field',
    4, [905, 1905],
    ('a hoe chopping into soil, far away',
     ['a stick snapping', 'a camera shutter click', 'a sword being drawn', 'a metal latch']))
snd('run_boots_mud', 'R11', 'multi',
    'A heavy man sprinting across a wet ploughed field in leather boots, fast heavy squelching footsteps in mud, '
    'close',
    6, [9111, 10111],
    ('a man running in wet mud',
     ['footsteps on a hard floor', 'sneakers squeaking on a gym floor', 'a horse galloping', 'hands clapping']))
snd('run_breath', 'R11', 'multi',
    'A man panting hard while running, heavy fast breaths, close',
    5, [9112, 10112],
    ('a man panting hard while running, out of breath',
     ['a dog panting', 'wind blowing in a microphone', 'sawing wood', 'a man snoring']))

# -- third: the rest
snd('child_steps_mud', 'R6', 'multi',
    'A small child walking slowly along a wet muddy path, light soft squelching footsteps, outdoors, a little way '
    'off',
    6, [906, 1906, 2906],
    ('light footsteps in wet mud',
     ['a clock ticking', 'footsteps on a hard floor', 'water dripping', 'paper rustling']))
snd('boots_away_mud', 'R8', 'multi',
    'A heavy man in leather boots walking away on wet muddy ground, three slow squelching steps, getting farther',
    4, [908, 1908, 2908],
    ('heavy boots walking in wet mud', ['cloth rustling', 'a horse walking', 'a knock on wood']))
snd('bowl_taken', 'R9', 'shot',
    'Small hands lifting a wooden bowl of water off a wet stone, a soft woody scrape and a little slop of water, '
    'close, quiet',
    2, [909, 1909],
    ('a wooden bowl lifted off stone, water slopping', ['a footstep', 'a door knock', 'a heavy thud']))
snd('grab_run_up', 'R10', 'shot',
    'A heavy man running up through mud and snatching up a child, two hard squelching boot steps, thick wool cloth '
    'whipping, one grunt of effort, close',
    3, [910, 1910],
    ('a man running up in heavy boots and grabbing a child, cloth and breath',
     ['a door slamming', 'a horse galloping', 'furniture moved', 'a rubber squeak']))
snd('bowl_slop', 'R11', 'multi',
    'Water slopping in a wooden bowl carried at a run, small splashes',
    4, [9113, 10113],
    ('water slopping in a wooden bowl, small splashes',
     ['rain falling', 'a tap running into a sink', 'someone swimming', 'ocean waves on a beach']))
snd('wax_press_soft', 'R12', 'shot',
    'A metal ring pressed slowly into warm soft wax, one soft thick squelch, dull, very close, quiet',
    2, [912_0, 1912_0, 2912_0],
    ('a soft wet squelch',
     ['a camera shutter click', 'a gun being cocked', 'a mouse click', 'a match being struck']))
snd('wax_peel', 'R13', 'shot',
    'A metal ring peeled slowly off sticky warm wax, one short soft tacky pull, dull, very close, quiet',
    2, [913, 1913, 2913],
    ('a small sticky peel', ['a camera shutter click', 'a keyboard key press', 'a finger snap']))
snd('bell_landing_big', 'R14', 'shot',
    'An enormous bronze bell weighing many tons dropping onto a massive oak beam in a stone tower, one colossal deep '
    'boom, the timber groaning under the load, stone dust falling, long low decay',
    6, [914, 1914],
    ('a colossal weight landing',
     ['a door closing with a latch', 'a wooden crate dropped', 'a drawer closing', 'coins dropping']))
snd('chains_heavy', 'R15', 'multi',
    'Four massive iron anchor chains going slack and swinging, huge heavy links clanking slowly against each other, '
    'deep heavy iron, in a stone tower',
    5, [915, 1915],
    ('heavy iron chains going slack', ['coins dropping', 'keys jingling', 'a door latch', 'a small light chain']))
snd('bell_ram_clang', 'R16', 'shot',
    'A huge timber and iron ram striking an enormous bronze bell once, a colossal deep metallic boom, heavy impact',
    4, [916, 1916, 2916],
    ('an enormous bronze bell struck once', ['a gong', 'a singing bowl', 'a doorbell', 'a cinematic boom']),
    probes=[('a huge heavy metallic impact, a deep clang of metal',
             ['a wooden knock', 'a kick drum', 'a door slamming', 'thunder rumbling'])])
snd('applause_gloved_vast', 'R19', 'bed',
    'Ten thousand people clapping softly in thick gloves in a vast stone cathedral, a dense dull padded patter, far '
    'away, very reverberant',
    10, [919, 1919, 2919],
    ('a huge crowd applauding softly, far away',
     ['a small group clapping', 'sharp loud hand clapping', 'rain', 'horses galloping']))
snd('bowl_buzz_on_stone', 'extra (the lead\'s)', 'multi',
    'A wooden bowl of water rattling faintly on a stone surface, a rapid tiny wooden chatter and ticking, very '
    'close, quiet',
    3, [932, 1932],
    ('a wooden bowl rattling on a stone surface, a rapid tiny wooden chatter',
     ['a phone vibrating on a table', 'a clock ticking', 'a woodpecker pecking', 'a typewriter']))

LONG = ['wind_vale_field', 'wind_vale_farmland', 'wind_altitude_arches', 'rockfall_body_a', 'rockfall_body_b',
        'applause_gloved_vast']


# ------------------------------------------------------------------------------------------------- recipes
# A candidate is a list of segments laid on the file's own clock and summed. A segment:
#   src    an int (a seed of the sound's own prompt), ('sa', prompt, dur, seed) for a reworded prompt, or
#          ('es', catalogue id, seed[, dur]) for a design from earshot's catalogue
#   a, b   the part of the source that is used, in source seconds (default: all of it)
#   trim   True (default): cut to the first onset inside a..b, keeping PRE before it (in file time, after `speed`)
#   thr    the onset threshold in dB under the part's peak (default -40)
#   len    seconds kept, in file time
#   speed  varispeed ratio (< 1 slower and lower)
#   hp, lp Butterworth corners in Hz (zero-phase); lpo the low-pass order (default 2: 24 dB an octave both ways)
#   soften sfx_make.soften's k: every peak held to k times the local 80 ms level
#   fin, fout   raised-cosine fades of the segment
#   gain   dB after the segment is normalised to its own peak;  at   where it starts in the file, seconds
#   event  False if the segment's onset is not to be listed as an event (an under-layer)
#   on     for a segment that is not trimmed: where its event starts, in segment seconds
#   width  (first segment of a bed only) (shift s, side gain): see widen()
#   loop   (length s, cross-fade s, total s): the part made into a seamless loop and repeated

def seg(src, **kw):
    return dict(src=src, **kw)


def default_recipe(s, seed):
    if s['kind'] == 'bed':
        return [seg(seed, a=1.5, trim=False, fin=0.25, fout=0.25)]
    return [seg(seed, fout=0.15)]


def source(s, src):
    if isinstance(src, int):
        x, rec = F.sa('sfx', s['prompt'], s['dur'], src, quiet=True)
        how = dict(F.sa_how('sfx', s['prompt'], s['dur'], src), **rec)
    elif src[0] == 'sa':
        x, rec = F.sa('sfx', src[1], float(src[2]), src[3], quiet=True)
        how = dict(F.sa_how('sfx', src[1], float(src[2]), src[3]), **rec)
    elif src[0] == 'es':
        sd = src[2] if len(src) > 2 else 0
        dur = src[3] if len(src) > 3 else None
        x = F.earshot_make(src[1], sd, dur)
        how = {'method': 'earshot catalogue design', 'sound': src[1], 'seed': sd, 'licence': F.LIC_EARSHOT}
        if dur:
            how['dur'] = dur
    else:
        raise ValueError(src)
    return F.stereo(x), how


def render_seg(s, g):
    x, how = source(s, g['src'])
    a = int(round(g.get('a', 0.0) * SR))
    b = int(round(g['b'] * SR)) if g.get('b') else len(x)
    x = np.array(x[a:b])
    sp = float(g.get('speed', 1.0))
    on = None
    cut = 0
    if g.get('trim', True):
        o = F.onset(x, g.get('thr', -40.0))
        need = int(round(PRE * sp * SR))
        if o < need:                          # the take starts on the event: pad, so the onset still sits at PRE
            x = np.concatenate([np.zeros((need - o, 2)), F.fade(x, 0.002, 0.0)])
            a -= need - o
            o = need
        cut = o - need
        on = (o - cut) / SR / sp
        x = x[cut:]
    if g.get('len'):
        x = x[:int(round(g['len'] * sp * SR))]
    if sp != 1.0:
        x = F.pitch_speed(x, sp)
    if g.get('hp'):
        x = F.butter(x, g['hp'], 'highpass', 2)
    if g.get('lp'):
        x = F.butter(x, g['lp'], 'lowpass', g.get('lpo', 2))
    if g.get('soften'):
        x = F.soften(x, k=g['soften'])          # sfx_make's glove: every peak held to k times the 80 ms level
    if on is None and g.get('on') is not None:
        on = float(g['on'])                   # stated by the table: where the event starts in this segment
    used = len(x) * sp / SR                   # seconds of the source that are in the segment
    if g.get('loop'):                         # a short take made long: a seamless loop of it, repeated
        length, xf, total = g['loop']
        x = np.tile(F.loopify(x, length, xf), (int(np.ceil(total / length)), 1))[:int(round(total * SR))]
    x = F.fade(x, g.get('fin', 0.004), g.get('fout', 0.08))
    x = x / max(np.abs(x).max(), 1e-12) * F.lin(g.get('gain', 0.0))
    how['used_source_s'] = [round((a + cut) / SR, 3), round((a + cut) / SR + used, 3)]
    return x, on, how


def describe_seg(g, how):
    """one line of plain words for the manifest"""
    if how['method'] == 'generated':
        t = f"Stable Audio take, seed {how['seed']}"
    else:
        t = f"earshot `{how['sound']}` (seed {how['seed']})"
    t += f", {how['used_source_s'][0]:.2f}-{how['used_source_s'][1]:.2f} s of it"
    if g.get('speed', 1.0) != 1.0:
        t += f", played at {g['speed']:g} speed"
    if g.get('hp'):
        t += f", high-pass {g['hp']:g} Hz"
    if g.get('lp'):
        t += f", low-pass {g['lp']:g} Hz ({12 * g.get('lpo', 2)} dB an octave, zero-phase)"
    if g.get('soften'):
        t += f", peaks held to {g['soften']:g} times the 80 ms level (sfx_make.soften)"
    if g.get('loop'):
        t += (f", made into a seamless {g['loop'][0]:g} s loop ({g['loop'][1]:g} s equal-power cross-fade) and "
              f"repeated to {g['loop'][2]:g} s")
    if g.get('fin', 0) >= 0.02:
        t += f", {g['fin'] * 1000:.0f} ms fade-in"
    if g.get('gain'):
        t += f", {g['gain']:+g} dB"
    if g.get('at'):
        t += f", placed at {g['at']:.3f} s"
    return t


def build(sid, recipe):
    """a candidate -> (stereo float array at the delivery level, record)"""
    s = V9[sid]
    parts, onsets, hows, lines = [], [], [], []
    for g in recipe:
        x, on, how = render_seg(s, g)
        at = float(g.get('at', 0.0))
        parts.append((at, x))
        if on is not None and g.get('event', True):
            onsets.append(round(at + on, 3))
        hows.append(how)
        lines.append(describe_seg(g, how))
    n = max(int(round(at * SR)) + len(x) for at, x in parts)
    y = np.zeros((n, 2))
    for at, x in parts:
        k = int(round(at * SR))
        y[k:k + len(x)] += x
    y -= y.mean(axis=0)
    y = F.butter(y, 20.0, 'highpass', 2)                       # DC and anything under hearing
    if recipe[0].get('width'):
        shift, side = recipe[0]['width']
        y = widen(y, shift, side)
        lines.append(f'made stereo: the side signal is the same stretch moved {shift:g} s on (wrapped, with a 0.5 s '
                     f'cross-fade at the wrap) at {side:g} of the mid, L = mid + side, R = mid - side; the mono sum '
                     f'is the bed as it was before this step (L/R correlation {np.corrcoef(y[:, 0], y[:, 1])[0, 1]:+.2f})')
    bed = s['kind'] == 'bed'
    y = F.fade(y, 0.003 if not bed else recipe[0].get('fin', 0.25), recipe[-1].get('fout', 0.08))
    gain = F.lin(PEAK_DB) / np.abs(y).max()
    y *= gain
    rec = {'layers': lines, 'sources': hows, 'onsets_s': sorted(onsets),
           'finish': f'mean and under-20 Hz removed, ends faded, gain {F.db(gain):+.1f} dB to a sample peak of '
                     f'{PEAK_DB:g} dBFS, true peak {F.db(F.true_peak(y)):+.1f} dBTP'}
    return y, rec


# ------------------------------------------------------------------------------------------------- the candidates
# Beyond one plain cut per seed: other cuts of a take, reworded prompts, and the review's fallbacks from earshot's
# catalogue. Every one that was auditioned stays here with its result in check.json; `use` names the one delivered.

def cands(sid, **kw):
    V9[sid].setdefault('cands', {}).update(kw)


def steps(design, n, every, speed, alt=0.04, drop=0.0, seed0=0, fout=0.12, **kw):
    """n catalogue footsteps `every` s apart, the speed alternating +-alt, each `drop` dB under the one before"""
    return [seg(('es', design, seed0 + i), at=round(i * every, 3), speed=round(speed * (1 + alt * (1 if i % 2 else -1)), 4),
                gain=-drop * i, fout=fout, **kw) for i in range(n)]


cands('ox_snort',
      s902_first=[seg(902, a=0.30, b=0.80, fout=0.1)],
      s902_second=[seg(902, a=1.00, b=2.20, fout=0.15)],
      es_moo=[seg(('es', 'cow/moo', 0), len=0.75, speed=0.8, fout=0.2)],
      es_moo_1=[seg(('es', 'cow/moo', 1), len=0.75, speed=0.8, fout=0.2)])
cands('crows_burst',
      es_wings4=[seg(('es', 'wings/flap', 0), at=0.0, speed=0.9),
                 seg(('es', 'wings/flap', 1), at=0.09, speed=1.1, gain=-1, event=False),
                 seg(('es', 'wings/flap', 2), at=0.20, speed=1.0, gain=-2, event=False),
                 seg(('es', 'wings/flap', 3), at=0.31, speed=0.95, gain=-3, event=False)],
      es_wings1=[seg(('es', 'wings/flap', 0))])
cands('bowl_on_stone',
      es_knock=[seg(('es', 'knock/hollow', 0), speed=0.6, fout=0.1),
                seg(('es', 'dumbbell/place', 0), lp=300, gain=-10, event=False, fout=0.2)],
      es_knock_only=[seg(('es', 'knock/hollow', 0), speed=0.6, fout=0.1)],
      es_hitwood=[seg(('es', 'hit/wood', 0), speed=0.6, fout=0.15),
                  seg(('es', 'dumbbell/place', 0), lp=300, gain=-10, event=False, fout=0.2)])
cands('rockfall_crack',
      s931_first=[seg(931, b=0.30, fout=0.1)],
      es_breakrock=[seg(('es', 'break/rock', 0))],
      es_thundercrack=[seg(('es', 'thunder/crack', 0), len=3.0, fout=0.6)])
cands('child_steps_mud', es_steps=steps('step/mud', 6, 0.48, 1.2))
cands('boots_away_mud', es_steps=steps('step/mud', 3, 0.55, 0.85, drop=2.0))


# the landing and the chains are played slower than made, as the review asks (a heavier source); the ram is only
# the first second of its take
cands('bell_landing_big',
      s914_x060=[seg(914, speed=0.60, len=5.5, fout=1.2)],
      s914_x065=[seg(914, speed=0.65, len=5.5, fout=1.2)],
      s914_x070=[seg(914, speed=0.70, len=5.5, fout=1.2)])
cands('chains_heavy',
      s915_x050=[seg(915, speed=0.50, fout=0.4)],
      s915_x055=[seg(915, speed=0.55, fout=0.4)],
      s915_x060=[seg(915, speed=0.60, fout=0.4)])
cands('bell_ram_clang', s916_1s=[seg(916, len=1.05, fout=0.25)])

# reworded winds, auditioned at 12 s before a full-length take is spent on one
WIND_WORDS = {
    'field_v1': ('Field recording of wind blowing across an open grassy plain, a steady breeze with gentle gusts, '
                 'tall grass rustling, natural outdoor ambience, wide', 5171),
    'field_v2': ('Wind gusting over open moorland, gusts rising and falling, a low whistling moan around dry-stone '
                 'walls, grass swishing, field recording, wide', 5172),
    'field_v4': ('Gentle wind blowing through tall dry grass in an open field, soft rustling and swishing, calm, '
                 'wide stereo field recording', 5174),
    'alt_a1': ('Wind howling softly through a high stone bell tower, a hollow whistling moan through open arches, '
               'airy, slow rise and fall', 5181),
    'alt_a2': ('Strong high-altitude wind on a mountain summit, cold thin air rushing and whistling past rock, '
               'steady, wide', 5182),
    'alt_a3': ('Wind whistling and moaning through the gaps of a ruined stone tower high on a cliff, a hollow tonal '
               'howl with slow swells', 5183),
    'alt_w1': ('Howling wind blowing hard over a high mountain ridge, strong cold gusts rising and falling, wind '
               'whistling over rock, blizzard wind, field recording', 5184),
    'alt_w2': ('Cold wind gusting through the open belfry of a tall stone tower, breathy rushing gusts sweeping past '
               'the arches, rising and falling, airy, field recording', 5185),
}


def wind12(name):
    return [seg(('sa', WIND_WORDS[name][0], 12, WIND_WORDS[name][1]), a=1.0, trim=False, fin=0.25, fout=0.25)]


cands('wind_vale_field', **{k + '_12s': wind12(k) for k in ('field_v1', 'field_v2', 'field_v4')})
cands('wind_altitude_arches', **{k + '_12s': wind12(k) for k in ('alt_a1', 'alt_a2', 'alt_a3')})

# reworded prompts for the sounds whose first two seeds failed the same way
WORDS = {
    'ox_moo': ('A cow lowing once, one short low moo ending in a snort of breath through the nose, close, outdoors '
               'in an open field', 3, 5021),
    'ox_bellow': ('A startled ox bellowing, one short deep moo and a loud snort, farm animal, close, outdoors', 3, 5022),
    'crows_flock': ('A flock of pigeons and crows suddenly taking flight from the ground, a burst of loud flapping '
                    'wings fluttering, close, outdoors', 3, 5031),
    'crows_wings': ('Large birds taking off, heavy wing beats flapping fast, feathers beating the air, bird wings '
                    'fluttering, close', 3, 5032),
    'crack_slab': ('A huge slab of rock cracking and splitting off a cliff face far away, one sharp loud crack of '
                   'stone with a rumbling echo rolling across a wide mountain valley', 3, 5311),
}


def reworded(name, **kw):
    w = WORDS[name]
    return seg(('sa', w[0], w[1], w[2]), **kw)


cands('ox_snort', ox_moo=[reworded('ox_moo', fout=0.15)], ox_bellow=[reworded('ox_bellow', fout=0.15)])
cands('crows_burst', crows_flock=[reworded('crows_flock', fout=0.15)], crows_wings=[reworded('crows_wings', fout=0.15)])
cands('rockfall_crack', crack_slab=[reworded('crack_slab', fout=0.3)])


def wind32(name, a=1.5, b=None, **kw):
    """a full-length take of a reworded wind"""
    return seg(('sa', WIND_WORDS[name][0], 32, WIND_WORDS[name][1]), a=a, b=b, trim=False, fin=0.25, fout=0.25, **kw)


def es_wind(design, seed=0, dur=30, a=0.5, **kw):
    return seg(('es', design, seed, dur), a=a, trim=False, fin=0.25, fout=0.25, **kw)


cands('wind_vale_field',
      field_v1=[wind32('field_v1')],
      field_v1_lp2k=[wind32('field_v1', lp=2000)],
      field_v1_lp1k=[wind32('field_v1', lp=1000)],
      es_open=[es_wind('wind/open')],
      es_open_lp4k=[es_wind('wind/open', lp=4000)],
      es_open_lp6k=[es_wind('wind/open', lp=6000)])

cands('applause_gloved_vast',
      s919_lp=[seg(919, a=0.6, trim=False, lp=2500, fin=0.3, fout=0.8)],
      s919_soft=[seg(919, a=0.6, trim=False, soften=1.2, fin=0.3, fout=0.8)],
      s919_soft_lp=[seg(919, a=0.6, trim=False, soften=1.2, lp=2500, fin=0.3, fout=0.8)])
cands('ox_snort',
      ox_bellow_06=[reworded('ox_bellow', len=0.65, fout=0.2)],
      ox_moo_06=[reworded('ox_moo', a=0.9, len=0.65, fout=0.2)],
      es_moo_full=[seg(('es', 'cow/moo', 0))])
# the seal: no small sticky sound in the generator passed; these are cut from catalogue designs
cands('wax_press_soft',
      es_mud_swell=[seg(('es', 'step/mud', 0), a=0.08, trim=False, speed=0.8, lp=4000, fin=0.12, fout=0.25)],
      es_mud_swell_1=[seg(('es', 'step/mud', 1), a=0.08, trim=False, speed=0.8, lp=4000, fin=0.12, fout=0.25)],
      es_mud=[seg(('es', 'step/mud', 0), speed=0.8, lp=4000, fout=0.25)])
cands('wax_peel',
      es_tape=[seg(('es', 'tape/peel', 0), speed=0.7, lp=5000, fout=0.15)],
      es_tape_short=[seg(('es', 'tape/peel', 0), speed=0.7, lp=5000, len=0.45, fout=0.2)],
      es_tape_flat=[seg(('es', 'tape/peel', 0), fout=0.15)])

cands('wind_altitude_arches',
      alt_a2=[wind32('alt_a2')], alt_a2_lp4k=[wind32('alt_a2', lp=4000)],
      alt_a3=[wind32('alt_a3')], alt_a3_lp4k=[wind32('alt_a3', lp=4000)], alt_a3_lp2k=[wind32('alt_a3', lp=2000)],
      es_mountain_lp4k=[es_wind('wind/mountain', lp=4000)])
cands('wind_vale_farmland',
      s1927_lp4k=[seg(1927, a=1.5, trim=False, lp=4000, fin=0.25, fout=0.25)],
      s927_lp4k=[seg(927, a=1.5, trim=False, lp=4000, fin=0.25, fout=0.25)],
      s927_lp1k=[seg(927, a=1.5, trim=False, lp=1000, fin=0.25, fout=0.25)])
cands('ox_snort',
      ox_moo_event=[reworded('ox_moo', a=0.9, fout=0.2)],
      ox_moo_05=[reworded('ox_moo', a=0.9, len=0.55, fout=0.15)],
      ox_moo_08=[reworded('ox_moo', a=0.9, len=0.80, fout=0.2)],
      es_moo_mid=[seg(('es', 'cow/moo', 0), a=0.8, trim=False, len=0.65, fin=0.03, fout=0.2)],
      es_moo_mid_x08=[seg(('es', 'cow/moo', 0), a=0.8, trim=False, len=0.65, speed=0.8, fin=0.03, fout=0.2)])
cands('wax_peel',
      es_tape_08=[seg(('es', 'tape/peel', 0), speed=0.7, lp=5000, len=0.8, fout=0.25)],
      es_tape_10=[seg(('es', 'tape/peel', 0), speed=0.7, lp=5000, len=1.0, fout=0.3)],
      es_tape_x05=[seg(('es', 'tape/peel', 0), speed=0.5, lp=4000, len=0.9, fout=0.3)])

cands('ox_snort',
      s2902_first=[seg(2902, a=0.10, b=0.80, fout=0.12)],
      s2902_second=[seg(2902, a=1.00, b=1.85, fout=0.15)])
cands('child_steps_mud', s2906_cut=[seg(2906, a=1.75, fout=0.15)])
cands('crows_burst',
      crows_flock_a=[reworded('crows_flock', b=1.3, fout=0.2)],
      crows_flock_b=[reworded('crows_flock', a=0.5, b=1.8, trim=False, fin=0.03, fout=0.2)],
      crows_flock_hp=[reworded('crows_flock', hp=400, fout=0.2)],
      crows_flock_wings=[reworded('crows_flock', fout=0.2),
                         seg(('es', 'wings/flap', 0), at=0.05, speed=0.9, gain=-4, event=False),
                         seg(('es', 'wings/flap', 1), at=0.22, speed=1.1, gain=-5, event=False)])
# the crack: a catalogue rock break for the crack itself, and a far roll under it for the valley (a layer, not a
# reverb)
cands('rockfall_crack',
      es_break_roll=[seg(('es', 'break/rock', 0), fout=0.3),
                     seg(('es', 'thunder/crack', 0), a=0.35, trim=False, len=2.9, lp=1500, gain=-10, at=0.12,
                         fin=0.08, fout=1.2, event=False)],
      es_break_far=[seg(('es', 'break/rock', 0), fout=0.3),
                    seg(('es', 'explosion/far', 0), trim=False, lp=1500, gain=-12, at=0.15, fin=0.05, fout=1.0,
                        event=False)],
      es_break_x08=[seg(('es', 'break/rock', 0), speed=0.8, fout=0.3)],
      es_break_boomtail=[seg(('es', 'break/rock', 0), fout=0.3),
                         seg(901, a=0.6, trim=False, len=2.9, lp=1500, gain=-12, at=0.12, fin=0.1, fout=1.2,
                             event=False)])

cands('boots_away_mud',
      s2908_steps=[seg(2908, thr=-20, fout=0.15)],
      s2908_first3=[seg(2908, b=1.65, fout=0.15)],
      s2908_late=[seg(2908, a=0.75, b=3.4, fout=0.15)])
cands('run_boots_mud', s10111_cut=[seg(10111, a=1.0, fout=0.15)], s9111_cut=[seg(9111, a=0.5, fout=0.15)])
cands('hoe_chop', s905_cut=[seg(905, a=1.0, fout=0.2)],
      s905_chops=[seg(905, a=1.063, trim=False, on=0.05, fin=0.005, fout=0.2)])
cands('crows_burst',
      crows_flock_wings4=[reworded('crows_flock', fout=0.2, gain=-2),
                          seg(('es', 'wings/flap', 0), at=0.03, speed=0.9, gain=-3, event=False),
                          seg(('es', 'wings/flap', 1), at=0.12, speed=1.1, gain=-4, event=False),
                          seg(('es', 'wings/flap', 2), at=0.23, speed=1.0, gain=-5, event=False),
                          seg(('es', 'wings/flap', 3), at=0.34, speed=0.95, gain=-6, event=False)],
      crows_flock_wings_2s=[reworded('crows_flock', len=2.0, fout=0.5),
                            seg(('es', 'wings/flap', 0), at=0.05, speed=0.9, gain=-4, event=False),
                            seg(('es', 'wings/flap', 1), at=0.22, speed=1.1, gain=-5, len=1.6, fout=0.4, event=False)])
cands('rockfall_crack',
      es_break_far3=[seg(('es', 'break/rock', 0), fout=0.3),
                     seg(('es', 'explosion/far', 0), trim=False, lp=1500, gain=-12, at=0.15, fin=0.05, len=2.85,
                         fout=1.2, event=False)])
cands('wind_vale_field',
      field_v1_t1000=[wind32('field_v1', lp=1000, lpo=1)],
      es_open_t3500=[es_wind('wind/open', lp=3500, lpo=1)])
cands('wind_vale_farmland',
      s1927_t1000=[seg(1927, a=1.5, trim=False, lp=1000, lpo=1, fin=0.25, fout=0.25)],
      s2927_t1000=[seg(2927, a=1.5, trim=False, lp=1000, lpo=1, fin=0.25, fout=0.25)],
      s927_t1000=[seg(927, a=1.5, trim=False, lp=1000, lpo=1, fin=0.25, fout=0.25)])

# the cuts that are delivered (and their rivals in the last round)
WIDE = (13.0, 0.6)      # beds from a mono take: side = the same stretch 13 s on, at 0.6 of the mid
cands('rockfall_boom', s901_cut=[seg(901, fout=0.6)], s1901_cut=[seg(1901, fout=0.6)])
cands('rockfall_body_a', roar=[seg(911, a=0.80, thr=-30, fout=0.5)])
cands('rockfall_body_b', roar=[seg(912, a=0.75, thr=-30, fout=0.5)])
cands('bell_ram_clang', s1916_1s=[seg(1916, len=1.05, fout=0.25)], s2916_1s=[seg(2916, len=1.05, fout=0.25)])
cands('wind_vale_field',
      field_v1_steady=[wind32('field_v1', a=1.5, b=28.0, lp=1000, lpo=1, width=WIDE)],
      field_v1_steady_t1500=[wind32('field_v1', a=1.5, b=28.0, lp=1500, lpo=1, width=WIDE)])
cands('wind_vale_farmland',
      s2927_t700=[seg(2927, a=1.5, trim=False, lp=700, lpo=1, fin=0.25, fout=0.25, width=WIDE)],
      s2927_lp1k=[seg(2927, a=1.5, trim=False, lp=1000, fin=0.25, fout=0.25, width=WIDE)],
      s2927_wide=[seg(2927, a=1.5, trim=False, lp=1000, lpo=1, fin=0.25, fout=0.25, width=WIDE)])
cands('wind_altitude_arches', alt_a3_wide=[wind32('alt_a3', lp=4000, width=WIDE)])
APPLAUSE_FAR = ('A huge distant crowd applauding softly, a dense dull roar of muffled applause heard from far away '
                'across a vast stone cathedral, soft, washed, low, very reverberant', 10, 5191)
cands('applause_gloved_vast',
      far=[seg(('sa',) + APPLAUSE_FAR, a=0.6, trim=False, fin=0.3, fout=0.8)],
      far_lp=[seg(('sa',) + APPLAUSE_FAR, a=0.6, trim=False, lp=2500, fin=0.3, fout=0.8)],
      far_soft_lp=[seg(('sa',) + APPLAUSE_FAR, a=0.6, trim=False, soften=1.2, lp=2500, fin=0.3, fout=0.8)],
      s2919_lp=[seg(2919, a=0.6, trim=False, lp=2500, fin=0.3, fout=0.8)],
      s2919_soft_lp=[seg(2919, a=0.6, trim=False, soften=1.2, lp=2500, fin=0.3, fout=0.8)],
      s1919_soft_lp=[seg(1919, a=0.6, trim=False, soften=1.2, lp=2500, fin=0.3, fout=0.8)])


def crowd(src, n, soften=None, lp=2500, **kw):
    """the review's way to make a crowd bigger: copies of one applause take a few tens of ms apart, each at its own
    speed (+-3 %), summed"""
    offs = [0.0, 0.037, 0.071, 0.113, 0.160, 0.211, 0.263, 0.331][:n]
    spd = [1.0, 1.03, 0.97, 1.015, 0.985, 1.045, 0.955, 1.0225][:n]
    return [seg(src, a=0.6, trim=False, at=o, speed=v, lp=lp, soften=soften, fin=0.3, fout=0.8, event=False, **kw)
            for o, v in zip(offs, spd)]


cands('applause_gloved_vast',
      s1919_x4=crowd(1919, 4), s1919_x8=crowd(1919, 8), s1919_x8_soft=crowd(1919, 8, soften=1.2),
      s919_x8=crowd(919, 8), s919_x8_soft=crowd(919, 8, soften=1.2),
      far_x8=crowd(('sa',) + APPLAUSE_FAR, 8), s1919_x8_lp4k=crowd(1919, 8, lp=4000))
cands('wind_vale_field',
      es_open_s1_t3500=[es_wind('wind/open', seed=1, lp=3500, lpo=1)],
      es_open_s2_t3500=[es_wind('wind/open', seed=2, lp=3500, lpo=1)],
      es_open_t5000=[es_wind('wind/open', lp=5000, lpo=1)],
      es_open_s1_t5000=[es_wind('wind/open', seed=1, lp=5000, lpo=1)])

# the hoe: three single chops of one take, each cut clear of the grit that follows it, 0.6 s apart, level peaks
cands('hoe_chop', s905_three=[seg(905, a=1.00, b=1.32, len=0.30, fout=0.06, at=0.0),
                              seg(905, a=2.05, b=2.39, len=0.30, fout=0.06, at=0.6),
                              seg(905, a=3.03, b=3.36, len=0.30, fout=0.06, at=1.2)])
cands('wax_press_soft',
      es_mud_swell_at=[seg(('es', 'step/mud', 1), a=0.08, trim=False, speed=0.8, lp=4000, fin=0.12, fout=0.25,
                           at=0.05, on=0.0)])

# the run: single boots for the mix to place on the picture's own steps. Cut alone, most steps of the generated
# takes read as a hard floor, so the catalogue's mud step is offered eleven times (the film has eleven), each
# from its own seed, 0.7 s apart so that none overlaps the next
cands('run_boots_mud',
      es_run=steps('step/mud', 11, 0.7, 0.92),
      es_run_fast=steps('step/mud', 11, 0.7, 1.05))

# the altitude wind: the moaning take alone carries a pitch (the tagger hears music in it), so it is also tried
# under a second, airy take of another wording
cands('wind_altitude_arches',
      a3_a2_even=[wind32('alt_a3', lp=4000, width=WIDE), wind32('alt_a2', lp=2000, lpo=1, gain=0, event=False)],
      a3_a2_under=[wind32('alt_a3', lp=4000, width=WIDE), wind32('alt_a2', lp=2000, lpo=1, gain=-6, event=False)],
      a3_a2_over=[wind32('alt_a3', lp=4000, gain=-6, width=WIDE), wind32('alt_a2', lp=2000, lpo=1, event=False)],
      a3_a2_over_lp=[wind32('alt_a3', lp=4000, gain=-6, width=WIDE), wind32('alt_a2', lp=4000, event=False)])

cands('wind_altitude_arches',
      alt_w1_12s=wind12('alt_w1'), alt_w2_12s=wind12('alt_w2'),
      alt_w1=[wind32('alt_w1')],
      alt_w1_lp4k=[wind32('alt_w1', lp=4000, width=WIDE)],
      alt_w1_t2000=[wind32('alt_w1', lp=2000, lpo=1, width=WIDE)])

# only the 12 s take of the mountain-ridge wording reads as wind (the same words and seed at 32 s, and two more
# seeds, read as hiss and as a train), so the bed is that take looped
W1_12 = ('sa', WIND_WORDS['alt_w1'][0], 12, WIND_WORDS['alt_w1'][1])
cands('wind_altitude_arches',
      alt_w1_loop=[seg(W1_12, a=1.0, b=11.9, trim=False, lp=4000, loop=(9.4, 1.5, 28.2), fin=0.25, fout=0.25,
                       width=WIDE)],
      alt_w1_loop_t2000=[seg(W1_12, a=1.0, b=11.9, trim=False, lp=2000, lpo=1, loop=(9.4, 1.5, 28.2), fin=0.25,
                             fout=0.25, width=WIDE)])


# ------------------------------------------------------------------------------------------------- what is delivered

def use(sid, cand, note, **kw):
    V9[sid].update(use=cand, note=note, **kw)


use('wind_vale_field', 'es_open_s1_t3500',
    "A catalogue wind, not Stable Audio: earshot's `wind/open` with its top rolled off above 3.5 kHz. True stereo, "
    "with gusts of its own: the level moves about 4 dB either way, the strongest gust is at 17.4-17.8 s, the "
    "calmest stretches are 0-4 s and 27-29.5 s. Realness 0.52 (uncertain; the old wind was 0.02-0.08). Every "
    "Stable Audio field take read as hiss or a waterfall while it was steady and passed only where a gust was in "
    "it; the best of those is wind_vale_farmland.")
use('wind_vale_farmland', 's2927_t700',
    "The lead's prompt, third seed, with everything above 700 Hz rolled off; without that it is hiss (93 %). Very "
    "dark: most of its energy is under 80 Hz, so a phone will play almost none of it. Realness 0.16 (likely "
    "synthesized). Swells of about 10 dB at 4-7 s, 11-13 s (the peak, 12.0 s) and 17-18 s; from 23 s on it is "
    "steady. Made stereo from itself: sum to mono for the plain take.")
use('wind_altitude_arches', 'alt_w1_loop_t2000',
    "Not the review's prompt (its take read as ocean waves, 97 %) but a reworded one, of which only a 12 s take "
    "reads as wind: this is 9.4 s of it repeated three times, so the same gusts come round every 9.4 s (level "
    "within 3.5 dB either way). Top rolled off above 2 kHz. The pass is by share (84 %); z is only +2.6 because "
    "the review's phrase, 'wind in an open high place', scores low for any wind. Realness 0.45 (uncertain). A "
    "moaning take that also passes (alt_a3_wide, 77 %) is in the table, but the tagger hears music and whale "
    "song in it.")
use('rockfall_boom', 's901_cut',
    "It builds: first sound 0.05 s, loud from 0.15 s, peak 0.33 s, 20 dB down by 2.9 s, gone by 5.2 s. True "
    "stereo (correlation 0.75). The tagger hears thunder (0.63) and earshot an explosion: nothing in it says "
    "stone, it needs the body after it. Two clipped samples in the raw take.")
use('rockfall_body_a', 'roar',
    "The rise. Mono (two equal channels): pan it against body_b. It grows for 4 s, is loudest at 4.2-4.6 s, holds "
    "to 6.6 s and then drops away in 0.3 s. For a roar still rising at the picture cut, end the cut at 4.2-4.6 s "
    "of the file. Realness 0.88.")
use('rockfall_body_b', 'roar',
    "The wall. Mono: pan it against body_a. Full from 0.2 s and level until 5.0 s, loudest at 2.2-2.6 s, gone by "
    "5.6 s. The take's first 0.7 s (a separate thump) is cut off. Realness 0.88.")
use('rockfall_crack', 'es_break_far3',
    "Not Stable Audio: four generated takes read as a stick snapping, a whip or a squelch. This is the "
    "catalogue's rock break with its far explosion laid 12 dB under it as the roll across the valley. The crack "
    "is the first 0.25 s, the roll runs to 2.4 s. earshot's own word for it is an explosion; a gunshot gets "
    "15 %. Dry: it has no echo of its own.")
use('ox_snort', 's2902_first',
    "Third seed, the first of the take's two sounds (the second read as a lion, 93 %). One grunt: a faint breath "
    "from 0.05 s, the grunt itself from 0.25 s, peak 0.49 s, over by 0.67 s; sync on 0.25 s. Passes by share only "
    "(69 %; pig 19 %, lion 11 %), and earshot's own words for it are a rubber stretch and a record scratch: listen "
    "before trusting it. Every deeper or longer grunt lost to 'a lion growling'.")
use('crows_burst', 'crows_flock_wings',
    "FAIL. earshot's first word for it is 'a bird flapping its wings' (z +3.9), but made to choose it says cloth "
    "flapping (72 %), as it did for all five generated takes and for the catalogue's wings alone. It is the "
    "reworded take with two catalogue wing-flaps under it. Loud from 0.11 s, busiest 0.6-1.0 s, thin by 1.8 s; "
    "the picture needs about 1 s.")
use('bowl_on_stone', 's1904',
    "Second seed. One dull knock 0.2 s long at 0.05 s, nothing after 0.3 s. The first seed read as a box lid "
    "(95 %); this one still gives the lid 15 %. The review's catalogue fallback scored higher (z +4.7, 100 %) "
    "and is in the table as es_knock.")
use('hoe_chop', 's905_chops',
    "Three chops at 0.05, 1.096 and 2.203 s (peaks 0, -1.6, -5.4 dB) with soil and grit falling between them. "
    "Cut each chop with its tail, from its onset to the next: a bare 0.3 s chop reads as a stick snapping "
    "(78 %), the fault the review found. With their tails chops 1 and 2 pass alone and chop 3 does not (a camera "
    "shutter): use 1 and 2.", events=dict(thr_db=-12.0))
use('run_boots_mud', 'es_run',
    "Not Stable Audio: both generated takes passed as a whole (76 %, 96 %), but cut into single steps eight of "
    "ten read as a hard floor or hands clapping, and the mix places single steps. Eleven catalogue mud steps "
    "(the film has eleven boots), each from its own seed, 0.7 s apart so none runs into the next; all eleven "
    "pass alone. Each is about 0.6 s long, so at the picture's 0.31 s they will overlap. Bright (centroid "
    "4.2 kHz).")
use('run_breath', 's9112',
    "The strongest pass of the set (z +6.3). Four seconds of panting, about five breaths, loud from 0.09 s, "
    "loudest at 3.5-3.9 s, fading out by itself after 4.0 s. The raw take peaked at -32 dBFS and was raised "
    "29 dB: listen for its noise floor.")
use('child_steps_mud', 'es_steps',
    "Not Stable Audio: two takes read as paper rustling and the third passed only through its first second. Six "
    "catalogue mud steps 0.48 s apart at 1.2 speed, pitch alternating by 4 %, as the review's fallback asks. "
    "Bright (centroid 5.4 kHz): it needs the review's 4 kHz low-pass. Alone, steps 1 and 4 lean to paper "
    "rustling; 2, 3, 5 and 6 pass.")
use('boots_away_mud', 'es_steps',
    "Not Stable Audio: the third seed passed as a whole (86 %), but five of its eight steps read as cloth "
    "rustling when cut out. Three catalogue mud steps at 0.85 speed, 0.55 s apart (the picture's own spacing), "
    "each 2 dB under the last; every one passes alone. It is the same catalogue step as the child's and the "
    "run's, at another speed.")
use('bowl_taken', 's909',
    "A wet scrape 0.8 s long with the slop inside it: first sound 0.05 s, loud from 0.12 s, loudest 0.16-0.56 s. "
    "Passes by share (99 %) but weakly (z +1.6): earshot's own words for it are a match being struck and a wet "
    "squelch. Nothing in it is certainly wood; listen.")
use('grab_run_up', 's910',
    "Four hits at 0.06, 0.37, 0.62 and 0.86 s (0, -4, -5, -10 dB): the first two are 0.31 s apart, the picture's "
    "boots 0.28 s. Passes by share (93 %) but weakly (z +1.8): earshot's own words are digging in soil and a "
    "scrape, and no grunt can be found in it.")
use('bowl_slop', 's9113',
    "Two slops: a big one at 0.08-1.26 s (peak 0.62 s) and a small one at 1.41-1.60 s, then drips to 2.4 s. It "
    "reads as a wet squelch (z +5.6): thick, not splashy.")
use('wax_press_soft', 'es_mud_swell_at',
    "Not Stable Audio: all three takes read as a camera shutter click. This is the body of a catalogue mud step "
    "with its impact cut off, slowed to 0.8, low-passed at 4 kHz and faded in over 120 ms: one swell and no "
    "click. It starts at 0.05 s, is fullest at 0.13 s and over by 0.7 s.")
use('wax_peel', 'es_tape_x05',
    "Not Stable Audio (three takes: a camera shutter click, 86-99 %). The catalogue's sticky-tape peel at half "
    "speed, low-passed at 4 kHz, 0.75 s long. It passes by share (95 %) but weakly (z +2.1), and earshot's own "
    "words for it are an error buzz and a digital glitch: the riskiest pass here. The review's free edit of the "
    "old tick may be safer.")
use('bell_landing_big', 's914_x060',
    "Played at 0.6 speed, as the review asks. Peak at 0.09 s, 20 dB down by 2.7 s, ringing to 3.8 s, gone by "
    "5.0 s. Deep (centroid 139 Hz) and mono. No sub layer is in the file: the review's 30-45 Hz sub is left to "
    "the mix (sfx_make.synth_sub_thud). The tagger also hears a big drum (timpani 0.22).")
use('chains_heavy', 's915_x050',
    "Played at 0.5 speed: 9.7 s, true stereo (correlation 0.10). The big clanks are at 1.21 s, 3.68 s and "
    "5.13 s (the peak). The first 0.9 s is small ticks that read as a door latch when heard alone: start the "
    "cut at 1.15 s. At its own speed the same take failed (door latch 54 %).")
use('bell_ram_clang', 's916_1s',
    "FAIL on the review's check, which is written for the whole bell: a strike with no ring is 'a cinematic "
    "boom' (99 %). As the strike layer it was asked for, it reads 'a huge heavy metallic impact' at z +5.4, "
    "100 % (the second check in the entry). The first second of the take. The take begins on the strike, so the "
    "attack has only a 2 ms fade-in; nine clipped samples in the raw take at the hit. Deep (centroid 137 Hz): "
    "weight, not brightness.")
use('applause_gloved_vast', 's1919',
    "FAIL. It is applause (earshot's first word, z +3.7), but sharp close hand clapping (99 %), not a soft far "
    "crowd. Low-passing it, or stacking copies as the review suggests, turned every take into 'horses "
    "galloping'. The best of four takes: steady, true stereo (correlation 0.70), 8.5 s. It needs the mix's hall "
    "and level to be far; or keep the present file.")
use('bowl_buzz_on_stone', 's1932',
    "Second seed. 1.6 s of fine chatter, loud from 0.11 s, loudest at 0.88-1.28 s, gone by 1.7 s. A strong pass "
    "(z +4.6), but earshot's own words for it are ice cubes in a glass and dominoes: a rattle, not certainly "
    "wood. True stereo (0.84).")


def widen(y, shift, side, xf=0.5):
    """a mono bed made stereo without a reverb: its own sound from `shift` seconds later is the side signal.
    Where the side runs off the end of the stretch it goes on from the stretch's start, the two cross-faded at
    equal power over `xf` s, so there is no step in it. L = mid + side, R = mid - side: the mono sum is the bed
    itself, unchanged."""
    m = y.mean(axis=1)
    n, k, x = len(m), int(round(shift * SR)), int(round(xf * SR))
    w = n - k                               # where the side wraps
    s = np.empty(n)
    s[:w] = m[k:]
    th = 0.5 * np.pi * np.arange(x) / x
    s[w - x:w] = m[n - x:] * np.cos(th) + m[:x] * np.sin(th)
    s[w:] = m[x:x + k]
    return np.stack([m + side * s, m - side * s], 1)


def candidates(sid):
    """every candidate of a sound: the table's own (`cands`) and one plain cut per generated seed"""
    s = V9[sid]
    c = {}
    for seed in s['seeds']:
        if os.path.exists(F.sa_path('sfx', s['prompt'], s['dur'], seed)):
            c[f's{seed}'] = default_recipe(s, seed)
    c.update(s.get('cands') or {})
    return c


# ------------------------------------------------------------------------------------------------- looking (no models)

def envelope(x, ms=10):
    fr = int(SR * ms / 1000)
    a = np.abs(F.stereo(x)).max(axis=1)
    m = len(a) // fr
    return a[:m * fr].reshape(m, fr).max(axis=1), fr / SR


def events(x, thr_db=-26.0, gap=0.12, rise_db=-20.0):
    """the separate events of a file: stretches where the envelope (5 ms peaks) is within `thr_db` of the file's
    peak, split wherever it stays under that for `gap` s. For each: its onset (the first 1 ms frame, from 80 ms
    before the stretch, that is within `rise_db` of the event's own peak), the time of that peak, the peak in dB
    under the file's peak, and where the event has fallen back under `thr_db`.
    Returns [(onset s, peak s, peak dB, end s)]."""
    env, dt = envelope(x, 5)
    fine, d1 = envelope(x, 1)
    fine = np.convolve(fine, np.ones(3) / 3, 'same')
    pk = env.max() + 1e-12
    hot = env >= pk * F.lin(thr_db)
    out, i, n, g, prev = [], 0, len(env), int(gap / dt), 0
    while i < n:
        if not hot[i]:
            i += 1
            continue
        j = last = i
        while j < n and j - last <= g:
            if hot[j]:
                last = j
            j += 1
        a, b = int(i * dt / d1), min(int((last + 1) * dt / d1), len(fine))
        p = a + int(np.argmax(fine[a:b]))
        lo = max(prev, a - int(0.08 / d1))
        on = lo + int(np.argmax(fine[lo:p + 1] >= fine[p] * F.lin(rise_db)))
        out.append((round(on * d1, 3), round(p * d1, 3), round(F.db(fine[p] / fine.max()), 1),
                    round((last + 1) * dt, 3)))
        prev = b
        i = j
    return out


def steadiest(x, length, skip=1.0, hop=0.25):
    """the start (s) of the `length`-second stretch after `skip` whose level moves least: the spread of its 0.5 s
    RMS levels plus how far its loudest 50 ms stands above its median"""
    m = F.mono(x)
    w = int(0.5 * SR)
    k = len(m) // w
    lv = 10 * np.log10(np.mean(m[:k * w].reshape(k, w) ** 2, axis=1) + 1e-14)
    e50, _ = envelope(x, 50)
    best = None
    t = skip
    while t + length <= len(m) / SR + 1e-6:
        i0, i1 = int(np.ceil(t / 0.5)), int((t + length) / 0.5)
        seg_lv = lv[i0:i1]
        pk = e50[int(t / 0.05):int((t + length) / 0.05)]
        score = float(np.std(seg_lv) + 0.25 * (F.db(pk.max()) - F.db(np.median(pk))))
        if best is None or score < best[0]:
            best = (score, round(t, 2), round(float(np.std(seg_lv)), 2),
                    round(float(F.db(pk.max()) - F.db(np.median(pk))), 1))
        t += hop
    return best


def loudest(y, win=0.4):
    """[start, end] in seconds of the loudest `win` of a file (the stretch the mix is levelled by)"""
    p = np.concatenate([[0.0], np.cumsum(F.mono(y) ** 2)])
    k = min(int(win * SR), len(p) - 1)
    i = int(np.argmax(p[k:] - p[:-k]))
    return [round(i / SR, 3), round((i + k) / SR, 3)]


def look(sid, seed=None, src=None):
    s = V9[sid]
    x, how = source(s, src if src is not None else (seed if seed is not None else s['seeds'][0]))
    env, dt = envelope(x, 10)
    pk = env.max()
    print(f"{sid}: {len(x) / SR:.2f} s, raw peak {how.get('raw_peak_dbfs')} dBFS, clipped "
          f"{how.get('raw_clipped_samples')}, L/R correlation "
          f"{np.corrcoef(x[:, 0], x[:, 1])[0, 1]:+.2f}, first onset {F.onset(x) / SR:.3f} s")
    step = 0.1 if len(x) / SR <= 12 else 0.5
    k = int(step / dt)
    row = ''
    for i in range(0, len(env), k):
        d = F.db(env[i:i + k].max() / pk)
        row += ' .:-=+*#%@'[int(np.clip((d + 54) / 6, 0, 9))]
    print(f'  level per {step:g} s (each sign 6 dB, @ = peak): |{row}|')
    if s['kind'] == 'bed':
        for L in (8, 25, 28, 30):
            if len(x) / SR > L + 1:
                b = steadiest(x, L)
                print(f'  steadiest {L} s: from {b[1]} s (level spread {b[2]} dB, loudest 50 ms {b[3]} dB over median)')
    for on, p, d, end in events(x):
        print(f'  event: onset {on:7.3f} s  peak {p:7.3f} s  {d:6.1f} dB  ends {end:.2f} s')


# ------------------------------------------------------------------------------------------------- listening

def hear(path, s, realness=None):
    r = F.listen(path, s['check'][0], s['check'][1])
    for text, alts in s.get('probes') or []:
        from earshot import api
        m = api.match(path, text, alts=alts)
        ok, why = F.judge(m)
        r.setdefault('probes', []).append({'description': text, 'alternatives': alts, 'pass': ok, 'result': why})
    if realness if realness is not None else s['kind'] in ('bed', 'roar'):
        from earshot import api
        q = api.realness(path)
        r['realness'] = {k: (round(float(v), 3) if isinstance(v, float) else v)
                         for k, v in q.items() if k in ('p_real', 'verdict', 'evidence', 'why', 'summary')}
    return r


def short(r):
    alts = ', '.join(f"{a['query']} {100 * a['p']:.0f}%" for a in sorted(r['alts'], key=lambda a: -a['p'])[:3])
    t = (f"{'PASS' if r['pass'] else 'fail'}  z {r['z']:+.1f}  {100 * r['p_vs_alts']:.0f}%  [{alts}]  "
         f"like: {'; '.join(r['sounds_like'][:3])}")
    if 'realness' in r:
        t += f"  real {r['realness'].get('p_real')}"
    return t


def load_check():
    return json.load(open(CHECK)) if os.path.isfile(CHECK) else {}


def save_check(c):
    os.makedirs(OUT, exist_ok=True)
    json.dump(c, open(CHECK, 'w'), indent=1, ensure_ascii=False)


def audition(ids, only=None):
    os.makedirs(SCRATCH, exist_ok=True)
    c = load_check()
    for sid in ids:
        s = V9[sid]
        for name, recipe in candidates(sid).items():
            if only and name not in only:
                continue
            y, rec = build(sid, recipe)
            path = os.path.join(SCRATCH, f'{sid}__{name}.wav')
            sf.write(path, y, SR, subtype='PCM_24')
            r = hear(path, s)
            r['seconds'] = round(len(y) / SR, 3)
            r['onsets_s'] = rec['onsets_s']
            r['layers'] = rec['layers']
            c.setdefault(sid, {}).setdefault('tried', {})[name] = r
            save_check(c)
            print(f"{sid:22s} {name:12s} {len(y) / SR:5.2f} s  {short(r)}", flush=True)


def make(ids):
    for sid in ids:
        s = V9[sid]
        if not s.get('use'):
            print(f'{sid}: no candidate chosen yet')
            continue
        y, rec = build(sid, candidates(sid)[s['use']])
        path = os.path.join(OUT, sid + '.flac')
        F.write_flac(path, y)
        ev = events(y, **(s.get('events') or {})) if s['kind'] == 'multi' else None
        if ev and len(rec['onsets_s']) > 1:       # the recipe placed the events itself: its own times are exact
            ends = rec['onsets_s'][1:] + [len(y) / SR]
            pk = np.abs(y).max(axis=1)
            ev = [(on, round((int(on * SR) + int(np.argmax(pk[int(on * SR):int(e * SR)]))) / SR, 3),
                   round(F.db(pk[int(on * SR):int(e * SR)].max() / pk.max()), 1), round(min(e, on + 0.6), 3))
                  for on, e in zip(rec['onsets_s'], ends)]
        info = {'file': os.path.relpath(path, ROOT), 'seconds': round(len(y) / SR, 3), 'candidate': s['use'],
                'onsets_s': [e[0] for e in ev] if ev else rec['onsets_s'], 'made': rec,
                'loudest_400ms_at_s': loudest(y), 'peak_at_s': round(int(np.argmax(np.abs(y).max(axis=1))) / SR, 3)}
        if ev:
            info['events'] = [{'onset_s': e[0], 'peak_s': e[1], 'peak_db_re_file_peak': e[2], 'ends_s': e[3]}
                              for e in ev]
        elif s['kind'] in ('shot', 'roar'):
            first = events(y)[0]
            info['loud_onset_s'], info['loud_until_s'] = first[0], first[3]
        json.dump(info, open(os.path.join(SCRATCH, sid + '.made.json'), 'w'), indent=1)
        c = load_check()
        c.setdefault(sid, {})['made'] = info
        c[sid].pop('delivered', None)
        save_check(c)
        print(f"{sid:22s} {s['use']:12s} {info['seconds']:6.2f} s  onsets {info['onsets_s']}", flush=True)


def check(ids):
    c = load_check()
    for sid in ids:
        path = os.path.join(OUT, sid + '.flac')
        if not os.path.isfile(path):
            continue
        r = hear(path, V9[sid])
        r['measured'] = F.measure(path)
        made = c.get(sid, {}).get('made') or {}
        if made.get('events'):                # each event of a file of several, judged alone
            from earshot import api
            text, alts = V9[sid]['check']
            ons = [e['onset_s'] for e in made['events']] + [made['seconds']]
            for n, e in enumerate(made['events']):      # from just before its onset to just before the next one
                a, b = max(0.0, e['onset_s'] - 0.03), min(ons[n + 1] - 0.03, e['onset_s'] + 1.5)
                e['judged_alone_s'] = [round(a, 3), round(b, 3)]
                try:
                    ok, why = F.judge(api.match(path, text, alts=alts, start=a, end=b))
                    e['alone'] = ('pass: ' if ok else 'fail: ') + why
                except Exception as err:      # too short for the ear model
                    e['alone'] = f'not judged ({err})'
            c[sid]['made'] = made
        c.setdefault(sid, {})['delivered'] = r
        save_check(c)
        print(f"{sid:22s} {short(r)}", flush=True)


# ------------------------------------------------------------------------------------------------- the manifest

def brief(r):
    """the earshot numbers of one judged file, as the manifest keeps them"""
    out = {'description': r['description'], 'alternatives': r['alternatives'], 'verdict': r['verdict'], 'z': r['z'],
           'share_of_forced_choice': r['p_vs_alts'],
           'alternatives_share': {a['query']: a['p'] for a in r['alts']},
           'pass': r['pass'], 'result': r['result'], 'sounds_most_like': r['sounds_like'], 'audioset': r['audioset']}
    if 'realness' in r:
        out['realness'] = {k: r['realness'].get(k) for k in ('p_real', 'verdict', 'why')}
        out['describe'] = r.get('describe')
    if r.get('probes'):
        out['probes'] = r['probes']
    return out


def manifest():
    c = load_check()
    sounds = {}
    for sid in ORDER:
        s, k = V9[sid], c.get(sid, {})
        made, r = k.get('made'), k.get('delivered')
        if not made or not r:
            print(f'{sid}: not made or not checked, left out')
            continue
        srcs = made['made']['sources']
        gens = [h for h in srcs if h['method'] == 'generated']
        e = {'file': made['file'], 'row': s['row'], 'seconds': made['seconds'], 'onsets_s': made['onsets_s']}
        for k2 in ('loud_onset_s', 'loud_until_s', 'peak_at_s', 'loudest_400ms_at_s'):
            if made.get(k2) is not None:
                e[k2] = made[k2]
        if 'events' in made:
            e['events'] = made['events']
        e['pass'] = bool(r['pass']) and not s.get('force_fail')
        e['result'] = r['result'] if not s.get('force_fail') else f"{s['force_fail']} (earshot: {r['result']})"
        e['note'] = s.get('note', '')
        e['candidate'] = made['candidate']
        e['source'] = ('generated locally: ' + F.MODEL_NAME['sfx'] if len(gens) == len(srcs) else
                       'earshot catalogue designs (computed locally, no model)' if not gens else
                       'layered: a locally generated take and earshot catalogue designs')
        if gens:
            e['prompt'] = gens[0]['prompt'] if len({h['prompt'] for h in gens}) == 1 else [h['prompt'] for h in gens]
            e['seed'] = gens[0]['seed'] if len({h['seed'] for h in gens}) == 1 else [h['seed'] for h in gens]
            e['steps'], e['guidance_scale'] = gens[0]['steps'], gens[0]['guidance_scale']
            e['raw_takes'] = sorted({h['raw'] for h in gens})
            clipped = sum(h.get('raw_clipped_samples', 0) for h in gens)
            if clipped:
                e['raw_clipped_samples'] = clipped
        e['prompt_asked_by_the_review'] = s['prompt']
        e['recipe'] = made['made']['layers']
        e['processed'] = (s.get('processed', '') + ' ' if s.get('processed') else '') + made['made']['finish']
        e['earshot'] = brief(r)
        m = r.get('measured') or {}
        e['measured'] = {x: m.get(x) for x in ('peak_dbfs', 'true_peak_dbtp', 'lufs', 'rms_dbfs', 'centroid_hz',
                                                'lr_correlation', 'energy_db_of_total')}
        tried = k.get('tried') or {}
        live = candidates(sid)
        def other_words(recipe):               # the prompts of a candidate that are not the review's own
            return sorted({g['src'][1] for g in recipe
                           if isinstance(g['src'], tuple) and g['src'][0] == 'sa' and g['src'][1] != s['prompt']})

        e['tried'] = [{'candidate': n, 'what': '; '.join(q.get('layers') or []), 'seconds': q.get('seconds'),
                       'pass': q['pass'], 'result': q['result'], 'sounds_most_like': q['sounds_like'][:3],
                       **({'p_real': q['realness'].get('p_real')} if 'realness' in q else {}),
                       **({'reworded_prompt': other_words(live[n])} if other_words(live[n]) else {})}
                      for n, q in tried.items() if n in live]
        e['seeds_generated'] = [sd for sd in s['seeds']
                                if os.path.exists(F.sa_path('sfx', s['prompt'], s['dur'], sd))]
        sounds[sid] = e
    doc = {'film': 'The Weight of Heaven, movement I: the replacement effects asked for by the review of cut v8 '
                   '(edit/reviews/I_bell_v8_sound_effects.md, appendix C)',
           'made_by': 'tools/foundry_v9.py (which imports tools/sfx_make.py)',
           'format': f'FLAC, 48 kHz, stereo, 24-bit; sample peak {PEAK_DB:g} dBFS; one-shots keep {int(PRE * 1000)} ms '
                     'before the first onset; no reverb and no EQ unless `processed` says so',
           'onsets': 'All times are seconds from the start of the file. onsets_s: for a one-shot, its first sound '
                     '(the first 1 ms within 40 dB of the peak), which the cut puts at 0.05 s; loud_onset_s is '
                     'where it comes within 20 dB of its peak, the better mark for sync when the two differ, and '
                     'loud_until_s where it has fallen 26 dB. For a file of several events, onsets_s are their '
                     'loud onsets and `events` gives each with its peak, its end and how it is judged when cut '
                     'out alone (from 30 ms before its onset to 30 ms before the next). peak_at_s is the loudest '
                     'sample; loudest_400ms_at_s the stretch a mix is levelled by. Beds have no onsets.',
           'earshot_rule': F.RULE,
           'cost': 'nothing: Stable Audio 3.0 Small SFX on this machine\'s CPU and earshot\'s catalogue; no paid service',
           'nobody_has_heard_these': 'pass and fail are a listening model\'s reading, not an ear',
           'passed': [i for i, e in sounds.items() if e['pass']],
           'failed': [i for i, e in sounds.items() if not e['pass']],
           'sounds': sounds}
    json.dump(doc, open(MANIFEST, 'w'), indent=1, ensure_ascii=False)
    print(f"{MANIFEST}: {len(sounds)} sounds, {len(doc['passed'])} pass, {len(doc['failed'])} fail")


# ------------------------------------------------------------------------------------------------- generation

def gen(ids, all_seeds=False, nth=0):
    for sid in ids:
        s = V9[sid]
        seeds = s['seeds'] if all_seeds else s['seeds'][nth:nth + 1]
        for seed in seeds:
            t0 = time.time()
            path = F.sa_path('sfx', s['prompt'], s['dur'], seed)
            had = os.path.exists(path)
            F.sa('sfx', s['prompt'], s['dur'], seed, quiet=True)
            print(f"{sid:22s} seed {seed:6d} {s['dur']:4.0f} s  {'cached' if had else f'{time.time() - t0:5.0f} s'}  "
                  f"{os.path.basename(path)}", flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('list')
    g = sub.add_parser('gen')
    g.add_argument('ids', nargs='*')
    g.add_argument('--all-seeds', action='store_true')
    g.add_argument('--nth', type=int, default=0, help='which seed of each sound (0 = the first)')
    g.add_argument('--part', choices=['long', 'short'])
    k = sub.add_parser('look')
    k.add_argument('id')
    k.add_argument('--seed', type=int)
    for name in ('audition', 'make', 'check'):
        p = sub.add_parser(name)
        p.add_argument('ids', nargs='*')
        if name == 'audition':
            p.add_argument('--only', nargs='*', help='candidate names')
    sub.add_parser('manifest')
    a = ap.parse_args()
    if a.cmd == 'list':
        for sid in ORDER:
            s = V9[sid]
            print(f"{sid:22s} {s['row']:22s} {s['kind']:5s} {s['dur']:4.0f} s  seeds {s['seeds']}  "
                  f"use {s.get('use')}")
    elif a.cmd == 'gen':
        ids = a.ids or [i for i in ORDER if a.part is None or (i in LONG) == (a.part == 'long')]
        gen(ids, a.all_seeds, a.nth)
    elif a.cmd == 'look':
        look(a.id, a.seed)
    elif a.cmd == 'audition':
        audition(a.ids or ORDER, a.only)
    elif a.cmd == 'make':
        make(a.ids or ORDER)
    elif a.cmd == 'check':
        check(a.ids or ORDER)
    elif a.cmd == 'manifest':
        manifest()


if __name__ == '__main__':
    main()
