"""The tension layer: designed sounds made with Stable Audio 3.0 Small SFX (Stability AI Community License), run locally
through Soundbox (github.com/HamSanders/soundbox) and audio.cpp. Each is placed on a moment from the film's own timing
(the Extra's holes and the story's hits; times in GLOBAL film seconds from tools/score.js) and handed to the mixer by
tools/cuesheet.py.

  SOUNDBOX_AUDIOCPP_BIN=... python3 tools/tension.py [--only T01] [--force]     -> audio/tension/<id>.wav, plan.json

Every prompt asks for sound design, not music, so it sits under the Lyria score instead of competing with it.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SOUNDBOX = os.environ.get('SOUNDBOX_CLI', '/home/user/hamsanders/soundbox/server/dist/cli.js')
MODEL = 'audiocpp-stable-audio-3-sfx'
SUCK = 'a reversed breath and room tone being sucked inward, rising and stopping dead, eerie, no music'
# id: (prompt, duration_s, seed, [(time, align)]); align 'end' ends the sound on the moment, 'start' starts on it
PLAN = {
    'T01': ('deep sub-bass pressure slowly building, distant low rumble, dark ominous tension, no music', 9, 11, [(30.80, 'end')]),
    'T02a': (SUCK, 3, 21, [(283.50, 'end'), (505.67, 'end'), (644.03, 'end')]),
    'T02b': (SUCK, 3, 22, [(360.02, 'end'), (547.58, 'end'), (838.58, 'end')]),
    'T02c': (SUCK, 3, 23, [(474.31, 'end'), (605.78, 'end')]),
    'T03': ('a faint eerie low tone swelling slowly with a cold shimmer, intrigue, unsettling, no music', 4, 31, [(117.65, 'end')]),
    'T04': ('a deep heavy dark impact with a long low rumbling tail, ominous, cinematic', 5, 41, [(519.14, 'start')]),
    'T05': ('a thin high-pitched electronic whine of an old camera flash charging up, quiet, rising, then a tiny click', 3, 52, [(537.85, 'start')]),
    'T06': ('a steel blade ringing with a thin sustained metallic tone, tense and unsettling, slow', 8, 61, [(631.05, 'start')]),
    'T07': ('a slow tense rising roar of gas and metal building to a peak, pressure, dread', 6, 71, [(756.90, 'end')]),
    'T08': ('a house groaning, deep wooden beams and metal straining, structural creak and low rumble', 6, 81, [(816.40, 'start')]),
    'T09': ('a slow dark low swell rising and cutting off abruptly, ominous final breath', 7, 91, [(885.40, 'end')]),
}


def main():
    a = sys.argv[1:]
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    d = os.path.join(ROOT, 'audio', 'tension'); os.makedirs(d, exist_ok=True)
    for tid, (prompt, dur, seed, places) in PLAN.items():
        dst = os.path.join(d, tid + '.wav')
        if (only and tid not in only) or (os.path.exists(dst) and '--force' not in a): continue
        subprocess.run(['node', SOUNDBOX, 'run', MODEL, prompt, '--duration', str(dur), '--seed', str(seed), '--out', dst, '--yes'],
                       check=True, capture_output=True)
        print(tid, 'ok', dur, 's', flush=True)
    json.dump({'model': 'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp, Soundbox)', 'license': 'Stability AI Community License',
               'sounds': [{'id': k, 'prompt': p, 'duration_s': du, 'seed': s, 'places': [{'t': t, 'align': al} for t, al in pl]}
                          for k, (p, du, s, pl) in PLAN.items()]},
              open(os.path.join(d, 'plan.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
