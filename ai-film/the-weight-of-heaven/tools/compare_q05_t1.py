#!/usr/bin/env python3
"""Q05 take 1 with two changes and nothing else, for the author to compare with the take as generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/compare_q05_t1.py
        ->  out/review/Q05_t1_as_generated.mp4   the take, untouched (a copy)
            out/review/Q05_t1_two_changes.mp4    the same take with:

  1. the Hierophant's silent start trimmed: he stands 2.9 s before he speaks; frames 144 to 190 (1.96 s) are taken out,
     so his shot begins 0.9 s before his line. The sound loses the same 1.96 s.
  2. the drone out of the gaps: under 60 Hz, where no voice in the take has anything, the track is filtered off
     throughout; between the lines the steady hum that is left is subtracted (tools/mix_vale.py, remove_steady).
     While anyone speaks, the sound is the take's own, untouched above 60 Hz.

No grade, no grain, no matte, no level change, no change to any voice or face.
"""
import importlib.util, json, os, shutil, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mv', P('tools/mix_vale.py')); mv = importlib.util.module_from_spec(spec); spec.loader.exec_module(mv)
SR, FPS, W, H = 48000, 24, 992, 432
TAKE = P('out/takes/Q05_t1.mp4')
CUT = (144, 191)                                  # frames removed: [144, 191) = 6.000 to 7.958 s
SPEECH = [(3.50, 5.65), (8.70, 10.42), (11.70, 13.76), (14.55, 16.78), (17.42, 18.16), (21.22, 22.86)]   # take seconds, with a little air


def main():
    os.makedirs(P('out/review'), exist_ok=True)
    shutil.copyfile(TAKE, P('out/review/Q05_t1_as_generated.mp4'))
    # ---- sound
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    x = np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()
    hp = signal.sosfiltfilt(signal.butter(4, 60, 'highpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
    clean = mv.remove_steady(hp, window_s=2.0, pct=25, over=1.5, floor=0.10)
    w = np.zeros(len(x), np.float32)                                               # 1 while anyone speaks
    r = int(0.05 * SR)
    for a, b in SPEECH:
        i, j = int(a * SR), min(len(x), int(b * SR))
        w[i:j] = 1.0
        w[max(0, i - r):i] = np.maximum(w[max(0, i - r):i], np.linspace(0, 1, i - max(0, i - r)))
        w[j:j + r] = np.maximum(w[j:j + r], np.linspace(1, 0, len(w[j:j + r])))
    y = hp * w[:, None] + clean * (1 - w[:, None])
    gaps = [(0.3, 3.3), (6.2, 8.5), (18.6, 21.0)]
    lv = lambda z, a, b: round(float(20 * np.log10(np.sqrt((z[int(a * SR):int(b * SR)].mean(1) ** 2).mean()) + 1e-9)), 1)
    info = {'gaps_s': gaps, 'gap_level_dbfs_take': [lv(x, a, b) for a, b in gaps], 'gap_level_dbfs_changed': [lv(y, a, b) for a, b in gaps],
            'speech_level_dbfs_take': [lv(x, a, b) for a, b in SPEECH], 'speech_level_dbfs_changed': [lv(y, a, b) for a, b in SPEECH]}
    a0, a1 = CUT[0] * SR // FPS, CUT[1] * SR // FPS
    xf = int(0.02 * SR); ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
    y = np.concatenate([y[:a0 - xf], y[a0 - xf:a0] * (1 - ramp) + y[a1 - xf:a1] * ramp, y[a1:]])
    wav = P('out/edits/Q05_t1_two_changes.wav'); sf.write(wav, y, SR, subtype='PCM_24')
    # ---- picture: the same frames, less the 47
    out = P('out/review/Q05_t1_two_changes.mp4')
    vf = f"select='lt(n,{CUT[0]})+gte(n,{CUT[1]})',setpts=N/{FPS}/TB"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', TAKE, '-i', wav, '-map', '0:v', '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-crf', '12',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], check=True)
    info['frames_removed'] = list(CUT); info['seconds_removed'] = round((CUT[1] - CUT[0]) / FPS, 3)
    json.dump(info, open(P('out/edits/Q05_t1_two_changes.json'), 'w'), indent=1)
    print(json.dumps(info, indent=1))


if __name__ == '__main__':
    main()
