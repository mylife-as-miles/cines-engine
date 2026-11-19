"""Write the opus-sound-layer cue sheet (audio/cues.json) from the film's own score: every one-shot cue the
sequences schedule (out/score.json, from tools/score.js) on the film's global clock, with the sound film/sfx_map.js
picks for it. Nothing is typed by hand: times come from the sequences' timing code.

  python3 tools/cuesheet.py out/score.json out/bed.wav audio/cues.json --kit audio/kit
Paths in the sheet are relative to the film folder, so run the mixer from there:
  uv run sound-layer/scripts/mix.py audio/cues.json --out out/audio
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
score_f, bed_f, out_f = sys.argv[1:4]
kit = sys.argv[sys.argv.index('--kit') + 1]
src = open(os.path.join(ROOT, 'film', 'sfx_map.js')).read()
body = src[src.index('cues:') + 5:]; body = body[:body.rindex('}')]          # the object after "cues:"
MAP = json.loads(body.strip().rstrip(';').strip())
S = json.load(open(score_f))
rot = {}


def pick(name, key, lst):
    k = (name, key); i = rot.get(k, 0); rot[k] = i + 1
    return lst[i % len(lst)]


def resolve(s):
    out = []
    for tok in s.split('+'):
        kind, val = tok.split(':', 1)
        if kind == 'sfx':
            p = os.path.join('audio', 'sfx', val + '.flac')           # relative: run mix.py from the film folder
            if not os.path.exists(os.path.join(ROOT, p)): raise SystemExit('missing ' + p)
            out.append(p)
        elif kind == 'lib':
            if not os.path.exists(os.path.join(ROOT, kit, val + '.wav')): raise SystemExit('missing library sound ' + val)
            out.append(val)
    return '+'.join(out)


cues, holes, n_drop = [], [], 0
for seq in S:
    t0g = seq['start']
    for h in seq['holes']: holes.append([round(t0g + h['t0'], 3), round(t0g + h['t0'] + h['dur'], 3)])
    for ci, c in enumerate(seq['cues']):
        m = MAP[c['name']]
        if m['sound'] in ('code', 'none'): continue                                   # the engine plays it (into the bed stem)
        p, t, name = c['p'], c['t'], c['name']
        if any(h['t0'] - 0.01 <= t <= h['t0'] + h['dur'] for h in seq['holes']): n_drop += 1; continue
        weight, align = m.get('weight', 'support'), m.get('align', 'peak')
        lst = m['sound']
        if name == 'hit' and p.get('decay', 1) < 0.3: lst, weight = m['small'], 'support'
        if name == 'hit' and p.get('level', -12) < -20: weight = 'support'
        if 'hero_from' in m and p.get('level', 0) < m['hero_from']: weight = 'support'
        if name == 'swell' and p.get('dur', 1.5) >= 1.0: lst = m['long']
        ts = [t]
        at = m.get('at')
        if at and at.startswith('dur'): ts = [t + float(at[3:]) * p.get('dur', 0.6 if name != 'land.kay' else 0.4)]
        per = m.get('per')
        if per == 'word':
            n = max(1, min(m['max'], p.get('words', 1))); d = p.get('dur') or n * 0.16
            ts = [t + d * i / n for i in range(n)]
        elif per == 'spread':
            n = max(1, min(m['max'], round(p.get('chars', 10) / 2))); d = p.get('dur') or 0.5
            ts = [t + d * i / n for i in range(n)]
        if m.get('repeat'):
            n = min(m.get('max', 12), p.get('n', 3)); g = p.get('gap', 0.16 if name == 'knock' else 0.0375 if name == 'Q02.type' else 0.42)
            ts = [t + i * g for i in range(0, n, m.get('every', 1))]       # every: thin a fast run to one hit in k
        for k, tt in enumerate(ts):
            ev = dict(id=f"{seq['id'][:3]}-{name}-{ci}-{k}", t=round(t0g + tt, 4), sound=resolve(pick(name, 's', lst)), weight=weight, align=align)
            if p.get('pan'): ev['pan'] = p['pan']
            if name in ('Q01.smash', 'boom') and k == 0: ev['visual'] = 'cut'
            if name == 'boom': ev['stop_before'] = True
            cues.append(ev)
        if 'then' in m:
            cues.append(dict(id=f"{seq['id'][:3]}-{name}-{ci}-b", t=round(t0g + t + m['then']['dt'], 4), sound=resolve(pick(name, 'b', m['then']['sound'])), weight='support', align='peak'))
        if 'end' in m:
            cues.append(dict(id=f"{seq['id'][:3]}-{name}-{ci}-e", t=round(t0g + t + (p.get('dur') or 0.5), 4), sound=resolve(m['end']), weight='support', align='peak'))
# a card flicked and slapped down 0.11 s later reads as one move: keep the slap
cues.sort(key=lambda c: c['t'])
slaps = [c['t'] for c in cues if '-slap-' in c['id']]
cues = [c for c in cues if not ('-flick-' in c['id'] and any(0 < s - c['t'] < 0.15 for s in slaps))]
total = S[-1]['start'] + S[-1]['dur']
# the Dispatcher, the film's only spoken voice (tools/dispatcher_tts.py + tools/voice_place.py): each line starts with
# its on-screen entrance; the mixer levels the voice and ducks the music under it
voice = []
vl = os.path.join(ROOT, 'audio', 'voice', 'lines.json')
if os.path.exists(vl):
    for L in json.load(open(vl))['lines']:
        f = os.path.join('audio', 'voice', 'phone', L['id'] + '.wav')
        if os.path.exists(os.path.join(ROOT, f)): voice.append({'file': f, 'start_s': L['start_s'] + 0.05})
# the tension layer (tools/tension.py: Stable Audio sound design), each sound on its moments from the film's timing
tp = os.path.join(ROOT, 'audio', 'tension', 'plan.json')
if os.path.exists(tp):
    for snd in json.load(open(tp))['sounds']:
        f = os.path.join('audio', 'tension', snd['id'] + '.wav')
        if not os.path.exists(os.path.join(ROOT, f)): continue
        for k, pl in enumerate(snd['places']):
            cues.append(dict(id=f"tension-{snd['id']}-{k}", t=pl['t'], sound=f, weight='support', align=pl['align']))
    cues.sort(key=lambda c: c['t'])
# planned silences: the Extra's holes, and every span the score itself leaves silent (the smash cuts, the end)
if os.path.exists(bed_f):
    import subprocess
    err = subprocess.run(['ffmpeg', '-v', 'info', '-i', bed_f, '-af', 'silencedetect=noise=-50dB:d=0.5', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', err)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)] + [total]
    holes += [[round(max(0, a), 3), round(b, 3)] for a, b in zip(st, en)]
sheet = dict(fps=24, duration_s=round(total, 3), energy='calm', kit=kit, room={'decay_s': 0.6, 'wet_db': -16},
             music={'file': os.path.relpath(os.path.abspath(bed_f), ROOT), 'start_s': 0, 'loop': False, 'fade_out_s': 0.05},
             silence_ok=holes, cues=sorted(cues, key=lambda c: c['t']))
if voice: sheet['voice'] = voice
os.makedirs(os.path.dirname(out_f) or '.', exist_ok=True)
json.dump(sheet, open(out_f, 'w'), indent=1)
print(f"{len(voice)} voice lines; {len(holes)} planned silences; {len(cues)} events from {sum(len(s['cues']) for s in S)} score cues ({n_drop} inside the Extra's silences dropped); "
      f"{sum(c['weight'] == 'hero' for c in cues)} hero; {total:.1f} s")
