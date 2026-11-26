# Noir kit: the channel's shared character and set system

The investigative-noir documentaries share one character system and one set of parts, so the channel has one recognisable look and every film builds faster. Films are told apart by light, composition, motion graphics and sound, never by changing the people.

| File | What it is |
| --- | --- |
| `rigged.py` | The cast: the author's Rigify "rigged human structure", sized through a parent empty, dressed by colouring zones of its own mesh (until real outfits are fitted), posed with readable angles through Rigify's FK controls. |
| `mannequin.py` | The first, procedural mannequin (capsules and lofts, fused and smoothed). Kept as a fallback; `rigged.py` replaces it. |
| `setkit.py` | Set parts: materials (tiles, wood, emission), boxes, cylinders, arcs, area lights, haze, camera, Cycles render settings. |
| `assets/` | Not in git: `rigged_human_structure.blend` (licence to confirm with the author). |

Run with Blender 5.3 as a Python module: `python3 -m venv bpyenv && bpyenv/bin/pip install bpy`, then `bpyenv/bin/python -I scene.py -- out.png`. Import `bpy` before `bmesh` or `mathutils`. Never scale a Rigify rig directly to resize a character: in a render it stays at its source size; scale a parent instead.
