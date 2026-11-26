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

The table (V9) is the plan: for each id the review's row, the prompt, the asked length, every seed tried, the
candidate that is delivered (`use`) and how it is cut and finished (`cut`). Raw takes are cached by prompt, seed and
length, so a rebuild on the same machine is exact; on another machine the generator gives the same take for the same
seed only if audio.cpp and the weights are the same builds.

Finishing, the same for every sound: 48 kHz (soxr), cut to the event with 50 ms of the take kept before the first
onset (beds: the steadiest stretch, never the take's first second), the mean and everything under 20 Hz removed,
raised-cosine fades at both ends, sample peak at -3 dBFS, 24-bit stereo FLAC. No reverb, no EQ unless the table says
so. Levels and tone are the mix's business.

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
# id -> row (the review's), kind ('shot' one event, 'multi' several events in one file, 'bed'), prompt, dur (asked),
# seeds (every seed tried, in order), check (description, alternatives), and later `use` and `cut`.
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
    32, [917, 1917, 2917], ('wind blowing across an open field', FIELD_ALTS))
snd('wind_vale_farmland', 'R17 (alternative bed)', 'bed',
    'Open farmland under a heavy overcast sky, light steady wind over wet grass and a dry-stone wall, wide, quiet',
    32, [927, 1927, 2927], ('wind blowing across an open field', FIELD_ALTS))
snd('wind_altitude_arches', 'R18', 'bed',
    'High thin wind moaning through tall open stone arches at great height, hollow and airy, steady with slow swells',
    32, [918, 1918, 2918],
    ('wind in an open high place', ['ocean waves', 'static hiss', 'a waterfall', 'rain']))
snd('rockfall_boom', 'R1a', 'shot',
    'One enormous distant rockfall boom heard across a wide valley, a deep heavy impact that rolls like thunder and '
    'dies slowly, outdoors, far away',
    6, [901, 1901, 2901],
    ('a huge rockfall boom far away', ['a kick drum', 'a sub bass drop', 'a door slam', 'a close explosion']))
BODY_PROMPT = ('A mountainside collapsing far away: thousands of tons of rock and boulders sliding, tumbling and '
               'grinding, a continuous heavy roar of stone with cracks and knocks inside it, outdoors, heard across '
               'a valley')
BODY_CHECK = ('the roar of a rockslide, an avalanche of rock',
              ['a jet engine', 'strong wind in a microphone', 'a train passing', 'thunder', 'ocean waves'])
snd('rockfall_body_a', 'R1b', 'bed', BODY_PROMPT, 10, [911, 1911, 2911, 3911], BODY_CHECK)
snd('rockfall_body_b', 'R1b', 'bed', BODY_PROMPT, 10, [912, 1912, 2912, 3912], BODY_CHECK)
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
    2, [904, 1904, 2904],
    ('a wooden bowl set down on stone',
     ['a box lid closing', 'a metal pan clanging', 'a door knock', 'a plastic object dropped']))
snd('hoe_chop', 'R5', 'multi',
    'An iron hoe chopping into wet heavy soil, one dull earthy chop with a little grit, slow steady work, heard '
    'from far across an open field',
    4, [905, 1905, 2905],
    ('a hoe chopping into soil, far away',
     ['a stick snapping', 'a camera shutter click', 'a sword being drawn', 'a metal latch']))
snd('run_boots_mud', 'R11', 'multi',
    'A heavy man sprinting across a wet ploughed field in leather boots, fast heavy squelching footsteps in mud, '
    'close',
    6, [9111, 10111, 11111],
    ('a man running in wet mud',
     ['footsteps on a hard floor', 'sneakers squeaking on a gym floor', 'a horse galloping', 'hands clapping']))
snd('run_breath', 'R11', 'multi',
    'A man panting hard while running, heavy fast breaths, close',
    5, [9112, 10112, 11112],
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
    2, [909, 1909, 2909],
    ('a wooden bowl lifted off stone, water slopping', ['a footstep', 'a door knock', 'a heavy thud']))
snd('grab_run_up', 'R10', 'shot',
    'A heavy man running up through mud and snatching up a child, two hard squelching boot steps, thick wool cloth '
    'whipping, one grunt of effort, close',
    3, [910, 1910, 2910],
    ('a man running up in heavy boots and grabbing a child, cloth and breath',
     ['a door slamming', 'a horse galloping', 'furniture moved', 'a rubber squeak']))
snd('bowl_slop', 'R11', 'multi',
    'Water slopping in a wooden bowl carried at a run, small splashes',
    4, [9113, 10113, 11113],
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
    6, [914, 1914, 2914],
    ('a colossal weight landing',
     ['a door closing with a latch', 'a wooden crate dropped', 'a drawer closing', 'coins dropping']))
