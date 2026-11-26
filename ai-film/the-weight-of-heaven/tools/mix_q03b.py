#!/usr/bin/env python3
"""The sound for Q03B take 1 (the composite cut), built as the prompt designed it. Editing and local synthesis only.

Run with earshot's Python:   /root/leonxlnx/earshot/.venv/bin/python tools/mix_q03b.py

The model's track put a rumble on the fall and ran its roar through the whole of the run. The design is the other
way round: the mountain falls in SILENCE, because its sound has not reached the valley yet; then, two seconds into
the run, the sound arrives.

On the composite's clock (11.29 s: the fall 0-3.5, the daughter 3.5-6.625, the run 6.625-11.29):
  wind         the vale's clean ground wind, low under the fall, a little up at the wall, lost under the roar
  production   the model's track with its steady part removed (tools/mix_vale.py), high-passed; muted under the fall;
               the bowl and his boots at the wall; boots, breath and the slop of water in the run
  the arrival  1.9 s into the run: a sub thud (the pressure of it), and the model's own roar, unprocessed, swelling in
               over a third of a second and carried to the end

Writes out/edits/Q03B_t1_vfx_mix.wav and muxes it onto out/edits/Q03B_t1_vfx.mp4 -> out/review/Q03B_t1_vfx.mp4
"""
import importlib.util, json, os, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mv', P('tools/mix_vale.py')); mv = importlib.util.module_from_spec(spec); spec.loader.exec_module(mv)
SR, FPS = 48000, 24
TAKE = P('out/takes/Q03B_t1.mp4')
PIC = P('out/edits/Q03B_t1_vfx.mp4')
T1, T2, TEND = 84 / FPS, (84 + 75) / FPS, (84 + 187) / FPS      # the daughter starts, the run starts, the end
TAKE_S2 = 102 / FPS                                               # where shot 2 starts in the take
ARRIVE = T2 + 1.9
lin, db = mv.lin, mv.db


def main():
    tmp = P('out/edits/Q03B_t1_take.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', TAKE, '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_s16le', tmp], check=True)
    x, _ = sf.read(tmp, always_2d=True, dtype='float32'); os.remove(tmp)
    n = int(round(TEND * SR))
    i2 = int(round(TAKE_S2 * SR)); o2 = int(round(T1 * SR))
    raw = np.zeros((n, 2), np.float32)                             # the take's shots 2 and 3, moved to the composite's clock
    seg = x[i2:i2 + (n - o2)]; raw[o2:o2 + len(seg)] = seg

    prod = mv.sos_filter(mv.remove_steady(raw), 'highpass', 105, 4)
    prod = mv.limit(prod, ceiling_db=-12.0)
    prod *= mv.envelope([(0, -60), (T1 - 0.02, -60), (T1 + 0.05, 7), (T2 - 0.1, 7), (T2 + 0.1, 6), (ARRIVE, 6), (ARRIVE + 0.6, 2), (TEND, 2)], n)

    w, wsr = sf.read(P('audio/sfx/wind_vale.flac'), always_2d=True, dtype='float32'); assert wsr == SR
    w = mv.sos_filter(w[int(6.0 * SR):int(6.0 * SR) + n], 'highpass', 200, 2)
    w = w / (np.sqrt((w ** 2).mean()) + 1e-9) * lin(-34)
    wind = w * mv.envelope([(0, -40), (0.4, -5), (T1 - 0.2, -5), (T1 + 0.4, -2), (T2, -1), (ARRIVE, 0), (ARRIVE + 1.0, -8), (TEND, -10)], n)

    # the arrival: pressure first, then the roar
    roar = mv.limit(raw, ceiling_db=-8.0)
    roar *= mv.envelope([(0, -60), (ARRIVE - 0.02, -60), (ARRIVE + 0.35, 4), (TEND - 0.05, 7), (TEND, 7)], n)
    t = np.arange(int(1.6 * SR)) / SR
    f_inst = 34 + 46 * np.exp(-t / 0.07)                           # a thud that falls from 80 Hz to 34 in a tenth of a second
    thud = np.sin(2 * np.pi * np.cumsum(f_inst) / SR) * np.minimum(t / 0.012, 1) * np.exp(-t / 0.42)
    hit = np.zeros((n, 2), np.float32); a0 = int(ARRIVE * SR); L = min(len(thud), n - a0)
    hit[a0:a0 + L] = (thud[:L] * lin(-9))[:, None]

    mix = prod + wind + roar + hit
    peak = float(np.abs(mix).max())
    if peak > lin(-3):
        k = lin(-3) / peak; mix *= k; prod *= k; wind *= k; roar *= k; hit *= k
    out = P('out/edits/Q03B_t1_vfx_mix.wav')
    sf.write(out, mix, SR, subtype='PCM_24')
    os.makedirs(P('out/edits/stems_q03b'), exist_ok=True)
    for name, s in (('production', prod), ('wind', wind), ('roar', roar), ('arrival_thud', hit)):
        sf.write(P('out/edits/stems_q03b', name + '.wav'), s, SR, subtype='PCM_24')
    rms = lambda a, b: round(float(db(np.sqrt((mix[int(a * SR):int(b * SR)] ** 2).mean()))), 1)
    rec = {'out': os.path.relpath(out, HERE), 'seconds': round(n / SR, 3), 'arrival_s': round(ARRIVE, 3), 'sample_peak_dbfs': round(float(db(np.abs(mix).max())), 2),
           **mv.lufs(out), 'rms_dbfs': {'the fall (silent)': rms(0.3, T1), 'the daughter': rms(T1, T2), 'the run before the sound': rms(T2, ARRIVE), 'the run after it arrives': rms(ARRIVE, TEND)}}
    json.dump(rec, open(out.replace('.wav', '.json'), 'w'), indent=1)
    print(json.dumps(rec, indent=1))
    os.makedirs(P('out/review'), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', PIC, '-i', out, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{TEND:.4f}', '-movflags', '+faststart', P('out/review/Q03B_t1_vfx.mp4')], check=True)
    print('wrote out/review/Q03B_t1_vfx.mp4')


if __name__ == '__main__':
    main()
