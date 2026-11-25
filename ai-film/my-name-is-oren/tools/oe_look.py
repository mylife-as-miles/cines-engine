#!/usr/bin/env python3
"""OpenEmulsion film looks, headless: its colour engine (ColorBench, MPL-2.0, built on Linux outside the repo) applied
to display-referred Rec.709 frames, and baked into 3D LUTs that ffmpeg's lut3d applies to the whole film.

    python3 tools/oe_look.py presets                                   list the engine's 53 looks
    python3 tools/oe_look.py frame IN.png OUT.png "2383 Print" [--blend 1.0]
    python3 tools/oe_look.py bake "2383 Print" grade/luts/2383.cube [--size 33] [--mix 1.0]

Build the engine once (sound.md-style tool layout; .claude/skills/cines-engine/references/color.md):
    git clone --depth 1 https://github.com/technomancer702/openemulsion /home/user/technomancer702/openemulsion
    cd /home/user/technomancer702/openemulsion/ofx && g++ -O2 -std=c++17 -shared -fPIC \
      '-D__declspec(x)=__attribute__((visibility("default")))' tools/ColorBench.cpp -I src -o ../libColorBench.so -lpthread

Settings as OpenEmulsion's own Rec.709 examples use them: input Rec.709 / Gamma 2.4 (space 5), output Rec.709 / Gamma 2.4,
rendering Conversion Only (the footage is already display-referred, so no second scene-to-display curve), colour
modules only (negative, print, development, selective). Grain and halation are not in a LUT; they are applied later.
`--mix` blends the look with the identity inside the LUT (look strength).
"""
import ctypes, os, subprocess, sys
import numpy as np

LIB = os.environ.get('OPENEMULSION_LIB', '/home/user/technomancer702/openemulsion/libColorBench.so')
FLOATS = np.ctypeslib.ndpointer(dtype=np.float32, flags='C_CONTIGUOUS')
MASK, COLOR_MODULES = 19, 1 | 2 | 32 | 128
REC709, OUT_REC709, CONVERSION_ONLY = 5, 1, 1


class Engine:
    def __init__(self):
        d = ctypes.CDLL(LIB)
        for f in ('oe_settings_count', 'oe_rendering_index', 'oe_retention_index', 'oe_preset_count'):
            getattr(d, f).restype = ctypes.c_int
        d.oe_preset_label.argtypes = [ctypes.c_int]; d.oe_preset_label.restype = ctypes.c_char_p
        d.oe_preset_settings.argtypes = [ctypes.c_int, FLOATS, ctypes.c_size_t]
        d.oe_render.argtypes = [FLOATS, FLOATS, ctypes.c_size_t, FLOATS, ctypes.c_size_t, ctypes.c_float]
        self.d, self.n = d, d.oe_settings_count()
        self.presets = {d.oe_preset_label(i).decode(): i for i in range(d.oe_preset_count())}

    def settings(self, label):
        s = np.zeros(self.n, np.float32)
        if self.d.oe_preset_settings(self.presets[label], s, self.n):
            raise ValueError(label)
        s[26], s[27], s[self.d.oe_rendering_index()] = REC709, OUT_REC709, CONVERSION_ONLY
        s[self.d.oe_retention_index()] = 0
        s[MASK] = int(s[MASK]) & COLOR_MODULES
        return s

    def render(self, rgb, label):
        """rgb: HxWx3 float32 display-referred Rec.709 in 0..1 -> same"""
        h, w = rgb.shape[:2]
        rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = rgb
        out = np.empty_like(rgba)
        if self.d.oe_render(np.ascontiguousarray(rgba), out, h * w, self.settings(label), self.n, 0.0):
            raise ValueError('render rejected')
        return np.clip(out[..., :3], 0, 1)


def read_png(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-'], capture_output=True, check=True)
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True)
    w, h = (int(x) for x in p.stdout.strip().split(','))
    return (np.frombuffer(r.stdout, np.uint16).reshape(h, w, 3).astype(np.float32) / 65535.0)


def write_png(rgb, path):
    h, w = rgb.shape[:2]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-s', f'{w}x{h}', '-i', '-', path],
                   input=np.rint(np.clip(rgb, 0, 1) * 65535).astype('<u2').tobytes(), check=True)


def bake(engine, label, out, size=33, mix=1.0, title=None):
    g = np.linspace(0, 1, size, dtype=np.float32)
    b, gg, r = np.meshgrid(g, g, g, indexing='ij')          # .cube order: red changes fastest
    lattice = np.stack([r, gg, b], -1).reshape(1, -1, 3)
    looked = engine.render(lattice, label).reshape(-1, 3)
    ident = lattice.reshape(-1, 3)
    lut = ident + (looked - ident) * mix
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w') as f:
        f.write(f'TITLE "{title or label}"\n# OpenEmulsion ColorBench, Rec.709 in/out, Conversion Only, colour modules; mix {mix}\n')
        f.write(f'LUT_3D_SIZE {size}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        for row in lut:
            f.write(f'{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}\n')
    return out


def main():
    a = sys.argv[1:]
    e = Engine()
    if a[0] == 'presets':
        print('\n'.join(e.presets))
    elif a[0] == 'frame':
        blend = float(a[a.index('--blend') + 1]) if '--blend' in a else 1.0
        src = read_png(a[1]); out = e.render(src, a[3])
        write_png(src + (out - src) * blend, a[2])
    elif a[0] == 'bake':
        size = int(a[a.index('--size') + 1]) if '--size' in a else 33
        mix = float(a[a.index('--mix') + 1]) if '--mix' in a else 1.0
        print('wrote', bake(e, a[1], a[2], size, mix))


if __name__ == '__main__':
    main()