snd('chains_heavy', 'R15', 'multi',
    'Four massive iron anchor chains going slack and swinging, huge heavy links clanking slowly against each other, '
    'deep heavy iron, in a stone tower',
    5, [915, 1915, 2915],
    ('heavy iron chains going slack', ['coins dropping', 'keys jingling', 'a door latch', 'a small light chain']))
snd('bell_ram_clang', 'R16', 'shot',
    'A huge timber and iron ram striking an enormous bronze bell once, a colossal deep metallic boom, heavy impact',
    4, [916, 1916, 2916],
    ('an enormous bronze bell struck once', ['a gong', 'a singing bowl', 'a doorbell', 'a cinematic boom']))
snd('applause_gloved_vast', 'R19', 'bed',
    'Ten thousand people clapping softly in thick gloves in a vast stone cathedral, a dense dull padded patter, far '
    'away, very reverberant',
    10, [919, 1919, 2919],
    ('a huge crowd applauding softly, far away',
     ['a small group clapping', 'sharp loud hand clapping', 'rain', 'horses galloping']))
snd('bowl_buzz_on_stone', 'extra (the lead\'s)', 'multi',
    'A wooden bowl of water rattling faintly on a stone surface, a rapid tiny wooden chatter and ticking, very '
    'close, quiet',
    3, [932, 1932, 2932],
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
#   hp, lp Butterworth corners in Hz (zero-phase)
#   fin, fout   raised-cosine fades of the segment
#   gain   dB after the segment is normalised to its own peak;  at   where it starts in the file, seconds
#   event  False if the segment's onset is not to be listed as an event (an under-layer)

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
        x = F.butter(x, g['lp'], 'lowpass', 2)
    x = F.fade(x, g.get('fin', 0.004), g.get('fout', 0.08))
    x = x / max(np.abs(x).max(), 1e-12) * F.lin(g.get('gain', 0.0))
    how['used_source_s'] = [round((a + cut) / SR, 3), round((a + cut) / SR + len(x) * sp / SR, 3)]
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
        t += f", low-pass {g['lp']:g} Hz"
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
    bed = s['kind'] == 'bed'
    y = F.fade(y, 0.003 if not bed else recipe[0].get('fin', 0.25), recipe[-1].get('fout', 0.08))
    gain = F.lin(PEAK_DB) / np.abs(y).max()
    y *= gain
    rec = {'layers': lines, 'sources': hows, 'onsets_s': sorted(onsets),
           'finish': f'mean and under-20 Hz removed, ends faded, gain {F.db(gain):+.1f} dB to a sample peak of '
                     f'{PEAK_DB:g} dBFS, true peak {F.db(F.true_peak(y)):+.1f} dBTP'}
    return y, rec


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


def events(x, thr_db=-26.0, gap=0.12, floor_db=-45.0):
    """onsets of separate events in a file: the envelope (10 ms peaks) rising through `thr_db` under the file's
    peak after it has been under it for `gap` s. Each is then walked back to where it left `floor_db`.
    Returns [(onset s, peak dB re file peak, length s)]."""
    env, dt = envelope(x, 5)
    pk = env.max() + 1e-12
    hot = env >= pk * F.lin(thr_db)
    out, i, n, g = [], 0, len(env), int(gap / dt)
    while i < n:
        if hot[i]:
            j = i
            last = i
            while j < n and j - last <= g:
                if hot[j]:
                    last = j
                j += 1
            k = i
            while k > 0 and env[k - 1] >= pk * F.lin(floor_db) and i - k < int(0.08 / dt):
                k -= 1
            out.append((round(k * dt, 3), round(F.db(env[i:last + 1].max() / pk), 1), round((last + 1 - k) * dt, 3)))
            i = j
        else:
            i += 1
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
    for t, d, ln in events(x):
        print(f'  event at {t:7.3f} s  {d:6.1f} dB  {ln:.2f} s long')


# ------------------------------------------------------------------------------------------------- listening

def hear(path, s, realness=None):
    r = F.listen(path, s['check'][0], s['check'][1])
    for text, alts in s.get('probes') or []:
        from earshot import api
        m = api.match(path, text, alts=alts)
        ok, why = F.judge(m)
        r.setdefault('probes', []).append({'description': text, 'alternatives': alts, 'pass': ok, 'result': why})
    if realness if realness is not None else s['kind'] == 'bed':
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
        info = {'file': os.path.relpath(path, ROOT), 'seconds': round(len(y) / SR, 3), 'candidate': s['use'],
                'onsets_s': [e[0] for e in ev] if ev else rec['onsets_s'], 'made': rec}
        if ev:
            info['events'] = [{'onset_s': e[0], 'peak_db_re_file_peak': e[1], 'length_s': e[2]} for e in ev]
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
        c.setdefault(sid, {})['delivered'] = r
        save_check(c)
        print(f"{sid:22s} {short(r)}", flush=True)


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
