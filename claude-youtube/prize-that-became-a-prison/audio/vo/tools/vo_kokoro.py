"""Scratch narration with Kokoro (hexgrad/Kokoro-82M, Apache-2.0), local, free.

    python vo_kokoro.py LINES.json OUT_DIR --voice bm_lewis [--speed 1.0] [--speeds '{"07":0.9}'] [--chapters 00]
                        [--prefix name_] [--assemble narration.wav]

LINES.json comes from parse_script.py. Writes OUT_DIR/<prefix><chapter>_<nn>.wav (24 kHz mono, 16-bit) and
OUT_DIR/<prefix>lines.json (chapter, index, text, file, duration, pause_after, words, speed, voice, phonemes); with
--assemble, lays the lines end to end with their pauses into one WAV. Text is spoken exactly as written; the only
change on the way in is a phoneme hint for names the G2P gets wrong (SAY below), which alters pronunciation, not words.
"""
import json, os, re, sys, warnings
warnings.filterwarnings('ignore')
import numpy as np
import soundfile as sf
from kokoro import KModel, KPipeline

SR = 24000
# Pronunciation hints in misaki's inline syntax [word](/phonemes/). "Baiyun" otherwise reads "BAY-yun".
SAY = {'b': {'Baiyun': '[Baiyun](/bˌIjˈuːn/)'}, 'a': {'Baiyun': '[Baiyun](/bˌIjˈun/)'}}


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default


def trim(audio):
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak <= 0:
        return audio
    idx = np.where(np.abs(audio) > peak * 10 ** (-48 / 20))[0]
    a, b = max(0, idx[0] - int(0.02 * SR)), min(len(audio), idx[-1] + int(0.08 * SR))
    out = audio[a:b].copy()
    f = min(len(out) // 4, int(0.01 * SR))
    if f > 0:
        out[:f] *= np.linspace(0, 1, f)
        out[-f:] *= np.linspace(1, 0, f)
    return out


def main():
    lines = json.load(open(sys.argv[1], encoding='utf-8'))
    out_dir = sys.argv[2]
    voice = arg('--voice', 'bm_lewis')
    base_speed = float(arg('--speed', '1.0'))
    speeds = json.loads(arg('--speeds', '{}'))
    chapters = arg('--chapters')
    prefix = arg('--prefix', '')
    if chapters:
        lines = [l for l in lines if l['chapter'] in chapters.split(',')]
    os.makedirs(out_dir, exist_ok=True)
    lang = voice[0]
    model = KModel(repo_id='hexgrad/Kokoro-82M').eval()
    pipe = KPipeline(lang_code=lang, model=model, repo_id='hexgrad/Kokoro-82M')
    out, chunks = [], []
    for l in lines:
        speed = float(speeds.get(l['chapter'], base_speed))
        say = l['text']
        for w, rep in SAY[lang].items():
            say = re.sub(r'\b%s\b' % re.escape(w), rep, say)
        parts, phon = [], []
        for r in pipe(say, voice=voice, speed=speed, split_pattern=None):
            if r.audio is not None:
                parts.append(r.audio.detach().cpu().numpy().astype(np.float32))
                phon.append(r.phonemes)
        audio = trim(np.concatenate(parts))
        name = f"{prefix}{l['chapter']}_{l['index']:02d}.wav"
        sf.write(os.path.join(out_dir, name), audio, SR, subtype='PCM_16')
        dur = round(len(audio) / SR, 3)
        rec = {'chapter': l['chapter'], 'index': l['index'], 'text': l['text'], 'file': name, 'duration': dur,
               'pause_after': l['pause_after'], 'words': len(l['text'].split()), 'speed': speed, 'voice': voice,
               'phonemes': ' | '.join(phon)}
        if say != l['text']:
            rec['say'] = say
        if l.get('direction_after'):
            rec['direction_after'] = l['direction_after']
        if l.get('delivery'):
            rec['delivery'] = l['delivery']
        out.append(rec)
        chunks += [audio, np.zeros(int(round(l['pause_after'] * SR)), np.float32)]
        print(f"{l['chapter']}_{l['index']:02d} {dur:6.2f}s +{l['pause_after']:<5} {l['text'][:70]}", flush=True)
    json.dump(out, open(os.path.join(out_dir, prefix + 'lines.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    asm = arg('--assemble')
    if asm:
        sf.write(asm, np.concatenate(chunks), SR, subtype='PCM_16')
        print('assembled', asm, round(sum(len(c) for c in chunks) / SR, 2), 's')


if __name__ == '__main__':
    main()
