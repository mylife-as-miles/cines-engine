#!/usr/bin/env python3
"""Q06 take 1 as the author took it: the seal shot cut out, and nothing else changed in the picture.

    /root/leonxlnx/earshot/.venv/bin/python tools/cut_q06_t1.py
        ->  out/edits/Q06_t1_cut.wav, out/edits/Q06_t1_cut.json      (used by tools/combine_film_v16.py)
            out/review/Q06_t1_cut.mp4                                 (the take with these changes, to look at alone)

The author, 26 November, on the take: the seal came back as the wedding's seal over again; "we can cut it out of the
film... Everything else is good... Then merge to the compile".

  picture   the take's frames, less the seal shot: frames 336 to 384 (2.04 s). Shot 4, Serath walking out of her close
            shot, now cuts straight to her crossing to the door.
  sound     the same 2.04 s taken out, on the same frames. As for Q05's chosen copy: under 60 Hz, where no voice has
            anything, the track is filtered off throughout; between the lines the steady hum is subtracted
            (tools/mix_vale.py, remove_steady); while the Hierophant speaks the sound is the take's own, untouched above
            60 Hz. Her steps and the cloth are the take's.

No grade, no grain, no matte, no level change, no change to any voice or face.
"""
import importlib.util, json, os, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mv', P('tools/mix_vale.py')); mv = importlib.util.module_from_spec(spec); spec.loader.exec_module(mv)
SR, FPS, W, H = 48000, 24, 992, 432
TAKE = P('out/takes/Q06_t1.mp4')
SHOTS = [0, 57, 161, 272, 336, 385, 529]          # the take's cuts (frames)
CUT = (336, 385)                                  # frames removed: the seal, [336, 385) = 14.000 to 16.042 s
SPEECH = [(0.0, 0.95), (2.6, 6.75), (8.1, 10.45)] # take seconds, with a little air


def main():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    x = np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()
    hp = signal.sosfiltfilt(signal.butter(4, 60, 'highpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
    clean = mv.remove_steady(hp, window_s=2.0, pct=25, over=1.5, floor=0.10)
    w = np.zeros(len(x), np.float32)                                               # 1 while he speaks
    r = int(0.05 * SR)
    for a, b in SPEECH:
        i, j = int(a * SR), min(len(x), int(b * SR))
        w[i:j] = 1.0
        if i > 0:
            w[max(0, i - r):i] = np.maximum(w[max(0, i - r):i], np.linspace(0, 1, i - max(0, i - r)))
        w[j:j + r] = np.maximum(w[j:j + r], np.linspace(1, 0, len(w[j:j + r])))
    y = hp * w[:, None] + clean * (1 - w[:, None])
    gaps = [(1.1, 2.5), (6.9, 8.0), (10.6, 11.6), (20.6, 21.9)]
    lv = lambda z, a, b: round(float(20 * np.log10(np.sqrt((z[int(a * SR):int(b * SR)].mean(1) ** 2).mean()) + 1e-9)), 1)
    info = {'gaps_s': gaps, 'gap_level_dbfs_take': [lv(x, a, b) for a, b in gaps], 'gap_level_dbfs_changed': [lv(y, a, b) for a, b in gaps],
            'speech_level_dbfs_take': [lv(x, a, b) for a, b in SPEECH], 'speech_level_dbfs_changed': [lv(y, a, b) for a, b in SPEECH]}
    a0, a1 = CUT[0] * SR // FPS, CUT[1] * SR // FPS
    xf = int(0.02 * SR); ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
    y = np.concatenate([y[:a0 - xf], y[a0 - xf:a0] * (1 - ramp) + y[a1 - xf:a1] * ramp, y[a1:]])
    os.makedirs(P('out/edits'), exist_ok=True); os.makedirs(P('out/review'), exist_ok=True)
    wav = P('out/edits/Q06_t1_cut.wav'); sf.write(wav, y, SR, subtype='PCM_24')
    out = P('out/review/Q06_t1_cut.mp4')
    vf = f"select='lt(n,{CUT[0]})+gte(n,{CUT[1]})',setpts=N/{FPS}/TB"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', TAKE, '-i', wav, '-map', '0:v', '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-crf', '12',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], check=True)
    info.update({'frames_removed': list(CUT), 'seconds_removed': round((CUT[1] - CUT[0]) / FPS, 3), 'frames_kept': SHOTS[-1] - (CUT[1] - CUT[0]),
                 'speech_s_after_the_cut': [[a, b] for a, b in SPEECH], 'shots_take_frames': SHOTS})
    json.dump(info, open(P('out/edits/Q06_t1_cut.json'), 'w'), indent=1)
    print(json.dumps(info, indent=1))


if __name__ == '__main__':
    main()
