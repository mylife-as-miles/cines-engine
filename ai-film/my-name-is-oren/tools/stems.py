#!/usr/bin/env python3
"""Split a take's sound into the voices and everything else with Demucs (htdemucs), so a take whose generator slipped
music under the dialogue can keep its voices and take its ground from the film's own beds instead.

    /home/user/leonxlnx/earshot/.venv/bin/python tools/stems.py out/takes/Q10_t1.mp4 [more takes]

Writes audio/stems/<take>.vocals.wav and audio/stems/<take>.rest.wav (48 kHz, 24-bit, the take's full length, sample
aligned with it). Decoding goes through ffmpeg, not torchaudio. Stems are rebuilt from the takes, so they stay out of git.
"""
import os, subprocess, sys
import numpy as np
import torch
from demucs.pretrained import get_model
from demucs.apply import apply_model

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def decode(path, sr):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'],
                       capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).T.copy()


def write(x, sr, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', '-',
                    '-ar', '48000', '-c:a', 'pcm_s24le', out], input=np.ascontiguousarray(x.T).astype(np.float32).tobytes(),
                   check=True)


def main():
    torch.set_num_threads(int(os.environ.get('STEM_THREADS', '3')))
    model = get_model('htdemucs')
    model.eval()
    sr = model.samplerate
    out_dir = os.path.join(HERE, 'audio', 'stems')
    os.makedirs(out_dir, exist_ok=True)
    for take in sys.argv[1:]:
        wav = torch.from_numpy(decode(os.path.join(HERE, take), sr))
        ref = wav.mean(0)
        mean, std = ref.mean(), ref.std() + 1e-8
        with torch.no_grad():
            src = apply_model(model, ((wav - mean) / std)[None], device='cpu', shifts=1, split=True, overlap=0.25,
                              progress=False)[0]
        src = src * std + mean
        names = model.sources                      # ['drums', 'bass', 'other', 'vocals']
        vocals = src[names.index('vocals')].numpy()
        rest = sum(src[i] for i, n in enumerate(names) if n != 'vocals').numpy()
        base = os.path.splitext(os.path.basename(take))[0]
        write(vocals, sr, os.path.join(out_dir, f'{base}.vocals.wav'))
        write(rest, sr, os.path.join(out_dir, f'{base}.rest.wav'))
        print(f'{take}: audio/stems/{base}.vocals.wav, audio/stems/{base}.rest.wav', flush=True)


if __name__ == '__main__':
    main()
