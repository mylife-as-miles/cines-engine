"""Listen to the finished mix with earshot at the moments the film turns on, and measure them.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/listen.py [out/audio/mix.flac]   -> audio/reports/earshot_listen.json

The moments come from the cue sheet (out/cuesheet.json), so a re-timed picture moves them:
  first_line   L001 "Tell me about your day.": the phone's voice, dry and close
  knocks       the three knocks (Q08)
  screen_dark  the screen going dark (Q10 phone_dim): the room's level before, in the drop, and after
  are_you      L024 "Are you there?" (him, in the room) and L025 "Yes." (the phone, at once): each heard on its own
  title        the black and the title (Q11's silence): must be silent
For each: earshot describe, a forced-choice match against the right alternatives, and momentary loudness (BS.1770,
400 ms) and sample peak from the master.
"""
import json, os, sys
import numpy as np, soundfile as sf, pyloudnorm as pyln

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
os.environ.setdefault('EARSHOT_THREADS', '2')
from earshot import api  # noqa: E402


def main():
    mixp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out', 'audio', 'mix.flac')
    cs = json.load(open(os.path.join(ROOT, 'out', 'cuesheet.json')))
    x, sr = sf.read(mixp); m = pyln.Meter(sr, block_size=0.4)
    voice = {c['p']['id']: c for c in cs['cues'] if c['name'] == 'voice'}
    cue = lambda name, seq: [c for c in cs['cues'] if c['name'] == name and c['seq'] == seq]

    def level(a, b):
        seg = x[max(0, int(a * sr)):int(b * sr)]
        if len(seg) < int(0.45 * sr): seg = np.concatenate([seg, np.zeros((int(0.45 * sr) - len(seg), 2))])
        v = m.integrated_loudness(seg); pk = 20 * np.log10(np.abs(seg).max() + 1e-12)
        return {'lufs': round(float(v), 1) if np.isfinite(v) else None, 'peak_dbfs': round(float(pk), 1)}

    def hear(key, a, b, query, alts):
        d = api.describe(mixp, start=a, end=b); mt = api.match(mixp, query, alts=alts, start=a, end=b)
        return {'window_s': [round(a, 2), round(b, 2)], 'level': level(a, b), 'describe': d.get('summary'), 'match': mt.get('summary')}

    rep = {}
    L1 = voice['L001']; t = L1['tg']; rep['first_line'] = hear('first_line', t, t + L1['p']['dur'] + 0.1, 'a woman speaking softly, very close and intimate',
                                                             ['a woman speaking in a room with an echo', 'a woman speaking on the telephone', 'a man speaking'])
    k = cue('knock', 'Q08'); a, b = k[0]['tg'] - 0.25, k[-1]['tg'] + 0.6
    rep['knocks'] = hear('knocks', a, b, 'knocking on a wooden door', ['footsteps', 'a door closing', 'hammering a nail'])
    rep['knocks']['each'] = [level(c['tg'] - 0.05, c['tg'] + 0.25) for c in k]
    rep['knocks']['room_before'] = level(a - 3, a - 0.3)
    d = cue('phone_dim', 'Q10')[0]['tg']
    rep['screen_dark'] = {'t': round(d, 2), 'before (-6..-3.5 s)': level(d - 6, d - 3.5), 'held breath (-2..0 s)': level(d - 2, d),
                          'drop (+1.3..+2.5 s)': level(d + 1.3, d + 2.5), 'after (+4..+6 s)': level(d + 4, d + 6),
                          'describe_drop': api.describe(mixp, start=d + 1.0, end=d + 2.6).get('summary')}
    L24, L25 = voice['L024'], voice['L025']
    rep['are_you'] = {'gap_s': round(L25['tg'] - (L24['tg'] + L24['p']['dur']), 2),
                      'him': hear('him', L24['tg'], L24['tg'] + L24['p']['dur'] + 0.15, 'a man speaking softly in a room',
                                  ['a man speaking on the telephone', 'a woman speaking', 'a man whispering']),
                      'yes': hear('yes', L25['tg'], L25['tg'] + L25['p']['dur'] + 0.1, 'a woman saying one word softly, very close',
                                  ['a woman speaking in a room with an echo', 'a woman speaking on the telephone', 'a man speaking'])}
    s = cs['silences'][-1]; seg = x[int(s['t0g'] * sr) + int(0.05 * sr):int(s['t1g'] * sr)]
    rep['title'] = {'window_s': [s['t0g'], s['t1g']], 'peak_dbfs': round(float(20 * np.log10(np.abs(seg).max() + 1e-12)), 1),
                    'rms_dbfs': round(float(10 * np.log10(np.mean(seg ** 2) + 1e-20)), 1)}
    os.makedirs(os.path.join(ROOT, 'audio', 'reports'), exist_ok=True)
    out = os.path.join(ROOT, 'audio', 'reports', 'earshot_listen.json'); json.dump(rep, open(out, 'w'), indent=1, default=str)
    print(json.dumps(rep, indent=1, default=str))


if __name__ == '__main__':
    main()
