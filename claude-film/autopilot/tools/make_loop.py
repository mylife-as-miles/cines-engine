# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Make a seamless ambience loop from a recording: LEN seconds starting at START, whose last XF seconds are
crossfaded (equal power) into its own head, 40 Hz high-pass, RMS at -24 dBFS. 48 kHz, stereo unless --mono.

  uv run tools/make_loop.py SRC DST START LEN [--xf 1.5] [--mono]
"""
import subprocess, sys
import numpy as np, soundfile as sf
from scipy import signal
SR = 48000
src, dst, st, ln = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
xf = float(sys.argv[sys.argv.index("--xf") + 1]) if "--xf" in sys.argv else 1.5
ch = 1 if "--mono" in sys.argv else 2
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch)
a, L, X = int(st * SR), int(ln * SR), int(xf * SR)
if a + L + X > len(y): raise SystemExit(f"{src}: needs {(a + L + X) / SR:.1f} s, has {len(y) / SR:.1f}")
seg = y[a:a + L + X].copy()
th = np.linspace(0, np.pi / 2, X)[:, None]
out = seg[:L].copy()
out[:X] = seg[:X] * np.sin(th) + seg[L:L + X] * np.cos(th)      # the tail fades out over the head fading in
out = signal.sosfilt(signal.butter(2, 40, "highpass", fs=SR, output="sos"), out, axis=0)
out *= 10 ** (-24 / 20) / (np.sqrt(np.mean(out ** 2)) + 1e-12)
pk = np.abs(out).max()
if pk > 0.9: out *= 0.9 / pk
sf.write(dst, out.astype(np.float32), SR, subtype="PCM_24")
print(f"{dst}: {ln:.1f} s loop from {st:.1f} s, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS")
