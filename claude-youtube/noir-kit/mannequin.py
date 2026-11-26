"""Faceless, realistic-proportioned mannequins for the investigative-noir documentaries.

One character system for every documentary on the channel: the same body, the same matte
featureless head, the same way of dressing. Films are told apart by light, composition,
graphics and sound, never by changing the people.

A figure is built in code from tapered capsules and ellipsoids, one object per material
layer (skin, top, bottom, shoes, hat), each fused with a voxel remesh and softened with a
Laplacian smooth, so joints read as one surface. Pose is a dict of angles (radians); the
skeleton is solved here (simple forward kinematics), so the same pose dict always gives the
same figure.

    import mannequin as mq
    dawn = mq.build("Dawn", mq.WOMAN, mq.Outfit(top=(0.32, 0.27, 0.22), bottom=(0.08, 0.08, 0.09), coat=True),
                    pose={"head_pitch": 0.25, "l_flex": 0.15, "r_flex": 0.1}, location=(0, 1.2, 0), facing=0)
"""
import math
from dataclasses import dataclass, field

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
import bmesh
from mathutils import Matrix, Vector

# Body measurements in metres for a standing adult; lengths scale with height.
WOMAN = dict(height=1.68, shoulder=0.165, hip=0.095, pelvis_r=(0.16, 0.105), waist_r=(0.115, 0.08),
             chest_r=(0.135, 0.095), upper_arm=0.29, forearm=0.245, hand=0.17, arm_r=(0.036, 0.029, 0.022),
             thigh=0.42, shin=0.40, leg_r=(0.082, 0.05, 0.034), neck_r=0.048, head=(0.075, 0.093, 0.112))
MAN = dict(height=1.80, shoulder=0.19, hip=0.09, pelvis_r=(0.15, 0.10), waist_r=(0.135, 0.095),
           chest_r=(0.165, 0.11), upper_arm=0.315, forearm=0.265, hand=0.185, arm_r=(0.043, 0.035, 0.026),
           thigh=0.45, shin=0.43, leg_r=(0.085, 0.052, 0.036), neck_r=0.058, head=(0.079, 0.097, 0.116))


@dataclass
class Outfit:
    top: tuple = (0.55, 0.55, 0.57)       # shirt, blouse or jacket colour (linear RGB)
    bottom: tuple = (0.06, 0.06, 0.07)    # trousers
    shoes: tuple = (0.03, 0.03, 0.03)
    skin: tuple = (0.62, 0.62, 0.63)      # the matte mannequin surface
    coat: bool = False                    # a coat that falls to the knee
    cap: bool = False                     # an officer's peaked cap
    cap_colour: tuple = (0.04, 0.05, 0.07)
    roughness: dict = field(default_factory=lambda: {"skin": 0.55, "top": 0.8, "bottom": 0.85, "shoes": 0.4, "hat": 0.6})


