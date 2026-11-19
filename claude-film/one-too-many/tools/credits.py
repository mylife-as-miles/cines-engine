"""Write audio/CREDITS.md: every recording the film plays (audio/credits.json) and every opus-sound-layer library
sound the cue sheet names (with the library's own credit). All CC0; credit given anyway.
  python3 tools/credits.py
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, 'audio')
cred = json.load(open(os.path.join(A, 'credits.json')))
cues = json.load(open(os.path.join(A, 'cues.json')))
cat = {e['id']: e for e in json.load(open(os.path.join(A, 'kit', 'catalog.json')))['sounds']}
lib = sorted({tok for c in cues['cues'] for tok in c['sound'].split('+') if not tok.startswith('audio/')})
L = ['# Sound credits', '', 'Every recording in the film is CC0 (public domain); credit is not required but given.', '',
     '## Recordings in `audio/` (found on Freesound, CC0 filter)', '']
for k in sorted(cred):
    m = cred[k]; L.append(f"- `{k}`: \"{m['title']}\" by {m['creator']}, CC0, {m['landing']}")
L += ['', '## From the opus-sound-layer library (`sfx.py kit`, hand-checked Freesound CC0 recordings)', '']
for i in lib:
    e = cat.get(i); src = f"https://freesound.org/s/{i.split('/')[1].split('-')[1]}/" if i.split('/')[1].startswith('fs-') else ''
    L.append(f"- `{i}`: {e['credit'] if e else '?'}, CC0, {src}")
L += ['', 'The score (the 7th-harmonic drone, the dread pad, the party e-piano, the unison), the tinnitus, phone tones',
      '(DTMF, ringback), the counting pings and the few designed sounds marked "code" in `film/sfx_map.js` are synthesised',
      'in `film/sound.js` and the sequences.']
open(os.path.join(A, 'CREDITS.md'), 'w').write('\n'.join(L) + '\n')
print(len(cred), 'recordings,', len(lib), 'library sounds')
