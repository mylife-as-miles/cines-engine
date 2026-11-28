#!/usr/bin/env python3
"""Colour check: known RGB patches through every encode path of the film, decoded as a player decodes them.

    <gfx python> tools/check_colour.py [--only doc,split,...] [--keep]

Why: ffmpeg's scaler converts RGB to YUV with the BT.601 matrix unless it is told otherwise, and the film's files are
tagged BT.709. A decoder trusts the tag, so a 601 conversion read as 709 comes back warm and yellow (a solid
200,100,50 read 210,105,45: the cognac tote went mustard). Each path below is driven through the project's own code
(its CLI, or its function with the inputs pointed at a sandbox), with flat 64 x 64 patches: 200,100,50 (the cognac),
100,62,40, 30,30,30, 235,235,235, pure red, green and blue, three rows of each in both halves of a 1920 x 1080 frame.

The reference is the RGB the code renders: the patches themselves where nothing grades them (type_render.js,
canvas_render.js, the type and the cut-away laid on after the grade), and the film's grade applied to them in RGB
(gfx/doc_composite.py grade_filter, as scenes/shoot.py grades a still) where the path grades its plate, with the grain's
own mean on the planes the path lays it on: ffmpeg's noise filter averages about -0.5 code values a plane, so grain on
the 4:2:0 BT.709 planes (every graded plate alone: the conversion to YUV comes before the grain, where ffmpeg's own sat)
moves a patch about (-1.5, -0.2, -1.6) in RGB, and grain on RGB planes (assemble's shots with type) -0.5 each. Over a
type layer at half alpha the reference is the straight-alpha blend of the two. The decode honours each file's tags (an
untagged file is read as BT.601, as ffmpeg reads it): `ffmpeg` is ffmpeg's own conversion to rgb24 (what ffmpeg-based
tools and OpenCV see), `exact` is the same conversion with accurate rounding and full chroma interpolation (close to a
player's float shader). The error is the largest per-channel difference of a patch's mean (its inner 32 x 32, over
every frame of the path), in 8-bit levels; a path passes when no patch is off by more than 3 on the `ffmpeg` decode.
The split's 4 px gutter (10,12,15) is read straight from the YUV planes and converted by the tags in floating point
(its luma is exact; x264 smears the chroma of a strip two chroma samples wide into its neighbours, about 2.5 levels).

Nothing here renders a reel: each path makes a quarter or half second at 1080p in a temporary sandbox, removed after
(--keep leaves it). Takes about a minute and a half.
"""
import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import types
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
GFX = ROOT / "gfx"
CANVAS = Path("/home/user/cines-engine/.claude/skills/cines-engine/scripts/canvas_render.js")
W, H, FPS = 1920, 1080, 24

