"""Stage: the night train (Ch 03 'The vacation that made it believable': after Hong Kong, about nine more days
travelling around China, the trip getting longer). Fluorescent Noir, on the move.

A long-distance carriage at night, built in Python (train_set.py): 2 + 2 upholstered seats in rows down a central
aisle walked smooth, luggage racks of round aluminium bars over the window seats, deep window reveals with rounded
corners, a cove into a flat ceiling with two lines of strip lights. The carriage is on its night setting: only the
fittings over Dawn's bay burn full, a few further down at a low level, one tube failing (dim and uneven), the rest off;
a reading lamp burns over her seat (the lit island). The windows are black: the country goes by as soft streaks of
light (sodium, cool white), no shape, no sign. Her charcoal suitcase (standing on its side, pocket to the aisle) and
the black duffel lie on the rack above her. Dawn (people.dawn()) sits at the window, her head turned to the glass,
her hands together in her lap; her face shows faintly in the black glass. A few stone travellers further down: an
older man dozing over his hands, a young man asleep with his head back, a man in a dark suit looking down the aisle,
an attendant walking away toward the vestibule door at the far end. Quiet, onward.

    <bpy python> -I scenes/shoot.py -- train <cam> out.png [--nocast]

Seated figures go through Rigify as at the departure gate (legs to FK; thigh and shin solved so the seat rests on
the cushion and the soles on the floor; the hands' forearms swung until the clasped hands rest on the thighs), then
slide back until the seat meets the backrest. Dawn's head is aimed by a small solve at a point outside her window.
The cameras that depend on her pose (seat) are set from her eyes once she is posed. Printed as TRAIN ...
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import train_set as st  # noqa: E402

EXPOSURE = -1.4

DAWN_ROW, DAWN_SIDE = 4, "L"
SEAT_X, SEAT_Y = st.seat_world(DAWN_SIDE, DAWN_ROW, "window")
GLASS_X = -(st.XW + st.REVEAL)                  # the inner face of her window's glass
LOOK = Vector((GLASS_X - 0.06, SEAT_Y - 2.8, 1.16))  # a passing light through the next bay, ahead of her
CUSHION_SINK = 0.012                            # how far a sitter settles into the cushion

# strip light levels per (bay, side): bay 2 is over Dawn; travellers sit under bays 3-6
LEVELS = {
    (2, "L"): 1.0, (2, "R"): 0.35,
    (4, "L"): ("flicker", 0.12), (5, "R"): 0.08,
    (7, "L"): 0.18, (7, "R"): 0.18,
}
STRIP_ENERGY = 90.0
READING_LAMP = 160.0
FACE_FILL = 3.0                                 # seat camera only: the lamp's light off the ledge and her lap

# the travellers: (name, kind, side, row, seat, upper pose)
TRAVELLERS = [
    ("Dozer", "old", "R", 7, "aisle", {"head": (30, 8), "neck": (6, 0), "chest": (-4, 0), "fingers": 30}),
    ("Sleeper", "young", "L", 9, "window", {"head": (-14, -18), "neck": (-2, 0), "chest": (-12, -4), "fingers": 24}),
    ("Suit", "suit", "R", 11, "window", {"head": (12, -24), "neck": (2, -6), "chest": (-9, -4), "fingers": 28}),
]
ATTENDANT = (0.06, 15.9)          # standing in the aisle, walking away toward the far door

# cameras: defaults (the seat camera is reset from Dawn's eyes in build)
CAMERAS = {
    # Ch 03: one-point down the carriage from the near end at a standing eye line: the rows, the racks, the strip
    # lights converging on the vestibule door; Dawn's head at the window a third of the way along, under the one
    # burning bay and her reading lamp, the bags on the rack above her
    "aisle": dict(loc=(0.25, st.Y0 + 1.12, 1.6), aim=(0.0, st.Y1, 2.08), lens=38, focus="fx_dawn", fstop=5.6, beat="ch03",
                  exposure=-1.05),
    # Ch 03: from over the seat back in front of her: her head turned to the window in near profile, her face
    # frontal and faint in the black glass, the lights streaking past behind it
    "seat": dict(loc=(-0.35, SEAT_Y - 0.5, 1.32), aim=(-1.38, SEAT_Y + 0.05, 1.18), lens=35, focus="fx_seat", fstop=4.0,
                 beat="ch03"),
    # Ch 03: a controlled close-up on the duffel and the suitcase on the rack above her, the carriage soft beyond
    # the near-aisle angle separates both silhouettes and leaves the lamp visible below their rail
    "rack": dict(loc=(0.15, SEAT_Y - 1.05, 2.08), aim=(-1.428, SEAT_Y + 0.19, st.RACK_Z + 0.015), lens=40, focus="fx_bags", fstop=2.8,
                 beat="ch03", exposure=-1.2),
}
HERO_STREAKS = [   # (offset from the reflection's point on the glass (x, y, z), distance beyond the glass, length, height, rgb, k)
    ((0.0, -0.06, 0.17), 12.0, 9.0, 0.07, (1.0, 0.56, 0.24), 2.6),
    ((0.0, -0.08, -0.25), 6.0, 3.2, 0.04, (0.78, 0.86, 1.0), 1.8),
    ((0.0, -0.4, 0.06), 34.0, 8.0, 0.16, (1.0, 0.78, 0.55), 1.6),
]
SEAT_CAM_OFFSET = (0.68, -0.30, 0.06)      # the seat camera from her eyes: toward the aisle, in front, a little above
if os.environ.get("TRAIN_CAMS"):        # a re-render of some cameras with `--cam all` (one build)
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["TRAIN_CAMS"].split(",")}
TRIMS = {
    "aisle": {"face_fill": 0.0, "bun_rim": 0.0, "bag_edge": 0.0},
    "seat": {"night_light": 0.0, "bag_edge": 0.0},
    "rack": {"face_fill": 0.0, "bun_rim": 0.0},
}
GLASS_REFL = {"aisle": 0.06, "seat": 0.07, "rack": 0.06}
LIFT = {"aisle": 0.003, "seat": 0.002, "rack": 0.0025}

_STATE = {"cast": [], "base": {}, "dawn": None}


# ---------------------------------------------------------------- measuring (from departure_gate / hearing_room)
def body_points(holder, only=None, unmasked=False):
    objs = [only] if only is not None else [o for o in [holder] + list(holder.children_recursive) if o.type == "MESH"]
    masks = [md for o in objs for md in o.modifiers if md.type == "MASK"] if unmasked else []
    for md in masks:
        md.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        pts.extend(mw @ v.co for v in me.vertices)
        ev.to_mesh_clear()
    for md in masks:
        md.show_viewport = True
    bpy.context.view_layer.update()
    return pts


def hip_world(holder):
    rig = rigged.rig_of(holder)
    bpy.context.view_layer.update()
    return sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2


# ---------------------------------------------------------------- seating
def sit_legs(holder, thigh, shin, knee_half, ankle_half):
    """Legs to FK, thighs swung forward `thigh` degrees and turned about Z so the knee centres sit knee_half either
    side of the middle; shins `shin` degrees forward, ankles ankle_half out; feet flat, toes ahead."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    mw = rig.matrix_world
    rest = {}
    for k in "LR":
        f = (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0)))
        f.x = 0.0
        rest[k] = f.normalized()
    mid = sum((mw @ pb[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    for side, k in ((1, "L"), (-1, "R")):
        head, tail = mw @ pb[f"thigh_fk.{k}"].head, mw @ pb[f"thigh_fk.{k}"].tail
        lt = (tail - head).length
        reach = lt * math.sin(math.radians(thigh))
        yaw = math.asin(max(-0.5, min(0.5, (abs(head.x - mid.x) - knee_half) / reach)))
        d = Matrix.Rotation(-side * yaw, 3, "Z") @ Matrix.Rotation(-math.radians(thigh), 3, "X") @ Vector((0, 0, -1))
        rigged._aim(rig, f"thigh_fk.{k}", d)
        sh, stl = mw @ pb[f"shin_fk.{k}"].head, mw @ pb[f"shin_fk.{k}"].tail
        ls = (stl - sh).length
        out = math.degrees(math.asin(max(-0.3, min(0.3, (ankle_half - abs(sh.x - mid.x)) / ls))))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, shin, side, out))
        rigged._aim(rig, f"foot_fk.{k}", rest[k])


def lap_hands(holder, upper=(12, -6), fore=(64, 30), hand=(72, 40)):
    rig = rigged.rig_of(holder)
    for side, k in ((1, "L"), (-1, "R")):
        for bone, (f, i) in (("upper_arm_fk", upper), ("forearm_fk", fore), ("hand_fk", hand)):
            rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


class Sitter:
    """A seated figure's pose: upper body, legs and the forearm angle that rests the hands in the lap."""

    def __init__(self, holder, upper, knee_half, ankle_half, tag):
        self.h, self.upper, self.kh, self.ah, self.tag = holder, dict(upper), knee_half, ankle_half, tag
        self.thigh, self.shin, self.fore = 84.0, 6.0, 64.0

    def pose(self):
        rigged.pose_figure(self.h, self.upper)
        lap_hands(self.h, fore=(self.fore, 30), hand=(self.fore + 8, 40))
        sit_legs(self.h, self.thigh, self.shin, self.kh, self.ah)

    def solve_legs(self, seat_z):
        """Thigh and shin so the seat rests on the cushion at seat_z and the soles on the floor; lifts the holder."""
        rig = rigged.rig_of(self.h)
        body = bpy.data.objects[self.h["body"]]
        z0 = self.h.location.z
        dz = 0.0
        for it in range(9):
            self.h.location.z = z0
            self.pose()
            hip = hip_world(self.h)
            skin = body_points(self.h, only=body, unmasked=True)
            seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2 and p.z < hip.z]
            # (built facing -Y: the thighs run toward -Y, the buttocks lie behind the hip, toward +Y)
            sole_pts = [p for p in body_points(self.h) if p.y < hip.y - 0.3]
            butt = min(p.z for p in seat_pts)
            sole = min(p.z for p in sole_pts)
            dz = seat_z - CUSHION_SINK - butt
            gap = sole + dz
            print(f"TRAIN {self.tag} seated it {it}: thigh {self.thigh:.1f} shin {self.shin:.1f} soles {gap * 1000:+.1f} mm",
                  flush=True)
            if abs(gap) < 0.005:
                break
            if gap > 0:
                c = math.cos(math.radians(self.shin)) + gap / 0.42
                if c < 1.0:
                    self.shin = math.degrees(math.acos(c))
                else:
                    self.shin = 0.0
                    self.thigh -= math.degrees((c - 1.0) * 0.42 / 0.43)
            else:
                c = math.cos(math.radians(self.shin)) + gap / 0.42
                if c > math.cos(math.radians(30)):
                    self.shin = math.degrees(math.acos(c))
                else:
                    self.thigh += math.degrees(-gap / 0.43)
        self.h.location.z = z0 + dz
        bpy.context.view_layer.update()
        self.settle_hands()

    def settle_hands(self):
        rig = rigged.rig_of(self.h)
        pb = rig.pose.bones
        for it in range(6):
            self.pose()
            mw = rig.matrix_world
            hc = sum((mw @ ((pb[f"hand_fk.{k}"].head + pb[f"hand_fk.{k}"].tail) / 2) for k in "LR"), Vector()) / 2
            tops = []
            for k in "LR":
                a_, b_ = mw @ pb[f"thigh_fk.{k}"].head, mw @ pb[f"thigh_fk.{k}"].tail
                t = max(0.0, min(1.0, (hc.y - a_.y) / (b_.y - a_.y))) if abs(b_.y - a_.y) > 1e-6 else 0.5
                tops.append(a_.z + (b_.z - a_.z) * t + 0.085)
            gap = (hc.z - 0.022) - max(tops)
            if abs(gap) < 0.006:
                break
            self.fore = max(35.0, min(95.0, self.fore + math.degrees(-gap / 0.26)))
        self.pose()
        print(f"TRAIN {self.tag} hands: forearm {self.fore:.1f}, gap {gap * 1000:+.1f} mm", flush=True)

    def place(self, sx, sy, seat_z, hip_y=0.02):
        """Hip over the seat, then slide back until the seat meets the backrest (cloth just touching)."""
        hip = hip_world(self.h)
        self.h.location.x += sx - hip.x
        self.h.location.y += (sy + hip_y) - hip.y
        bpy.context.view_layer.update()
        body = bpy.data.objects[self.h["body"]]
        skin = body_points(self.h, only=body, unmasked=True)
        low = [p for p in skin if seat_z + 0.03 < p.z < seat_z + 0.26 and abs(p.x - sx) < 0.19 and p.y > sy - 0.1]
        gap = min((sy + st.back_y(p.z)) - p.y for p in low)
        self.h.location.y += gap - 0.01
        bpy.context.view_layer.update()
        return gap

    def back_gap(self, sx, sy, seat_z):
        """Distance from the upper back (shoulder blades) to the backrest (negative: into it)."""
        body = bpy.data.objects[self.h["body"]]
        skin = body_points(self.h, only=body, unmasked=True)
        up = [p for p in skin if seat_z + 0.36 < p.z < seat_z + 0.56 and abs(p.x - sx) < 0.17]
        return min((sy + st.back_y(p.z)) - p.y for p in up) if up else 9.9

    def lean_to_back(self, sx, sy, seat_z):
        """Lean the chest back (or forward) until the shoulder blades rest on the upper pad."""
        for it in range(4):
            g = self.back_gap(sx, sy, seat_z)
            if abs(g) < 0.012:
                break
            dn, tn = self.upper.get("chest", (0, 0))
            dn = max(-15.0, min(10.0, dn - math.degrees(math.atan2(g, 0.38))))   # past -15 the chest bends back at mid-spine
            self.upper["chest"] = (round(dn, 1), tn)
            self.pose()
        print(f"TRAIN {self.tag} upper back to backrest {self.back_gap(sx, sy, seat_z) * 1000:+.0f} mm, chest {self.upper.get('chest')}",
              flush=True)


