# Noir kit: the channel's shared character and set system

The investigative-noir documentaries share one character system and one set of parts, so the channel has one recognisable look and every film builds faster. Films are told apart by light, composition, motion graphics and sound, never by changing the people.

| File | What it is |
| --- | --- |
| `cast.py` | **The cast**: MakeHuman (MPFB 2, CC0) bodies with natural faces finished as matte statues, blank statue eyes, sculpted hair (bun or short), sculpted shoes, a blouse inside an open collar, hats sized to the head; Rigify rig. |
| `fit.py` | Real garments onto a figure: size to the torso, collar or waistband to height, arms along the sleeves (trousers: feet in the cuffs), bind to an invisible triangulated copy of the body so the garment follows any pose, hide the skin it covers, and hide inner layers under outer ones. |
| `rigged.py` | Posing for every figure (`pose_figure`), and the earlier figure from the author's Rigify "rigged human structure", sized through a parent empty, dressed by colouring zones of its own mesh (until real outfits are fitted), posed with readable angles through Rigify's FK controls. |
| `mannequin.py` | The first, procedural mannequin (capsules and lofts, fused and smoothed). Kept as a fallback; `rigged.py` replaces it. |
| `setkit.py` | Set parts: materials (tiles, wood, emission), boxes, cylinders, arcs, area lights, haze, camera, Cycles render settings. |
| `assets/` | Not in git: `rigged_human_structure.blend` (licence to confirm with the author). |

MPFB 2 must be installed as a Blender extension (copy `src/mpfb` from github.com/makehumancommunity/mpfb2 into Blender's `extensions/user_default/`), with Rigify enabled. Run with Blender 5.3 as a Python module: `python3 -m venv bpyenv && bpyenv/bin/pip install bpy`, then `bpyenv/bin/python -I scene.py -- out.png`. Import `bpy` before `bmesh` or `mathutils`. Never scale a Rigify rig directly to resize a character: in a render it stays at its source size; scale a parent instead.
