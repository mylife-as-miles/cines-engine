"""Patch loud events out of a stationary bed with crossfaded copies of the same take's steady tone, then loop it.
Used for amb_inspection_room (sa_1401: events 1.0-4.5 s and 22.5-24.0 s, patched from 8 s and 14 s).
Usage: python patch_steady.py RAW.wav OUT.wav A:B@SRC [A:B@SRC ...]"""
import sys, os, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import finish

def patch(x, regions):
    SR = finish.SR; xf = int(0.08 * SR); y = x.copy()
    for (a, b), s in regions:
        i0, i1 = int(a * SR) - xf, int(b * SR) + xf
        src = x[int(s * SR) - xf: int(s * SR) - xf + (i1 - i0)]
        w = np.ones(i1 - i0); t = np.linspace(0, np.pi / 2, xf)
        w[:xf] = np.sin(t) ** 2; w[-xf:] = np.cos(t) ** 2
        y[i0:i1] = x[i0:i1] * (1 - w[:, None]) + src * w[:, None]
    return y

if __name__ == '__main__':
    regs = []
    for r in sys.argv[3:]:
        ab, s = r.split('@'); a, b = ab.split(':'); regs.append(((float(a), float(b)), float(s)))
    y = patch(finish.load(sys.argv[1]), regs)
    z, info = finish.loop_ready(y, length=30); z, _ = finish.level_bed(z)
    sf.write(sys.argv[2], z.astype(np.float32), finish.SR, subtype='PCM_24'); print(info)
