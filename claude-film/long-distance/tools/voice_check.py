"""Check, rank and choose the voiced takes; write audio/vo/voice_map.json and audio/vo/<id>.wav.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/voice_check.py

For each take: speech recognition (Whisper small.en) must give back the script's words exactly (punctuation and
case ignored). Of the takes that pass, a line with 'listen_for' keeps the one earshot ranks highest against that
description; otherwise the first passing take. A line with no passing take is listed under REDO (re-voice it with
tools/voice_lines.py --redo ...). 'same_as' lines reuse the chosen take of the line they name, sample for sample.
The scores, transcripts and choice are kept in voice_map.json.
"""
import json, os, re, shutil, subprocess, sys, wave
from transformers import pipeline

ROOT = os.path.join(os.path.dirname(__file__), '..')
VO = os.path.join(ROOT, 'audio/vo')
EARSHOT = '/home/user/leonxlnx/earshot/.venv/bin/earshot'
norm = lambda s: re.sub(r'[^a-z ]', '', s.lower().replace('’', "'").replace("'", '').replace('-', ' ')).replace('good night', 'goodnight').split()


def dur(p):
    with wave.open(p) as w: return round(w.getnframes() / w.getframerate(), 3)


def trim(src, dst):
    """The chosen take, trimmed to the voice: silence below -50 dB is cut from the head (keeping 60 ms) and the
    tail (keeping 120 ms, so breaths and room tails survive). Take lengths in voice_map are the trimmed ones."""
    f = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,'
         'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f, dst], check=True)


def main():
    spec = json.load(open(os.path.join(VO, 'script_vo.json')))
    asr = pipeline('automatic-speech-recognition', model='openai/whisper-small.en', device='cpu')
    vmap, redo = {}, []
    for L in spec['lines']:
        if L.get('same_as'): continue
        takes = [f"{L['id']}_t{t}" for t in range(1, L.get('takes', 1) + 1)]
        info = {}
        for name in takes:
            p = os.path.join(VO, 'takes', name + '.wav')
            if not os.path.exists(p): continue
            heard = asr(p)['text'].strip()
            info[name] = {'heard': heard, 'ok': norm(heard) == norm(L['text']), 'dur': dur(p)}
        good = [n for n in takes if info.get(n, {}).get('ok')]
        if not good:
            redo += takes; print(f"{L['id']}: no take matches  {[info.get(n, {}).get('heard') for n in takes]}"); continue
        chosen = good[0]
        if L.get('listen_for') and len(good) > 1:
            r = subprocess.run([EARSHOT, 'rank', L['listen_for'], *[os.path.join(VO, 'takes', n + '.wav') for n in good], '--json'],
                               capture_output=True, text=True)
            res = json.loads(r.stdout)['results']
            for x in res: info[os.path.basename(x['path'])[:-4]]['z'] = x['z']
            chosen = os.path.basename(res[0]['path'])[:-4]
        trim(os.path.join(VO, 'takes', chosen + '.wav'), os.path.join(VO, L['id'] + '.wav'))
        info[chosen]['dur'] = dur(os.path.join(VO, L['id'] + '.wav'))
        vmap[L['id']] = {'file': f"audio/vo/{L['id']}.wav", 'take': chosen, 'dur': info[chosen]['dur'], 'speaker': L['speaker'],
                         'as': L['as'], 'text': L['text'], 'takes': info}
        print(f"{L['id']}: {chosen}  {info[chosen]['dur']:.2f}s  ({len(good)}/{len(takes)} match)  {L['text']}")
    for L in spec['lines']:
        if L.get('same_as') and L['same_as'] in vmap:
            src = vmap[L['same_as']]
            shutil.copyfile(os.path.join(ROOT, src['file']), os.path.join(VO, L['id'] + '.wav'))
            vmap[L['id']] = {'file': f"audio/vo/{L['id']}.wav", 'take': src['take'], 'dur': src['dur'], 'speaker': L['speaker'],
                             'as': L['as'], 'text': L['text'], 'same_as': L['same_as']}
            print(f"{L['id']}: the same take as {L['same_as']}")
    ordered = {k: vmap[k] for k in sorted(vmap)}
    json.dump(ordered, open(os.path.join(VO, 'voice_map.json'), 'w'), indent=1, ensure_ascii=False)
    print('REDO', ','.join(redo))


if __name__ == '__main__':
    main()
