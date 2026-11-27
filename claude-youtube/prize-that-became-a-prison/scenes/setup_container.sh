#!/bin/bash
# Rebuild everything the stages need that is not in git, in a fresh container. Run from the repository root:
#     bash claude-youtube/prize-that-became-a-prison/scenes/setup_container.sh
# Network: PyPI (package registry) and github.com. About 5-10 minutes, most of it downloading Blender (~300 MB).
# The 26 Tripo props and the MakeHuman clothes are in git (noir-kit/assets/props, noir-kit/assets/makehuman).
set -e
REPO=$(pwd)
KIT=$REPO/claude-youtube/noir-kit
VENV=${VENV:-$HOME/bpyenv}

echo "== 1. Blender 5.3 as a Python module (needs Python 3.13) -> $VENV"
PY=$(command -v python3.13 || command -v python3)
if "$PY" -c 'import ensurepip' 2>/dev/null; then
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install -q bpy==5.3.0
elif command -v uv >/dev/null; then
  # Debian can supply the interpreter and venv without the ensurepip package.
  "$PY" -m venv --without-pip "$VENV"
  uv pip install --python "$VENV/bin/python" bpy==5.3.0
else
  echo "Install the Python 3.13 venv package or uv to install Blender." >&2
  exit 1
fi
"$VENV/bin/python" -c "import bpy; print('bpy', bpy.app.version_string)"

echo "== 2. MPFB 2 (MakeHuman for Blender, CC0) as a Blender extension"
rm -rf /tmp/mpfb2 && git clone -q --depth 1 https://github.com/makehumancommunity/mpfb2 /tmp/mpfb2
mkdir -p "$HOME/.config/blender/5.3/extensions/user_default"
rm -rf "$HOME/.config/blender/5.3/extensions/user_default/mpfb"
cp -r /tmp/mpfb2/src/mpfb "$HOME/.config/blender/5.3/extensions/user_default/"

echo "== 3. MakeHuman system clothes (CC0): in git; downloaded only if missing"
if [ -d "$KIT/assets/makehuman/clothes/female_elegantsuit01" ]; then echo "   present"; else
mkdir -p "$KIT/assets/makehuman" /tmp/mhpack
curl -fL -o /tmp/mhpack/pack.zip \
  https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
(cd /tmp/mhpack && unzip -q -o pack.zip)
SRC=$(find /tmp/mhpack -type d -name clothes | head -1)
rm -rf "$KIT/assets/makehuman/clothes" && cp -r "$SRC" "$KIT/assets/makehuman/clothes"
fi
ls "$KIT/assets/props" | wc -l | sed 's/^/   Tripo props in git: /'

echo "== 4. glTF-Transform (only for NEW Tripo downloads, which come meshopt-compressed)"
mkdir -p "$HOME/gltftool" && cd "$HOME/gltftool" && [ -f package.json ] || npm init -y >/dev/null
cd "$HOME/gltftool" && npm install --silent @gltf-transform/core@4 @gltf-transform/extensions@4 \
  @gltf-transform/functions@4 meshoptimizer@0.22
cp "$KIT/tools/unpack_glb.mjs" "$HOME/gltftool/"
echo "   unpack with: (cd ~/gltftool && node unpack_glb.mjs in.glb $KIT/assets/props/<name>.glb)"

echo "== 5. Check: build the shared cast (no render)"
cd "$REPO"
"$VENV/bin/python" -I - <<'EOF'
import sys
sys.path.insert(0, "claude-youtube/noir-kit")
sys.path.insert(0, "claude-youtube/prize-that-became-a-prison/scenes")
import bpy
import setkit as sk
sk.reset()
import people
print("CAST OK", people.dawn().name, people.officer("OfficerA", 0).name, people.man("Tim").name)
EOF
echo "Done. Next: render a stage with scenes/shoot.py (HANDOFF.md, step 4)."