def _mat(name, rgb, rough, sheen=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = sheen
    if "Subsurface Weight" in b.inputs and name.endswith("skin"):
        b.inputs["Subsurface Weight"].default_value = 0.04
    return m


class _Parts:
    """One bmesh per material layer; primitives are added in figure space."""

    def __init__(self):
        self.bm = {}

    def _get(self, layer):
        if layer not in self.bm:
            self.bm[layer] = bmesh.new()
        return self.bm[layer]

    def capsule(self, layer, a, b, ra, rb, segs=20):
        a, b = Vector(a), Vector(b)
        d = b - a
        if d.length < 1e-4:
            return self.ellipsoid(layer, a, (ra, ra, ra))
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        m = Matrix.Translation((a + b) / 2) @ rot
        bm = self._get(layer)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=ra, radius2=rb, depth=d.length, matrix=m)
        for c, r in ((a, ra), (b, rb)):
            bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r, matrix=Matrix.Translation(c))

    def ellipsoid(self, layer, c, r, rot=None, segs=24):
        m = Matrix.Translation(Vector(c))
        if rot is not None:
            rm = rot.to_matrix() if hasattr(rot, "to_matrix") else rot  # a Quaternion or a 3x3 Matrix
            m = m @ rm.to_4x4()
        m = m @ Matrix.Diagonal((*r, 1))
        bmesh.ops.create_uvsphere(self._get(layer), u_segments=segs, v_segments=segs // 2, radius=1.0, matrix=m)

    def loft(self, layer, rings, segs=36):
        """A closed tube through elliptical rings [(centre, half_width, half_depth, rot3x3)], capped at both ends."""
        bm = self._get(layer)
        loops = []
        for c, rx, ry, rot in rings:
            loops.append([bm.verts.new(Vector(c) + rot @ Vector((rx * math.cos(2 * math.pi * i / segs),
                                                                  ry * math.sin(2 * math.pi * i / segs), 0)))
                          for i in range(segs)])
        for a, b in zip(loops, loops[1:]):
            for i in range(segs):
                bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
        bm.faces.new(list(reversed(loops[0])))
        bm.faces.new(loops[-1])

    def cone(self, layer, a, b, ra, rb, scale_y=1.0, segs=32, caps=True):
        a, b = Vector(a), Vector(b)
        d = b - a
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        m = Matrix.Translation((a + b) / 2) @ rot @ Matrix.Diagonal((1, scale_y, 1, 1))
        bmesh.ops.create_cone(self._get(layer), cap_ends=caps, segments=segs, radius1=ra, radius2=rb, depth=d.length, matrix=m)


def _dir(flex, abd, side):
    """Limb direction from hanging straight down: flex swings it forward (-Y), abd out to its side."""
    return (Matrix.Rotation(-flex, 3, "X") @ Matrix.Rotation(-side * abd, 3, "Y")) @ Vector((0, 0, -1))


def skeleton(body, pose):
    """Joint positions in figure space (feet on z=0, facing -Y)."""
    p = {k: 0.0 for k in ("spine", "spine_twist", "head_pitch", "head_turn", "head_tilt", "l_flex", "l_abd", "l_elbow",
                          "r_flex", "r_abd", "r_elbow", "l_hip", "r_hip", "l_knee", "r_knee", "l_hip_abd", "r_hip_abd")}
    p.update(pose or {})
    s = body["height"] / 1.68
    J = {}
    # legs first: stand on the ground, pelvis height follows from the leg angles
    for side, k in ((1, "l"), (-1, "r")):
        hip = Vector((side * body["hip"], 0, 0))
        knee = hip + _dir(p[f"{k}_hip"], p[f"{k}_hip_abd"] + 0.03, side) * body["thigh"]
        ankle = knee + _dir(p[f"{k}_hip"] - p[f"{k}_knee"], p[f"{k}_hip_abd"] + 0.01, side) * body["shin"]
        J[f"{k}_hip"], J[f"{k}_knee"], J[f"{k}_ankle"] = hip, knee, ankle
    lift = -min(J["l_ankle"].z, J["r_ankle"].z) + 0.075 * s
    for k in list(J):
        J[k] = J[k] + Vector((0, 0, lift))
    pelvis = Vector((0, 0, lift + 0.03 * s))
    spine = Matrix.Rotation(-p["spine"], 3, "X") @ Matrix.Rotation(p["spine_twist"], 3, "Z")
    J["pelvis"] = pelvis
    J["waist"] = pelvis + spine @ Vector((0, 0.005, 0.15 * s))
    J["chest"] = pelvis + spine @ Vector((0, 0.0, 0.33 * s))
    J["neck"] = pelvis + spine @ Vector((0, 0.01, 0.50 * s))
    head = spine @ Matrix.Rotation(p["head_turn"], 3, "Z") @ Matrix.Rotation(-p["head_pitch"], 3, "X") @ Matrix.Rotation(p["head_tilt"], 3, "Y")
    J["head_rot"] = head
    J["head"] = J["neck"] + head @ Vector((0, -0.01, 0.135 * s))
    for side, k in ((1, "l"), (-1, "r")):
        sh = pelvis + spine @ Vector((side * body["shoulder"] * 0.93, 0.01, 0.425 * s))
        el = sh + spine @ _dir(p[f"{k}_flex"], p[f"{k}_abd"] + 0.06, side) * body["upper_arm"]
        wr = el + spine @ _dir(p[f"{k}_flex"] + p[f"{k}_elbow"], p[f"{k}_abd"] + 0.04, side) * body["forearm"]
        tip = wr + spine @ _dir(p[f"{k}_flex"] + p[f"{k}_elbow"] * 1.1, p[f"{k}_abd"] + 0.02, side) * body["hand"]
        J[f"{k}_shoulder"], J[f"{k}_elbow"], J[f"{k}_wrist"], J[f"{k}_hand"] = sh, el, wr, tip
    J["spine_rot"] = spine
    return J


def build(name, body, outfit=None, pose=None, location=(0, 0, 0), facing=0.0, voxel=0.007, collection=None):
    """Build a dressed, posed figure. Returns the parent empty; each layer is a child mesh."""
    o = outfit or Outfit()
    J = skeleton(body, pose)
    s = body["height"] / 1.68
    P = _Parts()
    ar, er, wr = body["arm_r"]
    tr, kr, an = body["leg_r"]
    cloth = 0.012 * s  # clothing stands this far off the body

    # skin: head, neck, hands (and the face's small hints of brow and jaw, no features)
    hr = J["head_rot"]
    hx, hy, hz = body["head"]
    P.ellipsoid("skin", J["head"], (hx, hy, hz), rot=hr)
    P.ellipsoid("skin", J["head"] + hr @ Vector((0, -0.035 * s, -0.06 * s)), (hx * 0.8, hy * 0.72, hz * 0.55), rot=hr)
    P.ellipsoid("skin", J["head"] + hr @ Vector((0, -0.07 * s, 0.0)), (hx * 0.18, 0.02 * s, 0.035 * s), rot=hr)
    P.capsule("skin", J["neck"] + Vector((0, 0, -0.04 * s)), J["head"] + hr @ Vector((0, 0.01, -0.07 * s)), body["neck_r"], body["neck_r"] * 0.95)
    for k in ("l", "r"):
        wrist, tip = J[f"{k}_wrist"], J[f"{k}_hand"]
        mid = wrist.lerp(tip, 0.45)
        rot = Vector((0, 0, -1)).rotation_difference((tip - wrist).normalized())
        P.ellipsoid("skin", mid, (wr * 1.6, wr * 0.7, body["hand"] * 0.55), rot=rot)
        P.capsule("skin", wrist, mid, wr * 0.9, wr * 0.75)

    # torso as elliptical rings along the spine: hip, pelvis, waist, chest, shoulders, neck base
    sp = J["spine_rot"]
    pr, wr_, cr = body["pelvis_r"], body["waist_r"], body["chest_r"]
    sh_z = (J["l_shoulder"] - J["pelvis"]).dot(sp @ Vector((0, 0, 1))) + 0.03 * s  # top of the shoulder line

    def ring(z, rx, ry, dy=0.0, pad=0.0):
        return (J["pelvis"] + sp @ Vector((0, dy, z)), rx + pad, ry + pad, sp)

    def torso(pad, z0, top_pad=None):
        tp = pad if top_pad is None else top_pad
        return [ring(z0, pr[0] * 0.92, pr[1] * 0.9, 0.0, pad), ring(0.03 * s, pr[0], pr[1], 0.0, pad),
                ring(0.15 * s, wr_[0], wr_[1], 0.0, pad), ring(0.27 * s, cr[0] * 0.98, cr[1], -0.005, pad),
                ring(sh_z - 0.045 * s, body["shoulder"] * 0.98, cr[1] * 0.82, 0.0, tp),
                ring(sh_z + 0.015 * s, body["shoulder"] * 0.55, cr[1] * 0.55, 0.01, tp),
                ring(sh_z + 0.05 * s, body["neck_r"] * 1.25, body["neck_r"] * 1.1, 0.012, tp * 0.5)]

    P.loft("top", torso(cloth, -0.02 * s))
    for k in ("l", "r"):
        P.capsule("top", J[f"{k}_shoulder"], J[f"{k}_elbow"], ar + cloth * 0.5, er + cloth * 0.5)
        P.capsule("top", J[f"{k}_elbow"], J[f"{k}_wrist"], er + cloth * 0.5, wr + cloth)
    if o.coat:  # a coat over the top: chest to just below the knee, flaring a little at the hem
        knee_z = ((J["l_knee"].z + J["r_knee"].z) / 2 - 0.10 * s) - J["pelvis"].z
        c2 = cloth * 2.2
        P.loft("top", [(J["pelvis"] + Vector((0, 0.01, knee_z)), pr[0] * 1.32 + c2, pr[1] * 1.35 + c2, Matrix.Identity(3)),
                       ring(-0.05 * s, pr[0] * 1.05, pr[1] * 1.08, 0.0, c2), ring(0.03 * s, pr[0], pr[1], 0.0, c2),
                       ring(0.15 * s, wr_[0] * 1.05, wr_[1] * 1.05, 0.0, c2), ring(0.27 * s, cr[0] * 0.98, cr[1], -0.005, c2),
                       ring(sh_z - 0.045 * s, body["shoulder"] * 0.98, cr[1] * 0.82, 0.0, c2)])

    # bottom: pelvis and legs (the trouser waist sits under the top's hem)
    P.loft("bottom", [ring(-0.09 * s, pr[0] * 0.8, pr[1] * 0.8, 0.0, cloth * 0.5), ring(-0.02 * s, pr[0] * 0.98, pr[1] * 0.95, 0.0, cloth * 0.5),
                      ring(0.06 * s, pr[0] * 0.95, pr[1] * 0.92, 0.0, cloth * 0.4), ring(0.11 * s, wr_[0], wr_[1], 0.0, cloth * 0.3)])
    for k in ("l", "r"):
        P.capsule("bottom", J[f"{k}_hip"] + Vector((0, 0, 0.02)), J[f"{k}_knee"], tr + cloth * 0.5, kr + cloth * 0.5)
        P.capsule("bottom", J[f"{k}_knee"], J[f"{k}_ankle"] + Vector((0, 0, 0.03 * s)), kr + cloth * 0.5, an + cloth)

    # shoes
    for k in ("l", "r"):
        a = J[f"{k}_ankle"]
        P.ellipsoid("shoes", Vector((a.x, a.y - 0.06 * s, 0.035 * s)), (0.045 * s, 0.13 * s, 0.038 * s))
        P.capsule("shoes", a + Vector((0, 0.01, -0.02)), Vector((a.x, a.y + 0.01, 0.03 * s)), an + 0.008, 0.04 * s)

    if o.cap:
        top_head = J["head"] + hr @ Vector((0, 0, hz * 0.55))
        P.cone("hat", top_head, top_head + hr @ Vector((0, 0, 0.07 * s)), hx * 1.15, hx * 1.35, scale_y=1.15)
        P.cone("hat", top_head + hr @ Vector((0, -0.03, -0.005)), top_head + hr @ Vector((0, -0.03, 0.005)), hx * 1.2, hx * 1.25,
               scale_y=1.5, caps=True)

    root = bpy.data.objects.new(name, None)
    coll = collection or bpy.context.scene.collection
    coll.objects.link(root)
    colours = {"skin": o.skin, "top": o.top, "bottom": o.bottom, "shoes": o.shoes, "hat": o.cap_colour}
    for layer, bm in P.bm.items():
        me = bpy.data.meshes.new(f"{name}_{layer}")
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(f"{name}_{layer}", me)
        coll.objects.link(ob)
        ob.parent = root
        ob.data.materials.append(_mat(f"{name}_{layer}" if layer != "skin" else "mannequin_skin", colours[layer],
                                      o.roughness.get(layer, 0.7), sheen=0.08 if layer in ("top", "bottom") else 0))
        rm = ob.modifiers.new("fuse", "REMESH")
        rm.mode, rm.voxel_size, rm.use_smooth_shade = "VOXEL", voxel, True
        sm = ob.modifiers.new("soften", "LAPLACIANSMOOTH")
        sm.lambda_factor, sm.iterations, sm.use_volume_preserve = 1.2, 6, True
    root.location = location
    root.rotation_euler = (0, 0, facing)
    return root
