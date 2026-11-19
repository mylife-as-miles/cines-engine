"""Working narration for the Crownfall intro, made locally with Kokoro (kokoro-onnx; the model is Apache-2.0).

    python tools/narrate_kokoro.py <kokoro-v1.0.onnx> <voices-v1.0.bin> [--voice bm_lewis] [--speed 1.0] [--set working]

Reads narration/script.json and writes narration/working/<id>.wav (24 kHz mono) plus narration/working/lines.json
with each line's duration. This is a stand-in voice for timing; tools/narrate_elevenlabs.py writes the final takes into
narration/final/ in the same layout, and tools/build_timeline.js uses whichever set it is given.
"""
import json, os, sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def arg(name, default):
    if name in sys.argv:
        return sys.argv[sys.argv.index(name) + 1]
    return default


def main():
    model, voices = sys.argv[1], sys.argv[2]
    voice, speed = arg('--voice', 'bm_lewis'), float(arg('--speed', '0.9'))
    only = arg('--only', '')
    set_name = arg('--set', 'working')
    script = json.load(open(os.path.join(ROOT, 'narration', 'script.json')))
    out_dir = os.path.join(ROOT, 'narration', set_name)
    os.makedirs(out_dir, exist_ok=True)
    k = Kokoro(model, voices)
    manifest_path = os.path.join(out_dir, 'lines.json')
    old = {}
    if os.path.exists(manifest_path):
        old = {l['id']: l for l in json.load(open(manifest_path)).get('lines', [])}
    lines = []
    for line in [l for l in script['lines'] if not l.get('cut')]:
        if only and line['id'] not in only.split(','):
            if line['id'] in old:
                lines.append(old[line['id']])
                continue
        text = line.get('say', line['text'])
        audio, sr = k.create(text, voice=voice, speed=speed, lang='en-gb', sentence_pause=0.42, clause_pause=0.12)
        audio = np.asarray(audio, dtype=np.float32)
        # trim to the voice with a short fade at each end
        thr = 10 ** (-48 / 20) * max(1e-6, float(np.max(np.abs(audio))))
        idx = np.where(np.abs(audio) > thr)[0]
        if len(idx):
            a, b = max(0, idx[0] - int(0.02 * sr)), min(len(audio), idx[-1] + int(0.08 * sr))
            audio = audio[a:b]
        f = min(len(audio) // 4, int(0.01 * sr))
        if f > 0:
            audio[:f] *= np.linspace(0, 1, f)
            audio[-f:] *= np.linspace(1, 0, f)
        path = os.path.join(out_dir, line['id'] + '.wav')
        sf.write(path, audio, sr, subtype='PCM_16')
        lines.append({'id': line['id'], 'file': line['id'] + '.wav', 'dur': round(len(audio) / sr, 3)})
        print(f"{line['id']} {len(audio) / sr:6.2f}s  {text[:70]}")
    json.dump({'voice': f'Kokoro {voice} (working voice, speed {speed})', 'sampleRate': 24000, 'lines': lines},
              open(manifest_path, 'w'), indent=1)
    print('total voice', round(sum(l['dur'] for l in lines), 1), 's')


if __name__ == '__main__':
    main()
