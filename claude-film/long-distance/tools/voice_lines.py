"""Voice every line in audio/vo/script_vo.json (Gemini TTS), several takes where a line carries the film.

  python3 tools/voice_lines.py [--redo L007_t2,L022_t1 ...] [--force]

Writes audio/vo/takes/<id>_t<n>.wav (24 kHz mono, as returned). Existing takes are kept unless named in --redo
(or --force). Then run tools/voice_check.py with the earshot venv's Python to verify each take against the script
by speech recognition, rank the takes with earshot, choose, and write audio/vo/voice_map.json.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from audition import gemini  # the same request as the audition: direction in a speech_metadata annotation

ROOT = os.path.join(os.path.dirname(__file__), '..')


def main():
    a = sys.argv[1:]
    redo = set(a[a.index('--redo') + 1].split(',')) if '--redo' in a else set()
    force = '--force' in a
    spec = json.load(open(os.path.join(ROOT, 'audio/vo/script_vo.json')))
    out = os.path.join(ROOT, 'audio/vo/takes'); os.makedirs(out, exist_ok=True)
    for L in spec['lines']:
        if L.get('same_as'): continue
        v = spec['voices'][L['speaker']]
        for t in range(1, L.get('takes', 1) + 1):
            name = f"{L['id']}_t{t}"; dst = os.path.join(out, name + '.wav')
            if os.path.exists(dst) and not force and name not in redo: continue
            gemini(v['voice'], L, dst)
            print(f"{name}  {L['speaker']}  {L['text']}")


if __name__ == '__main__':
    main()
