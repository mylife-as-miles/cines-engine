#!/usr/bin/env python3
"""The vale's sound for Q03A take 2 (fixed), rebuilt without the model's drone. Editing and local synthesis only.

Run with earshot's Python (numpy, scipy, soundfile):
    /root/leonxlnx/earshot/.venv/bin/python tools/mix_vale.py [--wind audio/sfx/wind_vale.flac]

What the model's track was: picture-synced production sound (the hoe, steps, two swallows, the bowl set down, the ox,
the wings) on top of a steady low drone (a 70 Hz tone and a floor below 250 Hz), a low pulse under the water and a
rumble over the dust shot, where near-silence was asked.

What this builds, on the fixed cut's clock (16.917 s):
  production   the model's track with its steady part taken out (what does not change over two seconds is the drone
               and its own wind; what changes is the Foley), high-passed. Kept only where there is something to hear:
               shots 1, 2 and 4. Muted under the water and the dust.
  wind         one clean bed of ground wind, low and continuous, falling away to almost nothing on the dust shot.
  tremor       OFF by default. The approved prompt asks for "the wind, far off; nothing else" under the water, so the
               rings open in near silence. With --tremor a short sub pulse in the ground and a faint tick of the bowl on
               the stone are added at that moment.

Writes out/edits/Q03A_t2_vale_mix.wav (48 kHz stereo, 24-bit) and a stem for each layer in out/edits/stems_vale/.
"""
import argparse, json, os, subprocess
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import percentile_filter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
SR, FPS = 48000, 24
SRC = P('out/edits/Q03A_t2_fixed.wav')
# the fixed cut's shots, in frames: the vale | the wall | the water | the ox | the dust | end
S1, S2, S3, S4, S5, END = 0, 72, 183, 291, 342, 406
RINGS = 9.95                       # the rings open on the water (seconds on the fixed cut's clock)
T = lambda fr: fr / FPS
db = lambda v: 20 * np.log10(np.maximum(v, 1e-12))
lin = lambda d: 10 ** (d / 20)


def envelope(points, n):
    """Piecewise-linear gain from (seconds, dB) points."""
    t = np.arange(n) / SR
    return lin(np.interp(t, [p[0] for p in points], [p[1] for p in points]))[:, None].astype(np.float32)


def sos_filter(x, kind, fc, order=4):
    sos = signal.butter(order, fc, kind, fs=SR, output='sos')
    return signal.sosfiltfilt(sos, x, axis=0).astype(np.float32)


def remove_steady(x, window_s=2.0, pct=25, over=1.8, floor=0.06):
    """Spectral subtraction of whatever holds still: at each frequency, the level the signal sits at for most of a
    two-second window is taken as drone or bed and removed; what stands above it (a swallow, a step, a wing) stays."""
    nper, hop = 2048, 512
    out = np.zeros_like(x)
    for ch in range(x.shape[1]):
        f, t, Z = signal.stft(x[:, ch], SR, nperseg=nper, noverlap=nper - hop)
        mag = np.abs(Z)
        size = max(3, int(window_s * SR / hop) | 1)
        base = percentile_filter(mag, pct, size=(1, size), mode='nearest')
        gain = np.maximum(1 - over * base / (mag + 1e-9), floor)
        gain = percentile_filter(gain, 50, size=(3, 3), mode='nearest')          # no isolated bins: no musical noise
        _, y = signal.istft(Z * gain, SR, nperseg=nper, noverlap=nper - hop)
        out[:, ch] = y[:len(x)] if len(y) >= len(x) else np.pad(y, (0, len(x) - len(y)))
    return out


def limit(x, ceiling_db=-11.0, look_ms=3.0, release_ms=90.0):
    """Hold single spikes (a knock, a gulp) under a ceiling without touching anything else: the model's track has
    events 30 dB over its own level."""
    pk = np.abs(x).max(1)
    k = max(1, int(look_ms * SR / 1000))
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(pk, 2 * k + 1)
    need = np.minimum(1.0, lin(ceiling_db) / np.maximum(pk, 1e-9))
    g = np.empty_like(need); c = np.exp(-1.0 / (release_ms * SR / 1000)); cur = 1.0
    for i in range(len(need)):                                   # instant attack (looked ahead), slow release
        cur = need[i] if need[i] < cur else 1 - (1 - cur) * c
        g[i] = cur
    return x * g[:, None].astype(np.float32)


