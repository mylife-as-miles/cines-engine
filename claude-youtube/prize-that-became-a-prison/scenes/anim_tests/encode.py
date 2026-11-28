"""Grade a shot's rendered frames with the film's grade A and encode them to an MP4 (needs only ffmpeg).

    python3 encode.py --frames frames/C --out C.mp4 [--grade grade_A.txt | --shoot scenes/shoot.py]
                      [--first 1] [--last 116] [--crf 16]

Grade A is GRADE in scenes/shoot.py, read from that file (or from grade_A.txt in the GPU package, written from it),
with its grain made temporal (allf=u -> allf=t+u) as the film's other moving shots have it (gfx/doc_composite.py,
gfx/plate_type.py): a static grain pattern over moving pictures reads as dirt on the lens.
"""
import argparse
import ast
import os
import shutil
import subprocess
import sys
import tempfile


def grade_from_shoot(path):
    tree = ast.parse(open(path).read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "GRADE" for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f"no GRADE in {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--grade", default=None, help="file holding the grade filter (grade_A.txt)")
    ap.add_argument("--shoot", default=None, help="scenes/shoot.py to read GRADE from")
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=None)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--ext", default="png")
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    if a.grade:
        grade = open(a.grade).read().strip()
    else:
        shoot = a.shoot or os.path.join(here, "..", "shoot.py")
        grade = grade_from_shoot(shoot)
    grade = grade.replace("allf=u", "allf=t+u")
    names = sorted(f for f in os.listdir(a.frames) if f.endswith("." + a.ext) and not f.startswith("."))
    nums = [int(os.path.splitext(f)[0][-4:]) for f in names]
    last = a.last or max(nums)
    want = list(range(a.first, last + 1))
    missing = [n for n in want if n not in nums]
    if missing:
        sys.exit(f"ENCODE error: {len(missing)} frames missing, first {missing[:5]}")
    # a gap-free numbered copy (links), so ffmpeg reads exactly the wanted range
    tmp = tempfile.mkdtemp()
    prefix = os.path.splitext(names[0])[0][:-4]
    for i, n in enumerate(want):
        os.symlink(os.path.abspath(os.path.join(a.frames, f"{prefix}{n:04d}.{a.ext}")),
                   os.path.join(tmp, f"{i:05d}.{a.ext}"))
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(a.fps), "-i", os.path.join(tmp, f"%05d.{a.ext}"),
           "-vf", grade + ",format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf),
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           "-movflags", "+faststart", a.out]
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp)
    print(f"ENCODE {a.out}: frames {a.first}-{last} ({len(want)} at {a.fps} fps), grade A (temporal grain)")


if __name__ == "__main__":
    main()