def seat_z_at(sy, hip_y=0.02):
    return st.cushion_top(hip_y + 0.08)          # the cushion under the buttocks, a little behind the hip joint


# ---------------------------------------------------------------- Dawn (wardrobe finish from chicago_night)
def cloth(holder, item, rough=0.9, bump=0.25):
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        return None
    for slot in ob.material_slots:
        m = slot.material
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        for sock in ("Roughness", "Normal"):
            for ln in list(b.inputs[sock].links):
                nt.links.remove(ln)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.05
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 400.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def plain_shoes(holder, item="shoes04"):
    """Drop the shoe's normal map (its embossed toe stamp read as a brand at the departure gate)."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        return
    for slot in ob.material_slots:
        m = slot.material
        if m and m.use_nodes:
            b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is not None:
                for ln in list(b.inputs["Normal"].links):
                    m.node_tree.links.remove(ln)


def hands_stone(holder, value=0.36):
    body = bpy.data.objects[holder["body"]]
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))}
    if not gi:
        return 0
    me = body.data
    attr = me.color_attributes.new("handmask", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        w = min(1.0, sum(g.weight for g in v.groups if g.group in gi))
        attr.data[v.index].color = (w, w, w, 1.0)
    m = me.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "handmask"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return 1


def dawn():
    h = people.dawn()
    n = castkit.blouse_v(h, rgb=(0.2, 0.19, 0.18), depth=0.42, width=0.14)
    bl = bpy.data.materials.get(f"blouse_{h.name}")
    if bl is not None:
        bb = bl.node_tree.nodes["Principled BSDF"]
        bb.inputs["Specular IOR Level"].default_value = 0.05
        bb.inputs["Roughness"].default_value = 0.92
    cloth(h, "female_elegantsuit01")
    plain_shoes(h)
    hands_stone(h)
    print(f"TRAIN Dawn: shared hair and bun, blouse {n} vertices", flush=True)
    return h


def eye_centre(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix
    p = m.translation + m.to_3x3().col[1].normalized() * 0.075 + m.to_3x3().col[2].normalized() * 0.075
    return rig.matrix_world @ p


def head_forward(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix.to_3x3()
    return (rig.matrix_world.to_3x3() @ m.col[2]).normalized()


def aim_head(sitter, target, base_turn=(-10.0, -14.0), limit=55.0):
    """Turn chest and neck a little toward the target, then solve the head's (down, turn) to look at it."""
    h = sitter.h
    up = sitter.upper
    up["chest"] = (up.get("chest", (0, 0))[0], base_turn[0])
    up["neck"] = (up.get("neck", (0, 0))[0], base_turn[1])
    d, t = up.get("head", (0, 0))
    tgt = Vector(target)
    for _ in range(5):
        up["head"] = (d, t)
        sitter.pose()
        e, fw = eye_centre(h), head_forward(h)
        g = (tgt - e).normalized()
        dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(fw.y, fw.x))
        dy = (dy + 180) % 360 - 180
        dp = math.degrees(math.asin(max(-1, min(1, fw.z))) - math.asin(max(-1, min(1, g.z))))
        t = max(-limit, min(limit, t + dy))
        d = max(-15.0, min(35.0, d + dp))
    up["head"] = (round(d, 1), round(t, 1))
    sitter.pose()
    fw = head_forward(h)
    print(f"TRAIN {sitter.tag} look: head {up['head']}, neck {up['neck']}, chest {up['chest']}, forward "
          f"{tuple(round(v, 2) for v in fw)}", flush=True)