PATCHES = [(200, 100, 50), (100, 62, 40), (30, 30, 30), (235, 235, 235), (255, 0, 0), (0, 255, 0), (0, 0, 255)]
NAMES = ["200,100,50", "100,62,40", "30,30,30", "235,235,235", "red", "green", "blue"]
S, IN = 64, 16                                             # patch size; the measured box is its inner 32 x 32
XS = [96 + 112 * i for i in range(7)] + [1056 + 112 * i for i in range(7)]   # left half (< 958), right half (>= 962)
ROWS = [200, 480, 760]                                     # A: the plate; B: an opaque layer; C: a layer at half alpha
BG = 128
GUTTER = (10, 12, 15)
TOL = 3.0

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style></head>
<body><canvas id="c" width="1920" height="1080"></canvas><script>
const P = %(patches)s, XS = %(xs)s, ROWS = %(rows)s, S = %(s)d, BG = %(bg)d;
const c = document.getElementById('c'), ctx = c.getContext('2d');
window.LOOK = 'A';
window.setBG = async () => {};
window.draw = (mode, t) => {
  ctx.clearRect(0, 0, c.width, c.height);
  if (mode === 'layer') {                      // a type layer: rows B opaque, C at half alpha, the rest transparent
    for (const [ri, a] of [[1, 1], [2, 128 / 255]]) XS.forEach((x, i) => {
      const [r, g, b] = P[i %% 7]; ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.fillRect(x, ROWS[ri], S, S); });
    return;
  }
  ctx.fillStyle = `rgb(${BG},${BG},${BG})`; ctx.fillRect(0, 0, c.width, c.height);   // opaque: the patches on grey
  for (const y of ROWS) XS.forEach((x, i) => { const [r, g, b] = P[i %% 7]; ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x, y, S, S); });
};
window.READY = true;
</script></body></html>
""" % dict(patches=json.dumps(PATCHES), xs=json.dumps(XS), rows=json.dumps(ROWS), s=S, bg=BG)

# gfx/type_render.js as the tools call it, drawing the test page instead of gfx/type.html when no --page is given
SHIM = """const { spawnSync } = require('child_process');
const a = process.argv.slice(2);
if (!a.includes('--page')) a.push('--page', %s);
const r = spawnSync(process.execPath, [%s, ...a], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
"""


def node_env():
    nr = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    return dict(os.environ, NODE_PATH=nr)


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        raise RuntimeError(f"failed: {' '.join(map(str, cmd))}\n{r.stdout[-1500:]}\n{r.stderr[-1500:]}")
    return r.stdout


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m


def plate_image():
    img = np.full((H, W, 3), BG, np.uint8)
    for y in ROWS:
        for i, x in enumerate(XS):
            img[y:y + S, x:x + S] = PATCHES[i % 7]
    return img


def boxes(rows=(0, 1, 2), half=None):
    """(row, column index, x, y) of every measured patch, optionally only one half (0 left, 1 right)."""
    return [(r, i, XS[i], ROWS[r]) for r in rows for i in range(14) if half is None or (i >= 7) == bool(half)]


def box_means(img, bx):
    return {(r, i): img[y + IN:y + S - IN, x + IN:x + S - IN].reshape(-1, 3).astype(np.float64).mean(0) for r, i, x, y in bx}


def probe_tags(f):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=color_space,color_primaries,color_transfer,color_range", "-of", "json", f])
    return json.loads(out)["streams"][0]


def tag_text(t):
    v = [t.get(k, "unknown") for k in ("color_space", "color_primaries", "color_transfer")]
    return "untagged" if all(x == "unknown" for x in v) else "/".join(v) + " " + t.get("color_range", "?")


def matrix_of(t):
    cs = t.get("color_space", "unknown")
    if cs == "bt709":
        return "bt709"
    if cs in ("unknown", "smpte170m", "bt470bg"):
        return "bt601"
    raise SystemExit(f"unexpected colour space {cs}")


def frames(f, exact=False):
    """Every frame of a file as RGB (uint8), converted by its tags."""
    t = probe_tags(f)
    vf = []
    if exact:
        rng = "pc" if t.get("color_range") == "pc" else "tv"
        vf = ["-vf", f"scale=in_color_matrix={matrix_of(t)}:in_range={rng}:flags=bicubic+accurate_rnd+full_chroma_int,format=rgb24"]
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(f), *vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    try:
        while True:
            b = p.stdout.read(W * H * 3)
            if len(b) < W * H * 3:
                break
            yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    finally:
        p.kill(); p.wait()


def yuv_frames(f):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(f), "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "yuv420p", "-"],
                         stdout=subprocess.PIPE)
    n = W * H * 3 // 2
    try:
        while True:
            b = p.stdout.read(n)
            if len(b) < n:
                break
            a = np.frombuffer(b, np.uint8)
            yield a[:W * H].reshape(H, W), a[W * H:W * H * 5 // 4].reshape(H // 2, W // 2), a[W * H * 5 // 4:].reshape(H // 2, W // 2)
    finally:
        p.kill(); p.wait()


def gutter_rgb(f, frame_ids):
    """The split's gutter (x 958-961) read from the planes (luma 958-961, chroma 479-480) and converted by the tags."""
    t = probe_tags(f)
    kr, kb = (0.2126, 0.0722) if matrix_of(t) == "bt709" else (0.299, 0.114)
    acc = []
    for k, (y, u, v) in enumerate(yuv_frames(f)):
        if k in frame_ids:
            acc.append((y[100:980, 958:962].mean(), u[50:490, 479:481].mean(), v[50:490, 479:481].mean()))
    Y, U, V = np.mean(acc, 0)
    yy, cb, cr = (Y - 16) / 219, (U - 128) / 224, (V - 128) / 224
    r = yy + 2 * (1 - kr) * cr
    b = yy + 2 * (1 - kb) * cb
    g = (yy - kr * r - kb * b) / (1 - kr - kb)
    return np.array([r, g, b]) * 255


def measure(f, plan, exact):
    """plan(k) -> [(key, row, column, reference RGB)] for frame k. Returns {key: (mean RGB, reference, column)}."""
    acc = {}
    for k, img in enumerate(frames(f, exact)):
        for key, r, i, ref in plan(k):
            x, y = XS[i], ROWS[r]
            m = img[y + IN:y + S - IN, x + IN:x + S - IN].reshape(-1, 3).astype(np.float64).mean(0)
            s = acc.setdefault(key, [np.zeros(3), 0, ref, i])
            s[0] += m; s[1] += 1
    return {key: (s[0] / s[1], np.asarray(s[2], np.float64), s[3]) for key, s in acc.items()}


# ---------------------------------------------------------------------------------------------- the sandbox

class Sandbox:
    def __init__(self, base):
        self.dir = Path(base)
        self.gfx = self.dir / "gfx"
        self.gfx.mkdir(parents=True)
        (self.dir / "frames/raw/cc").mkdir(parents=True)
        (self.dir / "scenes").mkdir()
        os.symlink(ROOT / "scenes/shoot.py", self.dir / "scenes/shoot.py")   # assemble reads the grade's text from it
        self.page = self.gfx / "test_page.html"
        self.page.write_text(PAGE)
        shutil.copy(self.page, self.gfx / "seam.html")                       # what the tools pass as --page gfx/seam.html
        (self.gfx / "type_render.js").write_text(SHIM % (json.dumps(str(self.page)), json.dumps(str(GFX / "type_render.js"))))
        self.plate = self.dir / "frames/raw/cc/patches.png"
        cv2.imwrite(str(self.plate), cv2.cvtColor(plate_image(), cv2.COLOR_RGB2BGR))
        self.white = self.dir / "frames/raw/cc/white.png"
        cv2.imwrite(str(self.white), np.full((H, W, 3), 255, np.uint8))
        self.env = node_env()

    def p(self, name):
        return self.dir / name


def page_still(sb, mode):
    """The test page as type_render.js draws it (RGBA)."""
    out = sb.p(f"still_{mode}.png")
    run(["node", GFX / "type_render.js", "still", mode, "0", out, "--page", sb.page], env=sb.env)
    im = cv2.imread(str(out), cv2.IMREAD_UNCHANGED)
    return cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA) if im.shape[2] == 4 else cv2.cvtColor(im, cv2.COLOR_BGR2RGBA)


