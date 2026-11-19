"""Listen to key moments of the final mix with earshot (github.com/Leonxlnx/earshot): describe each excerpt and match it
against what it should be.  <earshot venv>/bin/python tools/listen.py out/audio/mix.wav out/listen  -> listen.json"""
import json, subprocess, sys, os
from earshot import api

MIX = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
MOMENTS = [
    ('cold_open_fire', 22.0, 30.7, 'a house fire burning with crackling flames and breaking glass', ['heavy rain', 'applause', 'radio static']),
    ('doorbell', 55.4, 57.6, 'a doorbell ringing ding dong', ['a church bell', 'a microwave beep', 'a phone ringing']),
    ('party', 160.0, 166.0, 'people laughing and chatting at a party', ['an audience applauding', 'rain on a window', 'a sports crowd cheering']),
    ('crash', 360.4, 362.6, 'pots, pans and glass crashing to the floor', ['a door slam', 'a gunshot', 'a cymbal crash']),
    ('scream', 610.3, 613.3, 'a woman screaming in terror', ['a woman singing', 'a siren', 'a child laughing']),
    ('explosion', 756.6, 759.6, 'a gas explosion in a house', ['thunder', 'a door slam', 'fireworks']),
    # the score, in the mix: it must read as music under the room, not vanish into it
    ('score_M01', 6.0, 25.6, 'a quiet, dark film score with cello and piano', ['no music, only room noise', 'a pop song', 'a fire crackling with no music']),
    ('score_M08a', 450.0, 470.0, 'quiet, tense chamber string music', ['no music, only room noise', 'a pop song', 'people talking with no music']),
    ('score_M10a', 590.0, 606.0, 'tense, grinding string music', ['no music, only noise', 'a pop song', 'a gas hiss with no music']),
    ('score_M11b', 790.0, 830.0, 'a slow, sad cello film score', ['no music, only noise', 'a pop song', 'a phone call with no music']),
]
res = {}
for name, a, b, q, alts in MOMENTS:
    f = os.path.join(OUT, name + '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', MIX, f], check=True)
    d = api.describe(f); m = api.match(f, q, alts=alts)
    res[name] = {'t': [a, b], 'describe': d.get('summary') if isinstance(d, dict) else str(d),
                 'match': m.get('summary') if isinstance(m, dict) else str(m)}
    print(f"== {name} {a}-{b}\n  describe: {res[name]['describe']}\n  match '{q}': {res[name]['match']}", flush=True)
json.dump(res, open(os.path.join(OUT, 'listen.json'), 'w'), indent=1)
