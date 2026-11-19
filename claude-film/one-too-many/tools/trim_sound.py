# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Trim a whole natural event (a scream, a laugh, a chair drag) out of a recording: the loudest window of at most
MAX seconds, edges walked out to 30 dB under its peak, 60 Hz high-pass, 5 ms fade in, 80 ms fade out, peak -3 dBFS,
mono 48 kHz. For sounds longer and less shaped than sfx.py's types allow; check the result with `sfx.py sheet`.

  uv run tools/trim_sound.py SRC DST MAX [--start S] [--stereo]
"""
import subprocess, sys
import numpy as np, soundfile as sf
from scipy import signal
SR = 48000
src, dst, mx = sys.argv[1], sys.argv[2], float(sys.argv[3])
st = float(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else None
ch = 2 if "--stereo" in sys.argv else 1
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch)
m = np.abs(y).max(axis=1); n = int(0.02 * SR)
env = np.sqrt(np.convolve(m * m, np.ones(n) / n, mode="same"))
W = int(mx * SR)
if st is not None:
    a = int(st * SR); b = min(len(y), a + W)
else:
    if len(y) > W:
        c = np.convolve(env * env, np.ones(W), mode="valid"); a = int(np.argmax(c)); b = a + W
    else:
        a, b = 0, len(y)
    pk = env[a:b].max(); thr = pk * 10 ** (-30 / 20); seg = np.where(env[a:b] > thr)[0]
    a, b = a + max(0, seg[0] - int(0.01 * SR)), a + min(b - a, seg[-1] + int(0.05 * SR))
x = y[a:b].copy()
x = signal.sosfilt(signal.butter(2, 60, "highpass", fs=SR, output="sos"), x, axis=0)
fi, fo = int(0.005 * SR), min(int(0.08 * SR), len(x) // 3)
x[:fi] *= np.linspace(0, 1, fi)[:, None]; x[-fo:] *= np.linspace(1, 0, fo)[:, None]
x *= 10 ** (-3 / 20) / (np.abs(x).max() + 1e-12)
sf.write(dst, (x if ch == 2 else x[:, 0]).astype(np.float32), SR, subtype="PCM_24")
print(f"{dst}: {a / SR:.2f}-{b / SR:.2f} s of {len(y) / SR:.1f} s ({len(x) / SR:.2f} s)")
