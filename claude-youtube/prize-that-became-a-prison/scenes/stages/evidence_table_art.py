"""Dawn's pencils, brushes, cloth samples and unnumbered tape for the evidence-table insert."""
import math

import bmesh
import bpy
from mathutils import Vector

import evidence_table_mats as mt
import evidence_table_paper as pp
import setkit as sk


def art_tools(m):
    items = []
    lacquer = mt.matte("pencil lacquer", (0.29, 0.18, 0.052), 0.54)
    cedar = mt.matte("pencil cedar", (0.49, 0.32, 0.16), 0.78)
    graphite = mt.matte("graphite", (0.048, 0.049, 0.052), 0.42)
    bristle = mt.matte("brush bristles", (0.22, 0.12, 0.060), 0.82)
    for name, x, y, angle, brush in (
        ("ochre pencil", -0.158, 0.015, 71, False),
        ("graphite pencil", -0.182, 0.031, 79, False),
        ("round brush", -0.143, 0.065, 49, True),
        ("fine brush", -0.127, 0.089, 43, True),
    ):
        axis = Vector((math.cos(math.radians(angle)), math.sin(math.radians(angle)), 0))
        radius = 0.0038 if brush else 0.00345
        centre = Vector((x, y, pp.TOP + radius))
        def segment(part, start, end, r0, r1, mat, sides):
            ob = sk.cyl(name + " " + part, r0, end - start, centre + axis * ((start + end) / 2),
                        mat, verts=sides, r2=r1)
            ob.rotation_euler = axis.to_track_quat("Z", "Y").to_euler()
            items.append(ob)
        if brush:
            segment("handle", -0.077, 0.040, radius * 0.86, radius, m["pen"], 20)
            segment("ferrule", 0.040, 0.064, radius * 1.09, radius, m["chrome"], 24)
            segment("hair", 0.064, 0.081, radius, radius * 0.12, bristle, 20)
        else:
            segment("shaft", -0.074, 0.071, radius, radius, lacquer if name == "ochre pencil" else graphite, 6)
            segment("point", 0.071, 0.082, radius, 0.00075, cedar, 6)
            segment("lead", 0.082, 0.085, 0.00075, 0.00014, graphite, 12)
    return items


def swatches():
    items = []
    for i, (x, y, turn, col) in enumerate((
        (-0.004, 0.044, -14, (0.20, 0.15, 0.105)),
        (0.014, 0.033, 4, (0.16, 0.20, 0.19)),
        (0.036, 0.019, 15, (0.27, 0.13, 0.096)),
    )):
        w, h = 0.128, 0.094
        cloth = mt.matte("sample weave " + str(i), col, 0.89)
        mt.tune_prop(cloth, weave=(0.00072 + i * 0.0001, 0.28))
        def pinked(px, py, ix, iy):
            if ix in (0, 36):
                px += (1 if ix == 0 else -1) * (iy % 2) * 0.0016
            if iy in (0, 26):
                py += (1 if iy == 0 else -1) * (ix % 2) * 0.0016
            return px, py
        bm = pp.grid_bm(w, h, 36, 26, pinked)
        def cloth_edge(px, py):
            return 0.0022 * max(0, px / w + py / h - 0.38) ** 2
        ob = pp.place_flat("cloth sample " + str(i), bm, pp.frame(x, y, turn), cloth, 0.00070,
                           shape=cloth_edge, stiff=18)
        items.append(ob)
    return items


def tape():
    """A soft S laid across the wood, with short woven measuring marks and no numerals."""
    fabric = mt.matte("cream tape", (0.50, 0.46, 0.34), 0.88)
    mt.tune_prop(fabric, weave=(0.00062, 0.23))
    ink = mt.matte("tape divisions", (0.13, 0.12, 0.095), 0.84)
    bm = bmesh.new()
    length, width = 0.31, 0.014
    count = 124
    def position(t, side):
        a = t * 2 * math.pi
        centre = Vector((-0.108 + length * t, -0.102 + 0.021 * math.sin(a), pp.TOP + 0.00060))
        normal = Vector((-0.021 * 2 * math.pi * math.cos(a), length, 0)).normalized()
        return centre + normal * side
    last = None
    for i in range(count + 1):
        row = [bm.verts.new(position(i / count, side)) for side in (-width / 2, width / 2)]
        if last:
            bm.faces.new((last[0], row[0], row[1], last[1]))
        last = row
    for i in range(1, 62):
        t = i / 62
        height = 0.0050 if i % 2 == 0 else 0.0028
        pts = [(t - 0.0007, -width / 2), (t + 0.0007, -width / 2),
               (t + 0.0007, height - width / 2), (t - 0.0007, height - width / 2)]
        face = bm.faces.new([bm.verts.new(position(k, d) + Vector((0, 0, 0.000025))) for k, d in pts])
        face.material_index = 1
    me = bpy.data.meshes.new("cloth tape")
    bm.to_mesh(me)
    bm.free()
    ob = pp.link(bpy.data.objects.new("cloth tape", me))
    ob.data.materials.append(fabric)
    ob.data.materials.append(ink)
    return ob