def place_dawn():
    h = dawn()
    upper = {"head": (6, 0), "neck": (2, 0), "chest": (-11, 0), "fingers": 40}
    s = Sitter(h, upper, 0.088, 0.062, "Dawn")
    seat_z = seat_z_at(SEAT_Y)
    s.solve_legs(seat_z)
    g = s.place(SEAT_X, SEAT_Y, seat_z)
    s.lean_to_back(SEAT_X, SEAT_Y, seat_z)
    aim_head(s, LOOK)
    s.settle_hands()
    pts = body_points(h)
    hip = hip_world(h)
    print(f"TRAIN Dawn seated: hip ({hip.x:.3f}, {hip.y:.3f}, {hip.z:.3f}), slid back {g * 1000:+.0f} mm, lowest "
          f"{min(p.z for p in pts) * 1000:+.1f} mm, eyes {tuple(round(v, 3) for v in eye_centre(h))}", flush=True)
    return h


# ---------------------------------------------------------------- travellers
def traveller(name, kind, side, row, which, upper):
    if kind == "old":
        h = people.man(name, height_cm=171, age=0.76, weight=0.68, suit="male_casualsuit01", tone=(0.1, 0.096, 0.09),
                       shoes="shoes04")
        kh, ah = 0.11, 0.1
    elif kind == "young":
        h = people.man(name, height_cm=184, age=0.3, weight=0.44, suit="male_casualsuit03", tone=(0.07, 0.076, 0.088),
                       shoes="shoes04")
        kh, ah = 0.11, 0.1
    else:
        h = people.man(name, height_cm=177, age=0.62, weight=0.6, suit="male_elegantsuit01", tone=(0.075, 0.075, 0.085),
                       shoes="shoes04")
        kh, ah = 0.1, 0.09
    plain_shoes(h)
    sx, sy = st.seat_world(side, row, which)
    s = Sitter(h, upper, kh, ah, name)
    seat_z = seat_z_at(sy)
    s.solve_legs(seat_z)
    s.place(sx, sy, seat_z)
    s.lean_to_back(sx, sy, seat_z)
    s.settle_hands()
    print(f"TRAIN {name} ({kind}) at {side}{row} {which}: hip {tuple(round(v, 3) for v in hip_world(h))}", flush=True)
    return h