def split_grain(g):
    """The grade without its grain, and the grain (the last filter, ffmpeg's noise)."""
    head, sep, tail = g.rpartition(",noise=")
    return (head, "noise=" + tail) if sep and "," not in tail else (g, None)


def graded_ref(img):
    """The film's grade on an RGB frame, in RGB, without its grain (as scenes/shoot.py grades a still, less the grain)."""
    import doc_composite
    g, _ = split_grain(doc_composite.grade_filter())
    out = run_bytes(["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                     "-vf", g, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], img.tobytes())
    return box_means(np.frombuffer(out, np.uint8).reshape(H, W, 3), boxes())


def run_bytes(cmd, data):
    r = subprocess.run([str(c) for c in cmd], input=data, capture_output=True)
    if r.returncode:
        raise RuntimeError(f"failed: {' '.join(map(str, cmd))}\n{r.stderr[-1500:]}")
    return r.stdout


def grain_means():
    """The grain's own mean, as RGB levels, on the two kinds of planes it is laid on: ffmpeg's noise filter averages about
    -0.5 code values a plane, which on BT.709 4:2:0 planes is about (-1.5, -0.2, -1.6) in RGB and on RGB planes -0.5 each.
    Measured here on flat mid grey, so a change to the grade's grain is followed."""
    import doc_composite
    _, noise = split_grain(doc_composite.grade_filter())
    if noise is None:
        return {"yuv": np.zeros(3), "rgb": np.zeros(3)}
    d = {}
    for fmt in ("yuv420p", "gbrp"):
        planes = []
        for vf in ([], ["-vf", noise]):
            b = run_bytes(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"color=c=0x808080:s=640x360:r=24:d=1,format={fmt}", *vf,
                           "-f", "rawvideo", "-pix_fmt", fmt, "-"], b"")
            a = np.frombuffer(b, np.uint8).astype(np.float64)
            if fmt == "yuv420p":
                a = a.reshape(-1, 640 * 360 * 3 // 2)
                planes.append(np.array([a[:, :640 * 360].mean(), a[:, 640 * 360:640 * 360 * 5 // 4].mean(), a[:, 640 * 360 * 5 // 4:].mean()]))
            else:
                planes.append(a.reshape(-1, 3, 640 * 360).mean((0, 2)))
        d[fmt] = planes[1] - planes[0]
    dy, du, dv = d["yuv420p"][0] / 219, d["yuv420p"][1] / 224, d["yuv420p"][2] / 224
    yuv = np.array([dy + 1.5748 * dv, dy - 0.1873 * du - 0.4681 * dv, dy + 1.8556 * du]) * 255
    g, b, r = d["gbrp"]                                    # gbrp's planes are G, B, R
    return {"yuv": yuv, "rgb": np.array([r, g, b])}


class Refs:
    def __init__(self, sb):
        self.page_rgba = page_still(sb, "patches")
        self.layer_rgba = page_still(sb, "layer")
        page = box_means(self.page_rgba[..., :3], boxes())
        plate = box_means(plate_image(), boxes())
        self.page_matches_plate = max(np.abs(page[k] - plate[k]).max() for k in page)
        self.page = page
        self.grain = grain_means()
        g0 = graded_ref(plate_image())
        # the graded plate as each path renders it: the grade, then its grain on 4:2:0 YUV planes (a plate alone: ffmpeg
        # lays the grain after the conversion to the encoder's format) or on RGB planes (the assemble shots with type)
        self.graded = {dom: {k: v + sh for k, v in g0.items()} for dom, sh in self.grain.items()}
        lay = box_means(self.layer_rgba[..., :3], boxes((1, 2)))
        alpha = {k: v[0] for k, v in box_means(np.repeat(self.layer_rgba[..., 3:], 3, 2), boxes((1, 2))).items()}
        self.layer = {k: lay[k] for k in lay if k[0] == 1}
        self.blend = {dom: {k: (alpha[k] * lay[k] + (255 - alpha[k]) * gr[k]) / 255 for k in lay if k[0] == 2}
                      for dom, gr in self.graded.items()}


def plan_all(ref):                      # every patch of the frame from one reference set
    return lambda k: [((r, i), r, i, ref[(r, i)]) for r, i, _, _ in boxes()]


def plan_type(R, dom):                  # a graded plate with the type layer on it: A plate, B layer, C blend
    def f(k):
        out = [((0, i), 0, i, R.graded[dom][(0, i)]) for i in range(14)]
        out += [((1, i), 1, i, R.layer[(1, i)]) for i in range(14)]
        out += [((2, i), 2, i, R.blend[dom][(2, i)]) for i in range(14)]
        return out
    return f


# ---------------------------------------------------------------------------------------------- the paths

def path_type_render(sb, R):
    out = sb.p("type_render.mp4")
    run(["node", GFX / "type_render.js", "seq", "patches", "0.25", out, "--page", sb.page], env=sb.env)
    return [("type_render.js seq (PNG pipe)", out, plan_all(R.page), None)]


def path_canvas(sb, R):
    out = sb.p("canvas.mp4")
    run(["node", CANVAS, sb.page, "seq", "patches", "0", "0.5", out], env=sb.env)
    res = [("canvas_render.js as it writes it (untagged)", out, plan_all(R.page), None)]
    # gfx/typetest_build.sh `mux`: its video chain, run on a canvas_render output with its encode settings
    src = (GFX / "typetest_build.sh").read_text()
    import re
    vf = re.search(r'\[0:v\]([^\[]*)\[v\]', src).group(1)
    mux = sb.p("typetest_mux.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", mux])
    res.append(("typetest_build.sh mux (canvas -> delivery)", mux, plan_all(R.page), None))
    return res


def path_doc(sb, R):
    res = []
    white = sb.p("white_tex.mp4")              # a white screen texture on a small quad away from the patches
    run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=white:s=64x64:d=1:r=24", "-c:v", "libx264", "-crf", "14",
         "-pix_fmt", "yuv420p", white])
    canvas = sb.p("canvas_tex.mp4")            # a canvas_render texture (as the laptop screen) pinned over a white plate
    run(["node", CANVAS, sb.page, "seq", "patches", "0", "0.5", canvas], env=sb.env)
    for name, plate, tex, pins in [("doc_composite (plate)", sb.plate, white, [[16, 16], [80, 16], [80, 80], [16, 80]]),
                                   ("doc_composite (canvas texture)", sb.white, canvas, [[0, 0], [W, 0], [W, H], [0, H]])]:
        tag = "plate" if "plate" in name else "tex"
        cj = sb.p(f"corners_{tag}.json")
        cj.write_text(json.dumps({"corners": dict(zip(["top_left", "top_right", "bottom_right", "bottom_left"], pins))}))
        shot = sb.p(f"shot_{tag}.json")
        shot.write_text(json.dumps({"plate": str(plate), "corners": str(cj), "texture": {"video": str(tex), "fps": 24},
                                    "focus_uv": [0.5, 0.5], "zoom": [1.0, 1.0], "duration": 0.25, "length": 0.25}))
        out = sb.p(f"doc_{tag}.mp4")
        run([sys.executable, GFX / "doc_composite.py", "--shot", shot, "--out", out], cwd=ROOT)
        res.append((name, out, plan_all(R.graded["yuv"]), None))
    return res


def path_split(sb, R):
    import split
    split.HERE = str(sb.gfx)                   # its cut-away (seam.html cutaway_half) is the test page
    img = plate_image()
    a = types.SimpleNamespace(out=str(sb.p("split.mp4")), len=0.5, cut=0.25, fps=FPS)
    n, cut_f = int(round(a.len * a.fps)), int(round(a.cut * a.fps))
    tmp = tempfile.mkdtemp(prefix="split-", dir=sb.dir)
    split.render_clip(a, n, tmp, lambda t: img, sb.env, split.HW + split.GUT)

    def plan(k):
        out = [((r, i, "L"), r, i, R.graded["yuv"][(r, i)]) for r, i, _, _ in boxes(half=0)]
        if k < cut_f:
            out += [((r, i, "R plate"), r, i, R.graded["yuv"][(r, i)]) for r, i, _, _ in boxes(half=1)]
        else:
            out += [((r, i, "R cut-away"), r, i, R.page[(r, i)]) for r, i, _, _ in boxes(half=1)]
        return out
    res = [("split clip (render_clip)", Path(a.out), plan, list(range(n)))]
    got = split.deliver_plates(img)            # the tote fit's view of the clip: must be the clip
    res.append(("split fit view (deliver_plates)", got, plan_all(R.graded["yuv"]), None))
    return res


def path_plate_type(sb, R):
    import plate_type
    plate_type.HERE = str(sb.gfx)              # its type layer (type.html) is the test page's `layer`
    out = sb.p("plate_type.mp4")
    argv = sys.argv
    sys.argv = ["plate_type.py", "layer", "0.25", str(sb.plate), str(out), "--push", "1", "1"]
    try:
        plate_type.main()
    finally:
        sys.argv = argv
    return [("plate_type (plate + type overlay)", out, plan_type(R, "yuv"), None)]


def path_montage(sb, R):
    import montage
    montage.HERE, montage.ROOT = str(sb.gfx), str(sb.dir)
    montage.SHOTS = [("cc/patches", 6, 1.0, 1.0, 0.5, 0.5), ("seam", 6, 0, 0, 0, 0)]
    out = sb.p("montage.mp4")
    argv = sys.argv
    sys.argv = ["montage.py", "--out", str(out)]
    try:
        montage.main()
    finally:
        sys.argv = argv
    return [("montage concat (plate, then seam)", out,
             lambda k: [((r, i, "plate" if k < 6 else "seam"), r, i, (R.graded["yuv"] if k < 6 else R.page)[(r, i)]) for r, i, _, _ in boxes()],
             None)]


def path_assemble(sb, R):
    asm = load("assemble_under_test", ROOT / "tools/assemble.py")
    film = sb.dir / "out/film"
    asm.ROOT, asm.FILM_DIR, asm.SHOTS, asm.PIECES = sb.dir, film, film / "shots", film / "pieces"
    asm.FILM, asm.EDL_JSON = film / "animatic.mp4", sb.dir / "EDL.json"
    (film / "tmp").mkdir(parents=True)
    n = 6
    plate = {"kind": "plate", "plate": "frames/raw/cc/patches.png", "stage": "cc", "camera": "patches", "zoom": [1.0, 1.0],
             "centre": [0.5, 0.5], "frames": n}
    shots = [
        {"id": "cc-type", "frames": n, "source": dict(plate, type=[{"mode": "layer", "look": "B", "t0": 0.0, "tin": 0.0}])},
        {"id": "cc-plate", "frames": n, "source": dict(plate, type=[])},
        {"id": "cc-canvas", "frames": n, "source": {"kind": "piece", "name": "cc_canvas", "in": 0.0, "frames": n, "file": None,
                                                     "gen": {"tool": "canvas", "page": "gfx/test_page.html", "mode": "patches"}}},
        {"id": "cc-seam", "frames": n, "source": {"kind": "piece", "name": "cc_seam", "in": 0.0, "frames": n, "file": None,
                                                   "gen": {"tool": "seam", "mode": "flash"}}},
    ]
    asm.EDL_JSON.write_text(json.dumps({"shots": shots, "total_frames": n * len(shots)}))
    for e in shots:
        asm.render_shot(e)
    asm.join_cmd(None)
    plans = [plan_type(R, "rgb"), plan_all(R.graded["yuv"]), plan_all(R.page), plan_all(R.page)]
    names = ["plate + type", "plate", "canvas piece", "type_render piece"]
    res = [(f"assemble cache: {nm}", asm.SHOTS / f"{e['id']}.mp4", pl, None) for nm, e, pl in zip(names, shots, plans)]

    def joined(k):
        s = k // n
        return [((s,) + key, r, i, ref) for key, r, i, ref in plans[s](k % n)]
    res.append(("assemble join (the four shots)", asm.FILM, joined, None))
    return res


PATHS = dict(type_render=path_type_render, canvas=path_canvas, doc=path_doc, split=path_split, plate_type=path_plate_type,
             montage=path_montage, assemble=path_assemble)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated: " + ",".join(PATHS))
    ap.add_argument("--keep", action="store_true", help="leave the sandbox")
    a = ap.parse_args()
    sys.path.insert(0, str(GFX))
    base = tempfile.mkdtemp(prefix="check-colour-")
    tempfile.tempdir = base                    # the tools' own temporary files land in the sandbox too
    sb = Sandbox(Path(base) / "sb")
    try:
        R = Refs(sb)
        if R.page_matches_plate > 0:
            print(f"note: the test page renders {R.page_matches_plate:.0f} levels off the patches; its own pixels are the reference")
        results = []
        for name in (a.only.split(",") if a.only else PATHS):
            print(f"... {name}", flush=True)
            results += PATHS[name](sb, R)
        rows = []
        for label, f, plan, gutter_frames in results:
            if isinstance(f, np.ndarray):          # an already decoded frame (the split's fit view)
                got = {}
                for key, r, i, ref in plan(0):
                    x, y = XS[i], ROWS[r]
                    got[key] = (f[y + IN:y + S - IN, x + IN:x + S - IN].reshape(-1, 3).astype(np.float64).mean(0), np.asarray(ref), i)
                d, e, tags = got, got, "(decoded by split.py)"
            else:
                d, e, tags = measure(f, plan, False), measure(f, plan, True), tag_text(probe_tags(f))
            per = [0.0] * 7
            for m, ref, i in d.values():
                per[i % 7] = max(per[i % 7], float(np.abs(m - ref).max()))
            ex = max(float(np.abs(m - ref).max()) for m, ref, _ in e.values())
            g = None
            if gutter_frames is not None:
                g = float(np.abs(gutter_rgb(f, set(gutter_frames)) - np.array(GUTTER)).max())
            rows.append((label, per, max(per), ex, g, tags))
        print()
        hdr = f"{'path':<44}" + "".join(f"{n:>12}" for n in NAMES) + f"{'max':>7}{'exact':>7}{'gutter':>8}  verdict  tags"
        print(hdr); print("-" * len(hdr))
        ok = True
        for label, per, mx, ex, g, tags in rows:
            fail = mx > TOL or (g is not None and g > TOL)
            ok &= not fail
            print(f"{label:<44}" + "".join(f"{v:>12.1f}" for v in per) + f"{mx:>7.1f}{ex:>7.1f}"
                  + (f"{g:>8.1f}" if g is not None else f"{'':>8}") + f"  {'FAIL' if fail else 'pass':<7}  {tags}")
        print(f"\nmax per-channel error of a patch's mean, 8-bit levels; pass <= {TOL:.0f} ({'all pass' if ok else 'FAILURES'})")
        return 0 if ok else 1
    finally:
        if a.keep:
            print("sandbox kept:", base)
        else:
            shutil.rmtree(base, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
