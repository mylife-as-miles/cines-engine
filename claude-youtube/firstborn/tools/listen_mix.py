"""Listen to the finished mix with earshot: the music beds (on the music stem) and the busiest narration windows (on the mix).

  python3 tools/listen_mix.py          -> out/mix/listen.json   (one earshot process via tools/ears.py)

Beds: each music span in out/mix/report.json is matched (on stems/music.flac, past its fades) against what it must be
(warm Afro-pop / festive highlife / gentle and sincere / a closing that ends on a chord) and what it must not be (a song
with vocals, someone singing, chanting, a heavy drum beat, dark music). Narration: the three 8 s windows with the most
effect cues, plus the windows the story leans on (the hook's stamps, the courtroom, the salary, the party hall, the
sincere turn, the call), each matched on the mix against 'a woman talking over soft background music' with the ways
it can fail as alternatives. The end screen: does the closing bed end on a final chord. Run it after build_mix.py, and
never at the same time as a render or a mix (15 GB of RAM, no swap).
"""
import json, os, re, subprocess, tempfile
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIX = os.path.join(ROOT, 'out', 'mix')
EARSHOT_PY = os.environ.get('EARSHOT_PY', '/home/user/leonxlnx/earshot/.venv/bin/python')
BED_WANT = {'main_a': 'warm, playful African highlife background music with a bright clean guitar, kalimba, marimba and a shaker',
            'main_b': 'warm, playful African highlife background music with a bright clean guitar, kalimba, marimba and a shaker',
            'party': 'light, festive African highlife music with bright interlocking guitars and soft percussion',
            'sincere': 'gentle, warm, tender fingerpicked acoustic guitar and kalimba, soft and hopeful',
            'end': 'warm, playful African highlife music with guitar and kalimba that ends on a final chord'}
BED_NOT = ['a pop song with vocals', 'a person singing', 'people chanting', 'a heavy drum beat', 'dark, tense suspense music']
VOICE_Q = 'a woman talking over soft background music'
VOICE_ALTS = ['background music drowning out a voice', 'loud sound effects drowning out a voice', 'a woman talking with no music',
              'people chanting']
STORY = [('hook: the four NO stamps', 7.0, 15.0), ('the sneezes and the hospital run', 38.0, 50.0),
         ('the courtroom: cry, gavel, the name meter', 93.0, 111.0), ('the first salary: alert, ka-ching, the calls', 198.0, 210.0),
         ('the bills and the family bank', 213.0, 233.0), ('the party hall: murmur, rice pot, United Nations', 263.0, 292.0),
         ('Not if. When. and the turn to sincere', 288.0, 300.0), ('the honest part', 300.0, 340.0), ('the advice', 342.7, 365.9),
         ('the wrap and the call', 365.9, 401.5)]


def summary_pct(s, q):
    fc = dict((m.group(1), float(m.group(2).replace('<1', '0.5').replace('>99', '99.5'))) for m in
              re.finditer(r"'([^']+)' ([<>]?\d+)%", s[s.find('Forced choice'):s.find('It sounds')] if 'Forced choice' in s else ''))
    return fc


def main():
    rep = json.load(open(os.path.join(MIX, 'report.json')))
    mix, music = os.path.join(MIX, 'firstborn_mix.wav'), os.path.join(MIX, 'stems', 'music.flac')
    jobs = []
    for sp in rep['music']:
        a, b = sp['t0'] + 2.0, sp['t1'] - 2.0
        if b - a < 6: continue
        jobs.append({'key': f"bed {sp['var']} {sp['t0']:.1f}-{sp['t1']:.1f}", 'op': 'match', 'path': music, 'start': a, 'end': b,
                     'query': BED_WANT[sp['var']], 'alts': BED_NOT})
    # the busiest 8 s windows by effect count
    ts = np.array([c['placed_t'] for c in rep['effects']['cues']]); T = float(rep['total'])
    starts = np.arange(0, T - 8, 0.5); counts = [int(((ts >= s) & (ts < s + 8)).sum()) for s in starts]
    busy = []
    for i in np.argsort(counts)[::-1]:
        s = float(starts[i])
        if all(abs(s - b) >= 8 for b, _ in busy): busy.append((s, counts[i]))
        if len(busy) == 3: break
    for s, n in busy:
        jobs.append({'key': f'busiest {s:.1f}-{s + 8:.1f} ({n} effects)', 'op': 'match', 'path': mix, 'start': s, 'end': s + 8,
                     'query': VOICE_Q, 'alts': VOICE_ALTS})
    for name, a, b in STORY:
        jobs.append({'key': f'{name} {a:.1f}-{b:.1f}', 'op': 'match', 'path': mix, 'start': a, 'end': b, 'query': VOICE_Q, 'alts': VOICE_ALTS})
    jobs.append({'key': 'party murmur alone (fx stem) 264-291', 'op': 'match', 'path': os.path.join(MIX, 'stems', 'fx.flac'), 'start': 264.0,
                 'end': 271.0, 'query': 'a crowd of people murmuring softly in a hall', 'alts': ['people chanting', 'applause', 'rain', 'wind']})
    jobs.append({'key': f'end screen {T - 8:.1f}-{T:.1f}', 'op': 'match', 'path': mix, 'start': T - 8.0, 'end': T,
                 'query': 'warm, playful music ending on a final chord', 'alts': ['a woman talking', 'a pop song with vocals', 'music cut off abruptly', 'silence']})
    jobs.append({'key': 'describe end screen', 'op': 'describe', 'path': mix, 'start': T - 8.0, 'end': T})
    jf = tempfile.mktemp(suffix='.json'); rf = jf + '.out'; json.dump(jobs, open(jf, 'w'))
    subprocess.run([EARSHOT_PY, os.path.join(ROOT, 'tools', 'ears.py'), jf, rf, '--threads', os.environ.get('EARSHOT_THREADS', '3')],
                   check=True, capture_output=True)
    res = json.load(open(rf)); os.remove(jf); os.remove(rf); out = {}
    for j in jobs:
        r = res.get(j['key'], {}); s = r.get('summary', '') or r.get('error', '')
        fc = summary_pct(s, j.get('query', '')) if j['op'] == 'match' else {}
        out[j['key']] = {'query': j.get('query'), 'forced_choice': fc, 'verdict': r.get('verdict'), 'z': r.get('z'), 'summary': s}
        top = ', '.join(f'{k} {v:g}%' for k, v in sorted(fc.items(), key=lambda kv: -kv[1])[:3])
        print(f"{j['key']:58s} {top if fc else s[:200]}")
    json.dump(out, open(os.path.join(MIX, 'listen.json'), 'w'), indent=1)
    print('wrote out/mix/listen.json')


if __name__ == '__main__':
    main()
