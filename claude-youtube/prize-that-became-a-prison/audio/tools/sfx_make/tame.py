"""Tame loud events in a bed: a slow gain rider that holds short-term level at or under the bed's median + LIMIT dB.
Fast attack (5 ms) with 20 ms look-ahead, 300 ms release, so knocks and horns sink into the bed and the texture stays.
Usage: python tame.py IN.wav OUT.wav LIMIT_DB"""
import sys, json, numpy as np, soundfile as sf
from earshot import features

def tame(x, sr, limit):
    m = np.abs(x).max(1)
    hop = int(0.01 * sr); win = int(0.05 * sr)
    pw = np.convolve(m ** 2, np.ones(win) / win, mode='same')[::hop]
    env = 10 * np.log10(pw + 1e-15)
    med = float(np.median(env))
    g = np.minimum(0.0, med + limit - env)           # dB, <= 0
    look = 2
    g = np.minimum(g, np.roll(g, -look)); g = np.minimum(g, np.roll(g, -1))
    out = np.empty_like(g); cur = 0.0
    a = 1 - np.exp(-0.01 / 0.005); r = 1 - np.exp(-0.01 / 0.3)
    for i, v in enumerate(g):
        cur += (v - cur) * (a if v < cur else r)
        out[i] = cur
    gs = np.interp(np.arange(len(x)) / hop, np.arange(len(out)), out)
    return x * (10 ** (gs / 20))[:, None], {'limit_db_over_median': limit, 'max_cut_db': round(float(out.min()), 1)}

if __name__ == '__main__':
    x, sr = sf.read(sys.argv[1], always_2d=True)
    y, info = tame(x, sr, float(sys.argv[3]))
    lufs = features.integrated_lufs(y); y *= 10 ** ((-24.0 - lufs) / 20)
    tp = features.true_peak_dbtp(y)
    if tp > -3: y *= 10 ** ((-3 - tp) / 20)
    sf.write(sys.argv[2], y, sr, subtype='PCM_24')
    print(json.dumps(info))
