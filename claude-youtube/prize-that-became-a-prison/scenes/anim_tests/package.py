"""Pack the calibration test for a fresh GPU box: one tar in out/anim_tests/ with a SHA-256 manifest inside it and a
.sha256 beside it.

    python3 scenes/anim_tests/package.py

The tar holds what the box needs to render and encode (the three self-contained .blend files, their textures packed
in, render.py, encode.py, check_gpu.py, run_gpu.sh, grade_A.txt, RUN_ON_GPU.md) and, under source/, the code that
built them (scenes/anim_tests, the three stages and their helpers, scenes/people.py and shoot.py, noir-kit's .py),
for the record: rebuilding needs the repository's assets and MPFB, the box does not.
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
OUT = os.path.join(PROD, "out", "anim_tests")
NAME = "prize_anim_test_gpu"
SHOTS = ("A_typing", "B_walk", "C_corridor")
STAGES = ("evidence_table", "checkin_hall", "detention_corridor")


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
    files = []                                           # (arcname, source path or bytes)
    for s in SHOTS:
        p = os.path.join(OUT, "blend", s + ".blend")
        if not os.path.exists(p):
            raise SystemExit(f"missing {p}: build the shot first")
        files.append((f"blend/{s}.blend", p))
    for n in ("render.py", "encode.py", "check_gpu.py", "run_gpu.sh", "RUN_ON_GPU.md"):
        files.append((n, os.path.join(HERE, n)))
    files.append(("grade_A.txt", (grade_a() + "\n").encode()))
    for n in sorted(os.listdir(HERE)):
        if n.endswith((".py", ".md", ".sh")):
            files.append((f"source/scenes/anim_tests/{n}", os.path.join(HERE, n)))
    for n in ("people.py", "shoot.py", "AGENT_BRIEF.md"):
        files.append((f"source/scenes/{n}", os.path.join(SCENES, n)))
    stage_dir = os.path.join(SCENES, "stages")
    for n in sorted(os.listdir(stage_dir)):
        if n.endswith(".py") and n.startswith(STAGES):
            files.append((f"source/scenes/stages/{n}", os.path.join(stage_dir, n)))
    for n in sorted(os.listdir(NOIR)):
        if n.endswith(".py"):
            files.append((f"source/noir-kit/{n}", os.path.join(NOIR, n)))
    lines = []
    for arc, src in files:
        lines.append(f"{sha(src)}  {arc}")
    manifest = ("\n".join(lines) + "\n").encode()
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
                if arc.endswith(".sh"):
                    info.mode = 0o755
                with open(src, "rb") as f:
                    tar.addfile(info, f)
    digest = sha(tar_path)
    with open(tar_path + ".sha256", "w") as f:
        f.write(f"{digest}  {os.path.basename(tar_path)}\n")
    size = os.path.getsize(tar_path)
    print(f"PACKAGE {tar_path}: {size / 1e6:.1f} MB, {len(files) + 1} files, sha256 {digest}")


if __name__ == "__main__":
    main()
