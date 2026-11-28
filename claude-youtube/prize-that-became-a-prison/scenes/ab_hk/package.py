"""Pack shot AB_HK for the GPU box: one tar in out/ab_hk/ with a SHA-256 manifest inside it and a .sha256 beside it.

    python3 scenes/ab_hk/package.py

The tar has the calibration package's layout (scenes/anim_tests/package.py), so it can be unpacked on its own or its
blend/AB_HK.blend dropped into the calibration folder and rendered by the same run_gpu.sh (SHOTS=AB_HK):
  blend/AB_HK.blend   self-contained (textures packed; rain, ripples and steam are node trees, no caches)
  render.py, encode.py, check_gpu.py, run_gpu.sh   copied unchanged from scenes/anim_tests (one pipeline)
  grade_A.txt         the film's grade A, read from scenes/shoot.py
  RUN_AB_HK.md        the commands for this shot
  source/             the code that built it, for the record (rebuilding needs the repository and MPFB; the box does not)
"""
import ast
import hashlib
import io
import os
import tarfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.dirname(HERE)
PROD = os.path.dirname(SCENES)
NOIR = os.path.normpath(os.path.join(PROD, "..", "noir-kit"))
TESTS = os.path.join(SCENES, "anim_tests")
OUT = os.path.join(PROD, "out", "ab_hk")
NAME = "prize_ab_hk_gpu"
SHOT = "AB_HK"


def sha(path_or_bytes):
    h = hashlib.sha256()
    if isinstance(path_or_bytes, bytes):
        h.update(path_or_bytes)
    else:
        with open(path_or_bytes, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
    return h.hexdigest()


def grade_a():
    tree = ast.parse(open(os.path.join(SCENES, "shoot.py")).read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "GRADE" for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError("GRADE not found in scenes/shoot.py")


def main():
    blend = os.path.join(OUT, "blend", SHOT + ".blend")
    if not os.path.exists(blend):
        raise SystemExit(f"missing {blend}: build the shot first (scenes/ab_hk/shot_hk_rain.py)")
    files = [(f"blend/{SHOT}.blend", blend)]
    for n in ("render.py", "encode.py", "check_gpu.py", "run_gpu.sh", "check_frames.py"):
        files.append((n, os.path.join(TESTS, n)))
    files.append(("RUN_AB_HK.md", os.path.join(HERE, "RUN_AB_HK.md")))
    files.append(("grade_A.txt", (grade_a() + "\n").encode()))
    for n in sorted(os.listdir(HERE)):
        if n.endswith((".py", ".md", ".sh")):
            files.append((f"source/scenes/ab_hk/{n}", os.path.join(HERE, n)))
    for n in ("common.py", "shot_b_walk.py", "render.py", "encode.py"):
        files.append((f"source/scenes/anim_tests/{n}", os.path.join(TESTS, n)))
    for n in ("people.py", "shoot.py", "AGENT_BRIEF.md"):
        files.append((f"source/scenes/{n}", os.path.join(SCENES, n)))
    stage_dir = os.path.join(SCENES, "stages")
    for n in sorted(os.listdir(stage_dir)):
        if n.endswith(".py") and n.startswith("hongkong_street"):
            files.append((f"source/scenes/stages/{n}", os.path.join(stage_dir, n)))
    for n in sorted(os.listdir(NOIR)):
        if n.endswith(".py"):
            files.append((f"source/noir-kit/{n}", os.path.join(NOIR, n)))
    manifest = ("\n".join(f"{sha(src)}  {arc}" for arc, src in files) + "\n").encode()
    os.makedirs(OUT, exist_ok=True)
    tar_path = os.path.join(OUT, NAME + ".tar")
    with tarfile.open(tar_path, "w", format=tarfile.PAX_FORMAT) as tar:
        for arc, src in files + [("MANIFEST.sha256", manifest)]:
            arcname = f"{NAME}/{arc}"
            if isinstance(src, bytes):
                info = tarfile.TarInfo(arcname)
                info.size = len(src)
                info.mtime = int(time.time())
                info.mode = 0o644
                tar.addfile(info, io.BytesIO(src))
            else:
                info = tar.gettarinfo(src, arcname)
                info.uid = info.gid = 0
                info.uname = info.gname = "root"
                info.mode = 0o755 if arc.endswith(".sh") else 0o644
                with open(src, "rb") as f:
                    tar.addfile(info, f)
    digest = sha(tar_path)
    with open(tar_path + ".sha256", "w") as f:
        f.write(f"{digest}  {os.path.basename(tar_path)}\n")
    print(f"PACKAGE {tar_path}: {os.path.getsize(tar_path) / 1e6:.1f} MB, {len(files) + 1} files, sha256 {digest}")


if __name__ == "__main__":
    main()
