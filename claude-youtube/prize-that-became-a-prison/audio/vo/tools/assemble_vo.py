"""Merge voiced lines into the scratch set: measure each WAV, write lines.json and the end-to-end narration.

    python assemble_vo.py LINES_PARSED.json OUT_DIR --voice am_michael --speeds '{...}' [--from DIR ...]

For each line in order, takes OUT_DIR/<ch>_<nn>.wav, or copies it from the first --from DIR that has it. Writes
OUT_DIR/lines.json (a list, in order: chapter, index, text, file, duration, pause_after, then words, speed, voice,
phonemes, say, direction_after, delivery) and OUT_DIR/narration_scratch.wav (the lines laid end to end with their
pauses). Durations are measured from the files.
"""
import json, os, shutil, sys, warnings
warnings.filterwarnings('ignore')
import numpy as np
import soundfile as sf

SR = 24000


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    lines = json.load(open(sys.argv[1], encoding='utf-8'))
    out = sys.argv[2]
    voice = arg('--voice')
    speeds = json.loads(arg('--speeds', '{}'))
    srcs = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--from']
    # phonemes recorded by the renders, where a lines.json exists
    ph = {}
    for d in [out] + srcs:
        p = os.path.join(d, 'lines.json')
        if os.path.exists(p):
            for r in json.load(open(p, encoding='utf-8')):
                if r.get('phonemes'):
                    ph.setdefault(r['file'], r['phonemes'])
    recs, chunks, missing, g2p = [], [], [], None
    for l in lines:
        name = f"{l['chapter']}_{l['index']:02d}.wav"
        dst = os.path.join(out, name)
        for d in srcs:
            s = os.path.join(d, name)
            if os.path.exists(s) and (not os.path.exists(dst) or os.path.getmtime(s) > os.path.getmtime(dst)):
                shutil.copy2(s, dst)
                break
        if not os.path.exists(dst):
            missing.append(name)
            continue
        x, sr = sf.read(dst, dtype='float32')
        assert sr == SR, (name, sr)
        rec = {'chapter': l['chapter'], 'index': l['index'], 'text': l['text'], 'file': name,
               'duration': round(len(x) / SR, 3), 'pause_after': l['pause_after'], 'words': len(l['text'].split()),
               'speed': speeds.get(l['chapter']), 'voice': voice}
        say = l['text'].replace('Baiyun', '[Baiyun](/bˌIjˈun/)')
        if name not in ph:   # the render's own record is missing: the same G2P, run again (deterministic)
            if g2p is None:
                from kokoro import KPipeline
                g2p = KPipeline(lang_code=voice[0], model=False, repo_id='hexgrad/Kokoro-82M')
            _, toks = g2p.g2p(say)
            ph[name] = ''.join((t.phonemes or '') + (' ' if t.whitespace else '') for t in toks).strip()
        rec['phonemes'] = ph[name]
        if say != l['text']:
            rec['say'] = say
        for k in ('direction_after', 'delivery'):
            if l.get(k):
                rec[k] = l[k]
        recs.append(rec)
        chunks += [x, np.zeros(int(round(l['pause_after'] * SR)), np.float32)]
    if missing:
        sys.exit('missing: ' + ' '.join(missing))
    json.dump(recs, open(os.path.join(out, 'lines.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    full = np.concatenate(chunks)
    sf.write(os.path.join(out, 'narration_scratch.wav'), full, SR, subtype='PCM_16')
    print(len(recs), 'lines;', round(len(full) / SR, 2), 's;', 'voiced', round(sum(r['duration'] for r in recs), 2), 's')


if __name__ == '__main__':
    main()
