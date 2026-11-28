"""Check every finished effect in audio/sfx/ with earshot: a forced choice against what it must be and what it could be
mistaken for, plus its z against earshot's own 322 descriptions. One earshot process (tools/ears.py), models load once.

  python3 tools/sfx_check.py      -> audio/sfx/check.json

Pass rule (sound.md §4): the description beats every alternative and z >= 3, or holds >= 60 % of the choice and twice
the best alternative. A fail is evidence, not a veto: the ear decides (see audio/README.md for the accepted ones).
"""
import json, os, re, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EARSHOT_PY = os.environ.get('EARSHOT_PY', '/home/user/leonxlnx/earshot/.venv/bin/python')
CHECKS = {
    'phone_buzz': ('a phone vibrating', ['an electric shaver', 'a bee buzzing', 'a car engine idling', 'a doorbell']),
    'notify': ('a notification chime', ['a doorbell', 'glass breaking', 'a bird chirping', 'a gunshot']),
    'pop': ('a bubble pop', ['a gunshot', 'a door knock', 'a water drop', 'a mouse click']),
    'pop_2': ('a bubble pop', ['a gunshot', 'a door knock', 'a water drop', 'a mouse click']),
    'pop_3': ('a bubble pop', ['a gunshot', 'a door knock', 'a water drop', 'a mouse click']),
    'stamp': ('a heavy thud', ['a kick drum', 'a gunshot', 'glass breaking', 'a bell']),
    'camera_shutter': ('a camera shutter', ['a gunshot', 'a stapler', 'typing on a keyboard', 'a door closing']),
    'typing': ('typing on a phone', ['a clock ticking', 'typing on a keyboard', 'rain', 'footsteps']),
    'send': ('a message sent sound', ['a whoosh', 'a snare hit', 'a laser zap', 'a door closing']),
    'receive': ('a message received chime', ['a doorbell', 'glass breaking', 'a bird chirping', 'a phone ringing']),
    'ding': ('a bell ding', ['a gong', 'glass breaking', 'a phone ringing', 'a car horn']),
    'bulb': ('a magic sparkle chime', ['a doorbell', 'glass breaking', 'a wind chime', 'a phone ringing']),
    'cloud': ('a soft whoosh', ['an explosion', 'a gunshot', 'a cough', 'a door closing']),
    'whoosh': ('a whoosh', ['wind blowing', 'a car passing', 'an explosion', 'a sigh']),
    'whoosh_2': ('a whoosh', ['wind blowing', 'a car passing', 'an explosion', 'a sigh']),
    'footsteps': ('footsteps', ['a door knock', 'a clock ticking', 'a heartbeat', 'clapping']),
    'run': ('a person running', ['a person walking', 'a horse galloping', 'a drum roll', 'clapping']),
    'door': ('a door closing', ['a door knock', 'a gunshot', 'a drum hit', 'footsteps']),
    'wrong': ('an error sound', ['a doorbell', 'a success chime', 'a car horn', 'a dog barking']),
    'clang': ('a metal pan clang', ['a church bell', 'glass breaking', 'a gunshot', 'a door knock']),
    'stomach_drop': ('a descending slide whistle', ['a rising tone', 'a car horn', 'a siren', 'a bird chirping']),
    'wobble': ('a wobbly cartoon sound', ['a car engine', 'a siren', 'a dog growling', 'a phone ringing']),
    'bird': ('a bird chirping', ['a phone ringing', 'a whistle', 'a squeaky door', 'a mouse squeaking']),
    'battery_low': ('a low battery warning beep', ['a doorbell', 'a success chime', 'a car horn', 'a microwave beep']),
    'swell': ('a rising whoosh', ['a falling whoosh', 'an explosion', 'wind blowing', 'a car passing']),
    'rain': ('light rain', ['frying bacon', 'applause', 'a stream of water', 'static noise']),
    'grow': ('a happy ascending chime', ['a descending tone', 'an error sound', 'a doorbell', 'a gong']),
    'freeze': ('a tape slowing down to a stop', ['a rising tone', 'an explosion', 'a door closing', 'a car engine']),
    'click': ('a button click', ['a gunshot', 'a door knock', 'a water drop', 'a bell']),
    'dim': ('a descending blip', ['a rising blip', 'a doorbell', 'a gunshot', 'a bird chirping']),
    'plate_slide': ('something sliding across a table', ['a door closing', 'footsteps', 'paper tearing', 'a whoosh']),
}


def main():
    jobs = [{'key': k, 'op': 'match', 'path': os.path.join(ROOT, 'audio', 'sfx', k + '.flac'), 'query': q, 'alts': a}
            for k, (q, a) in CHECKS.items() if os.path.exists(os.path.join(ROOT, 'audio', 'sfx', k + '.flac'))]
    jf = tempfile.mktemp(suffix='.json'); rf = jf + '.out'; json.dump(jobs, open(jf, 'w'))
    subprocess.run([EARSHOT_PY, os.path.join(ROOT, 'tools', 'ears.py'), jf, rf, '--threads', '4'], check=True, capture_output=True)
    res = json.load(open(rf)); os.remove(jf); os.remove(rf); out = {}
    for k, r in res.items():
        s = r.get('summary', ''); q, alts = CHECKS[k]
        fc = dict((m.group(1), float(m.group(2).replace('<1', '0.5').replace('>99', '99.5'))) for m in
                  re.finditer(r"'([^']+)' ([<>]?\d+)%", s[s.find('Forced choice'):s.find('It sounds')] if 'Forced choice' in s else ''))
        mine = fc.get(q, 0.0); best_alt = max([v for kk, v in fc.items() if kk != q] or [0.0])
        z = r.get('z') if r.get('z') is not None else float((re.search(r'z ([+-]?\d+\.\d)', s) or [0, 0])[1])
        ok = (mine > best_alt and z >= 3) or (mine >= 60 and mine >= 2 * best_alt)
        out[k] = {'query': q, 'alts': alts, 'verdict': r.get('verdict'), 'z': z, 'forced_choice_pct': mine, 'best_alt_pct': best_alt,
                  'pass': bool(ok), 'summary': s}
        print(f"{k:15s} {'PASS' if ok else 'fail'}  z {z:+.1f}  {mine:5.1f}% vs {best_alt:5.1f}%  ({q})")
    json.dump(out, open(os.path.join(ROOT, 'audio', 'sfx', 'check.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