def synth_ground_wind(dur, seed=23):
    """A fallback bed if no generated wind is given: low, broad, slowly breathing noise, different in each ear."""
    rng = np.random.default_rng(seed); n = int(dur * SR)
    f = np.fft.rfftfreq(n, 1 / SR); fs = np.maximum(f, 1.0)
    shape = (fs / 150.0) ** -0.9 * (fs > 60) / (1 + (fs / 2500.0) ** 4)
    y = np.stack([np.fft.irfft((rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))) * shape, n) for _ in range(2)], 1)
    ph = 2 * np.pi * np.arange(n) / n
    sw = sum(rng.uniform(0.4, 1) / k * np.sin(k * ph + rng.uniform(0, 6.28)) for k in range(1, 9))
    y *= lin(2.5 * sw / np.abs(sw).max())[:, None]
    return (y / np.abs(y).max()).astype(np.float32)


def tremor(n):
    """The ground under the bowl: a sub pulse (38 and 54 Hz) that swells in a quarter second and dies in under two,
    a breath of low rumble with it, and one small tick of wood on wet stone as the bowl answers."""
    rng = np.random.default_rng(5)
    y = np.zeros((n, 2), np.float32)
    i0 = int(RINGS * SR); L = int(2.4 * SR); t = np.arange(L) / SR
    env = np.minimum(t / 0.22, 1) ** 2 * np.exp(-np.maximum(t - 0.22, 0) / 0.55)
    sub = 0.9 * np.sin(2 * np.pi * 38 * t + 0.3) + 0.5 * np.sin(2 * np.pi * 54 * t) + 0.25 * np.sin(2 * np.pi * 76 * t + 1.1)
    wob = 1 + 0.25 * np.sin(2 * np.pi * 6.5 * t)                              # the shiver the rings show
    rum = sos_filter(rng.standard_normal((L, 1)).astype(np.float32), 'lowpass', 140, 4)[:, 0]
    rum = rum / np.abs(rum).max()
    body = (sub * wob * 0.5 + rum * 0.35) * env
    y[i0:i0 + L] += (body * lin(-21))[:, None]
    k0 = i0 + int(0.16 * SR); K = int(0.09 * SR); tk = np.arange(K) / SR      # the tick: a damped knock of wood on stone
    tick = (np.sin(2 * np.pi * 520 * tk) * np.exp(-tk / 0.012) + 0.5 * np.sin(2 * np.pi * 1340 * tk) * np.exp(-tk / 0.006)) * lin(-34)
    for d in (0.0, 0.11, 0.2):                                                 # three, quicker and smaller
        j = k0 + int(d * SR); g = lin(-5 * (d / 0.1))
        y[j:j + K, 0] += tick * g * 0.9; y[j:j + K, 1] += tick * g
    return y


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = r[r.rfind('Summary'):]
    g = lambda k: float(tail.split(k)[1].split()[0])
    return {'integrated_lufs': g('I:'), 'lra_lu': g('LRA:'), 'true_peak_dbfs': g('Peak:')}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wind', default=None, help='a wind bed to use (flac/wav); otherwise a synthesized one')
    ap.add_argument('--out', default=P('out/edits/Q03A_t2_vale_mix.wav'))
    ap.add_argument('--tremor', action='store_true', help='add the designed ground pulse under the rings (off: the water shot is wind and nothing else, as the approved prompt asks)')
    a = ap.parse_args()
    x, sr = sf.read(SRC, always_2d=True, dtype='float32'); assert sr == SR
    n = int(round(T(END) * SR)); x = np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]

    # ---- production: the model's track without what holds still
    prod = remove_steady(x)
    prod = sos_filter(prod, 'highpass', 105, 4)
    # where it is kept, and how loud: nothing under the water (7.6-12.1 s) or the dust (from 14.25 s)
    prod = limit(prod)
    g = envelope([(0, 9), (T(S2) - 0.1, 9), (T(S2) + 0.1, 7), (T(S3) - 0.35, 7), (T(S3) + 0.05, -60), (T(S4) - 0.05, -60), (T(S4) + 8 / FPS, -60),
                  (T(S4) + 8 / FPS + 0.08, 2), (T(S5) - 0.25, 2), (T(S5) + 0.1, -60), (T(END), -60)], n)
    prod = prod * g

    # ---- wind: one bed, low; hushed on the water, dying on the dust
    if a.wind and os.path.exists(a.wind if os.path.isabs(a.wind) else P(a.wind)):
        w, wsr = sf.read(a.wind if os.path.isabs(a.wind) else P(a.wind), always_2d=True, dtype='float32')
        if wsr != SR:
            w = signal.resample_poly(w, SR, wsr, axis=0).astype(np.float32)
        if w.shape[1] == 1:
            w = np.repeat(w, 2, 1)
        w = w[int(1.0 * SR):]                                                  # past the generator's first second
        wind_src = os.path.relpath(a.wind if os.path.isabs(a.wind) else P(a.wind), HERE)
    else:
        w = synth_ground_wind(T(END) + 3); wind_src = 'synthesized (tools/mix_vale.py, synth_ground_wind)'
    assert len(w) >= n, f'wind bed too short: {len(w) / SR:.1f} s'
    w = sos_filter(w[:n], 'highpass', 200, 2)                                  # a wind, not a rumble: the lows are left empty
    w = w / (np.sqrt((w ** 2).mean()) + 1e-9) * lin(-34)                       # -34 dBFS RMS before the automation
    wg = envelope([(0, -40), (0.5, 0), (T(S3) - 0.2, 0), (T(S3) + 0.6, -5), (T(S4) - 0.1, -5), (T(S4) + 0.3, -1), (T(S5) - 0.1, -1),
                   (T(S5) + 1.3, -12), (T(END) - 0.3, -22), (T(END), -40)], n)
    wind = w * wg

    # ---- the tremor
    trem = tremor(n) if a.tremor else np.zeros((n, 2), np.float32)

    mix = prod + wind + trem
    peak = float(np.abs(mix).max())
    if peak > lin(-3):                                                         # leave the bell its headroom
        mix *= lin(-3) / peak; prod *= lin(-3) / peak; wind *= lin(-3) / peak; trem *= lin(-3) / peak
    os.makedirs(P('out/edits/stems_vale'), exist_ok=True)
    sf.write(a.out, mix, SR, subtype='PCM_24')
    for name, s in (('production', prod), ('wind', wind), ('tremor', trem)):
        sf.write(P('out/edits/stems_vale', name + '.wav'), s, SR, subtype='PCM_24')

    def rms(sig, t0, t1):
        seg = sig[int(t0 * SR):int(t1 * SR)]; return round(float(db(np.sqrt((seg ** 2).mean()))), 1)
    spans = {'the vale': (T(S1), T(S2)), 'the wall': (T(S2), T(S3)), 'the water': (T(S3), T(S4)), 'the ox': (T(S4), T(S5)), 'the dust': (T(S5), T(END))}
    low = lambda sig: sos_filter(sig, 'lowpass', 120, 4)
    rec = {'out': os.path.relpath(a.out, HERE), 'wind': wind_src, 'seconds': round(n / SR, 3), 'sample_peak_dbfs': round(float(db(np.abs(mix).max())), 2),
           **lufs(a.out),
           'rms_dbfs_by_shot': {k: rms(mix, *v) for k, v in spans.items()},
           'under_120hz_dbfs_by_shot': {'before (the model)': {k: rms(low(x), *v) for k, v in spans.items()},
                                        'after': {k: rms(low(mix), *v) for k, v in spans.items()}}}
    json.dump(rec, open(a.out.replace('.wav', '.json'), 'w'), indent=1)
    print(json.dumps(rec, indent=1))


if __name__ == '__main__':
    main()