def ground(holder):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH" or not (o.name == holder["body"] or "shoes" in o.name):
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z -= lo
    bpy.context.view_layer.update()
    return lo


def attendant():
    """The carriage attendant (people.staff, the woman: a plain dark suit) walking away down the aisle toward the
    vestibule door: mid-stride, arms swinging a little, head level."""
    h = people.staff("Attendant", 1)
    plain_shoes(h)
    rigged.pose_figure(h, {"head": (3, 0), "neck": (1, 0), "chest": (2, 0), "l_arm": (-12, 7, 10), "r_arm": (16, 7, 18),
                           "fingers": 22})
    rig = rigged.rig_of(h)
    pb = rig.pose.bones
    k = 1.0 / (rig.scale[0] * h["ks"])
    for side, fwd in (("L", 0.13), ("R", -0.11)):   # built facing -Y: forward is -Y
        n = f"foot_ik.{side}"
        if n in pb:
            m = pb[n].matrix.copy()
            pb[n].matrix = Matrix.Translation((0.0, -fwd * k, 0.0)) @ m
    if "torso" in pb:
        m = pb["torso"].matrix.copy()
        pb["torso"].matrix = Matrix.Translation((0.0, -0.01 * k, -0.012 * k)) @ m
    bpy.context.view_layer.update()
    h.location = (ATTENDANT[0], ATTENDANT[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(180.0))     # walking toward +Y, away from the near end
    bpy.context.view_layer.update()
    lo = ground(h)
    print(f"TRAIN Attendant walking at {ATTENDANT}, grounded by {lo * 1000:+.0f} mm", flush=True)
    return h


# ---------------------------------------------------------------- props
def bags():
    """On the rack above her seat: the duffel lying along the rack nearer the aisle camera, the suitcase standing on
    its side beyond it, its front pocket to the aisle, its carry handle toward the wall."""
    bed = st.RACK_Z + st.BAR_R
    wall = -st.XW
    duf = props.load("extra-bag-closed", size=0.75, axis="long", loc=(wall + 0.012 + 0.21, SEAT_Y - 0.15, bed), turn_deg=91.5,
                     sat=0.5, val=0.35, rough_add=0.3)
    case = props.load("dawn-suitcase", size=0.66, axis="z", sat=0.6)
    # stand it on its side: its height along the rack (-Y), its width up; pocket still to +X (the aisle)
    case.rotation_euler = (math.radians(90.0), 0.0, math.radians(-3.0))
    y_end = SEAT_Y + 0.92
    case.location = (wall + 0.062 + 0.121, y_end, bed + 0.212)
    bpy.context.view_layer.update()
    _STATE["bag_meshes"] = [obj for root in (duf, case) for obj in root.children_recursive if obj.type == "MESH"]
    out = {}
    for n, h in (("duffel", duf), ("suitcase", case)):
        pts = [o.matrix_world @ v.co for o in h.children_recursive if o.type == "MESH" for v in o.data.vertices]
        lo = Vector([min(p[i] for p in pts) for i in range(3)])
        hi = Vector([max(p[i] for p in pts) for i in range(3)])
        h.location.z += bed - lo.z           # rest exactly on the bars
        bpy.context.view_layer.update()
        out[n] = (lo + Vector((0, 0, bed - lo.z)), hi + Vector((0, 0, bed - lo.z)))
        print(f"TRAIN bag {n}: x {lo.x:+.3f}..{hi.x:+.3f} y {lo.y:.3f}..{hi.y:.3f} z {bed:.3f}..{hi.z + bed - lo.z:.3f}",
              flush=True)
    # The soft nylon bridges round bars. Set the bag down on their crowns;
    # only unsupported stretches of the lowest cloth yield between them.
    rails = [o.data.splines[0].points[0].co.x for o in bpy.data.objects if o.name.startswith("rack_bar_L")]
    for mesh in (o for o in duf.children_recursive if o.type == "MESH"):
        world = mesh.matrix_world
        inv = world.inverted()
        pts = [world @ v.co for v in mesh.data.vertices]
        support = min(p.z for p in pts if min(abs(p.x - rail) for rail in rails) < st.BAR_R)
        for vert, point in zip(mesh.data.vertices, pts):
            point.z += bed - support
            distance = min(abs(point.x - rail) for rail in rails)
            between = max(0.0, min(1.0, (distance - st.BAR_R) / 0.027))
            underside = max(0.0, min(1.0, (bed + 0.055 - point.z) / 0.055))
            point.z -= 0.006 * math.sin(math.pi * between / 2) ** 2 * underside
            vert.co = inv @ point
        mesh.data.update()
    return out


# ---------------------------------------------------------------- lights
def lights():
    st.strips(LEVELS, STRIP_ENERGY)
    # the reading lamp over her seat: its lens lit, a spot on her face and lap
    lp = st.lamp_pos(DAWN_SIDE, DAWN_ROW)
    lens = bpy.data.objects.get(f"lamp_lens_{DAWN_SIDE}{DAWN_ROW}")
    if lens is not None:
        st.M["lamp_lens_on"] = st.mt.glow("reading lamp lens", st.LAMP, 40.0, falloff=0.5, axes=("X", "Y"))
        lens.data.materials.clear()
        lens.data.materials.append(st.M["lamp_lens_on"])
    st.spot("reading_lamp", tuple(lp), (SEAT_X - 0.04, SEAT_Y + 0.02, 1.15), READING_LAMP, st.LAMP, 40.0, 0.6, radius=0.02)


# ---------------------------------------------------------------- per-camera hook
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.03, 2000.0
    sc.cycles.sample_clamp_indirect = 4.0
    sc.cycles.blur_glossy = 0.4
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    sc.cycles.transparent_max_bounces = 12
    for obj in _STATE["passengers"]:
        obj.visible_glossy = name != "aisle"
    for obj in _STATE["aisle_motion"]:
        obj.hide_render = name != "aisle"
    for obj in _STATE["cove_seams"]:
        obj.hide_render = name == "rack"
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    for key in ("glass",):
        m = st.M.get(key)
        if m is not None and "refl_node" in m:
            m.node_tree.nodes[m["refl_node"]].inputs[1].default_value = GLASS_REFL.get(name, 0.06)
    lift = LIFT.get(name, 0.0) / (2.0 ** CAMERAS.get(name, {}).get("exposure", EXPOSURE))
    vs = sc.view_settings
    vs.use_curve_mapping = lift > 0
    if lift > 0:
        vs.curve_mapping.black_level = (-lift, -lift, -lift)
        vs.curve_mapping.update()
    print(f"TRAIN camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}, glass "
          f"{GLASS_REFL.get(name)}, lift {lift:.4f}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def _focus(name, p):
    e = bpy.data.objects.get(name)
    if e is None:
        e = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(e)
    e.location = p
    return e


def keep_clear(cdef, centre, rx=0.11, ry=0.2):
    """Remove the random streaks whose path crosses her reflected face in the seat frame (an ellipse of rx by ry
    frame units round where the reflection sits), so the passing lights frame it and never wipe it out."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    rx_, ry_ = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    cam = sk.camera(cdef["loc"], cdef["aim"], lens=cdef["lens"])
    bpy.context.view_layer.update()
    c = world_to_camera_view(sc, cam, centre)
    gone = []
    for o in [o for o in bpy.data.objects if o.name.startswith("streak_") and "hero" not in o.name]:
        me = o.data
        a = o.matrix_world @ ((me.vertices[0].co + me.vertices[2].co) / 2)
        b = o.matrix_world @ ((me.vertices[1].co + me.vertices[3].co) / 2)
        for k in range(41):
            v = world_to_camera_view(sc, cam, a.lerp(b, k / 40))
            if v.z > 0 and ((v.x - c.x) / rx) ** 2 + ((v.y - c.y) / ry) ** 2 < 1.0:
                gone.append(o.name)
                break
    for n in gone:
        bpy.data.objects.remove(bpy.data.objects[n])
    aim = bpy.data.objects.get("aim")
    bpy.data.objects.remove(cam)
    if aim is not None:
        bpy.data.objects.remove(aim)
    sc.render.resolution_x, sc.render.resolution_y = rx_, ry_
    sc.camera = None
    print(f"TRAIN streaks kept clear of the reflection: removed {gone}", flush=True)


def set_cameras(eyes, bag_box):
    """The seat and rack cameras from where Dawn's eyes and the bags actually are."""
    if eyes is not None:
        _focus("fx_dawn", eyes)
    if eyes is not None and "seat" in CAMERAS:
        mirror = Vector((2 * GLASS_X - eyes.x, eyes.y, eyes.z))
        cam = eyes + Vector(SEAT_CAM_OFFSET)
        t = (GLASS_X - cam.x) / (mirror.x - cam.x)
        on_glass = cam + (mirror - cam) * t
        aim = eyes.lerp(on_glass, 0.5) + Vector((0, 0, -0.02))
        aim += (aim - cam).cross(Vector((0, 0, 1))).normalized() * 0.042
        CAMERAS["seat"].update(loc=tuple(round(v, 4) for v in cam), aim=tuple(round(v, 4) for v in aim))
        _focus("fx_refl", mirror)
        _focus("fx_seat", eyes.lerp(mirror, 0.30))
        rim = eyes + Vector((0.08, 0.25, 0.19))
        st.area("bun_rim", rim, (0.05, 0.05), 2.0, st.LAMP, spread=55,
                rot=(eyes + Vector((0, 0.12, 0.06)) - rim).to_track_quat("-Z", "Y").to_euler())
        # three passing lights placed through the glass around her reflection: one above her head, one below at
        # her collar, one far and faint beyond; none across her face
        ray = lambda off, dist: cam + (on_glass + Vector(off) - cam) * ((GLASS_X - dist - cam.x) / (on_glass.x - cam.x))
        for i, (off, dist, ln, hg, rgb, k) in enumerate(HERO_STREAKS):
            p = ray(off, dist)
            st.streak_obj(f"streak_hero_{i}", p.x, p.y, p.z, ln, hg, rgb, k)
        keep_clear(CAMERAS["seat"], on_glass)
        ff = Vector((GLASS_X + 0.1, eyes.y - 0.46, eyes.z - 0.075))
        st.area("face_fill", tuple(ff), (0.22, 0.22), FACE_FILL, st.LAMP, spread=70,
                rot=(eyes - ff).to_track_quat("-Z", "Y").to_euler())
        print(f"TRAIN seat camera {CAMERAS['seat']['loc']} aim {CAMERAS['seat']['aim']}: reflection on the glass at "
              f"{tuple(round(v, 3) for v in on_glass)}", flush=True)
    if "aisle" in CAMERAS:
        origin = Vector(CAMERAS["aisle"]["loc"])
        for i, (side, bay, z, depth) in enumerate(((-1, 1, 1.25, 9), (1, 1, 1.38, 12),
                                                    (-1, 2, 1.62, 17), (1, 2, 1.15, 10), (-1, 3, 1.30, 14))):
            pane = Vector((side * abs(GLASS_X), st.WIN_Y[bay], z))
            centre = pane + (pane - origin) * (depth / abs(pane.x - origin.x))
            st.streak_obj(f"aisle_motion_{i}", *centre, 7 + i, 0.07, (1.0, 0.56, 0.24), 3.8)
    if bag_box:
        lo, hi = bag_box["duffel"]
        lo2, hi2 = bag_box["suitcase"]
        f1 = Vector((hi.x, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2))
        f2 = Vector((hi2.x, (lo2.y + hi2.y) / 2, (lo2.z + hi2.z) / 2))
        target = f1.lerp(f2, 0.36)
        edge = Vector((-0.75, SEAT_Y + 0.3, 2.42))
        light = st.area("bag_edge", edge, (0.06, 1.2), 25, st.COOL, spread=68,
                        rot=(target - edge).to_track_quat("-Z", "Y").to_euler())
        receivers = bpy.data.collections.new("Train rack luggage")
        for obj in _STATE["bag_meshes"]:
            receivers.objects.link(obj)
        light.light_linking.receiver_collection = receivers
        _focus("fx_bags", target)          # between the two fronts: both inside the focus at f/2.8


# ---------------------------------------------------------------- build
def build(cast=True):
    st.M.clear()
    st.mt.M.clear()
    st.LIGHTS.clear()
    _STATE["base"].clear()
    st.materials()
    st.floor()
    st.ceiling()
    st.walls()
    st.end_walls()
    st.racks()
    coll = st.seat_unit()
    st.seats(coll)
    st.luggage()
    st.curtains()
    st.outside()
    lights()
    bag_box = bags()
    _focus("fx_dawn", (SEAT_X + 0.05, SEAT_Y + 0.2, 1.2))
    _focus("fx_bags", (-1.2, SEAT_Y, 2.0))
    eyes = None
    _STATE["cast"] = []
    _STATE["passengers"] = []
    if cast:
        d = place_dawn()
        eyes = eye_centre(d)
        _STATE["dawn"] = d
        _STATE["cast"] = [d] + list(d.children_recursive)
        dawn_count = len(_STATE["cast"])
        for (name, kind, side, row, which, upper) in TRAVELLERS:
            t = traveller(name, kind, side, row, which, upper)
            _STATE["cast"] += [t] + list(t.children_recursive)
        a = attendant()
        _STATE["cast"] += [a] + list(a.children_recursive)
        _STATE["passengers"] = [o for o in _STATE["cast"][dawn_count:] if o.type == "MESH"]
    set_cameras(eyes if eyes is not None else Vector((SEAT_X - 0.062, SEAT_Y + 0.126, 1.26)), bag_box)   # (as solved)
    _STATE["aisle_motion"] = [o for o in bpy.data.objects if o.name.startswith("aisle_motion_")]
    _STATE["cove_seams"] = [o for o in bpy.data.objects if o.name.startswith("cove_seam_")]
    install_hook()
