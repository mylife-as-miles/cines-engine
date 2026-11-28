"""Dawn's hands, shoes and prison clothes for the Void Stage (Ch 07), done in this stage only.

- close_hands: a relaxed hanging hand. MakeHuman's rest hand is spread, and rigged.pose_figure's "fingers" only bends
  the knuckle (the master bone), which left open claws (rounds 1-2). Here each finger joint curls about its own hinge
  (more toward the pinky), each finger closes on its neighbour until the gap between their skins is a few millimetres
  (measured on the posed mesh), and the thumb comes in along the side of the index.
- pronate: the forearms turned so the palms face the thighs (thumbs forward), not the camera.
- loosen_suit: the casual suit made to hang as loose prison issue. The suit is baked in its pose (it never moves: one
  frame per camera), then reshaped: the trouser legs fall straight from the knee and stack in a few soft rings over the
  shoe, the shirt hangs from the bust and the shoulder blades instead of following the waist, its hem standing off the
  hips (untucked), with soft vertical drape folds; nothing is pushed into the arms or hands.
- shoe_fit: the foot's stone tucked inside the shoes (it showed at the heel and toe).

All geometry is measured in the armature's space (the figure built at the origin, facing -Y), before it is placed.
"""
import math
from collections import defaultdict

import bpy  # noqa: F401  (bpy before mathutils)
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import rigged

# curl at the three joints of each finger (deg), growing from the index to the pinky, as a relaxed hand hangs
CURL = {"f_index": (10, 10, 10), "f_middle": (14, 14, 12), "f_ring": (17, 16, 15), "f_pinky": (20, 18, 17)}
FINGER_GAP = 0.0026     # m between the nearest vertices of neighbouring fingers once closed (skin gap ~1-2 mm)
THUMB_GAP = 0.0035
PRONATE_BACK = 10.0     # the palms face the thighs, turned this far toward the back (deg)


def _smooth(a, b, x):
    if b == a:
        return 1.0 if x >= b else 0.0
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


class _ArmatureOnly:
    """Evaluate an object with its armature alone (the other modifiers off), restoring them afterwards."""

    def __init__(self, ob):
        self.ob = ob

    def __enter__(self):
        self.off = [(m, m.show_viewport) for m in self.ob.modifiers if m.type != "ARMATURE"]
        for m, _ in self.off:
            m.show_viewport = False
        bpy.context.view_layer.update()
        return self

    def positions(self, idx=None):
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        ev = self.ob.evaluated_get(dg)
        me = ev.to_mesh()
        mw = self.ob.matrix_world
        vs = me.vertices
        out = [mw @ v.co for v in vs] if idx is None else {i: mw @ vs[i].co for i in idx}
        ev.to_mesh_clear()
        return out

    def __exit__(self, *a):
        for m, vis in self.off:
            m.show_viewport = vis
        bpy.context.view_layer.update()


def _rotate(rig, bone, axis, deg, base=None):
    """Rotate a pose bone about its head by `deg` about `axis` (armature space), from `base` (its matrix) if given."""
    pb = rig.pose.bones[bone]
    m = (base or pb.matrix).copy()
    h = m.translation.copy()
    pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized()) @ \
        Matrix.Translation(-h) @ m
    bpy.context.view_layer.update()


def _dir(pb, bone):
    b = pb[bone]
    return (b.tail - b.head).normalized()


def _palm(pb, k, side):
    """The palm's normal (out of the palm), the hand's direction and the knuckle line pinky -> index."""
    y = _dir(pb, f"DEF-hand.{k}")
    a = pb[f"DEF-f_index.01.{k}"].head - pb[f"DEF-f_pinky.01.{k}"].head
    return (y.cross(a) * side).normalized(), y, a


def pronate(holder, back_deg=PRONATE_BACK, share_upper=0.4):
    """Turn each arm about its own length until the knuckle line points forward (thumb forward, palm on the thigh),
    turned `back_deg` toward the back. `share_upper` of the turn at the shoulder (the elbow crease turns in with it),
    the rest in the forearm."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    done = {}
    for side, k in ((1, "L"), (-1, "R")):
        bpy.context.view_layer.update()
        f = math.radians(back_deg)
        tgt = Vector((-side * math.sin(f), -math.cos(f), 0.0))
        total = 0.0
        for bone, share in ((f"upper_arm_fk.{k}", share_upper), (f"forearm_fk.{k}", 1.0)):
            ax = _dir(pb, bone)
            _, _, a = _palm(pb, k, side)
            ap = (a - ax * a.dot(ax)).normalized()
            tp = (tgt - ax * tgt.dot(ax)).normalized()
            ang = math.degrees(math.atan2(ax.dot(ap.cross(tp)), ap.dot(tp)))
            _rotate(rig, bone, ax, ang * share)
            total += ang * share
        done[k] = total
    print(f"VOID pronate: arms turned {done['L']:+.1f} (L) {done['R']:+.1f} (R) deg about their length", flush=True)
    return done


def _finger_verts(body, k, f, segs=("02", "03")):
    gidx = {g.name: g.index for g in body.vertex_groups}
    gi = {gidx[n] for n in (f"DEF-{f}.{s}.{k}" for s in segs) if n in gidx}
    return [v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in gi) > 0.5]


def _min_gap(pos, A, B):
    kd = KDTree(len(B))
    for j, i in enumerate(B):
        kd.insert(pos[i], j)
    kd.balance()
    return min(kd.find(pos[i])[2] for i in A)


def _close_on(rig, ev, ctrl, axis, sign, A, B, gap, max_deg, step=2.0):
    """Turn bone `ctrl` about `axis` (sign toward the neighbour) until the vertex gap A-B is `gap`; returns degrees."""
    pb = rig.pose.bones
    base = pb[ctrl].matrix.copy()
    idx = A + B

    def at(d):
        _rotate(rig, ctrl, axis, sign * d, base)
        return _min_gap(ev.positions(idx), A, B)

    g0 = at(0.0)
    if g0 <= gap:
        return 0.0, g0, g0
    lo, hi, d = 0.0, None, step
    while d <= max_deg + 1e-6:
        if at(d) <= gap:
            hi = d
            break
        lo, d = d, d + step
    if hi is None:
        g = at(max_deg)
        return max_deg, g0, g
    for _ in range(5):
        mid = (lo + hi) / 2
        if at(mid) > gap:
            lo = mid
        else:
            hi = mid
    g = at(lo)
    return lo, g0, g


def _splay(pb, k, f, ref, n):
    """The angle (deg) by which finger f fans away from its neighbour ref in the palm's plane (positive: the tips
    apart), and the sign of a turn about n that closes it."""
    da, db = _dir(pb, f"DEF-{f}.01.{k}"), _dir(pb, f"DEF-{ref}.01.{k}")
    da, db = (da - n * da.dot(n)).normalized(), (db - n * db.dot(n)).normalized()
    lat = pb[f"DEF-{f}.01.{k}"].head - pb[f"DEF-{ref}.01.{k}"].head
    lat = lat - n * lat.dot(n)
    lat = (lat - db * lat.dot(db)).normalized()
    s = math.degrees(math.atan2(da.dot(lat), da.dot(db)))
    sgn = -1.0 if n.cross(da).dot(lat) > 0 else 1.0
    return s, sgn


def close_hands(holder, curl=CURL, converge=3.5, min_gap=0.0012, thumb_gap=THUMB_GAP):
    """Curl the fingers (CURL), close each on its neighbour until the two lie `converge` degrees toward each other in
    the palm's plane (the knuckles' spacing then leaves a skin gap of a millimetre or two; a vertex-gap target is
    fooled by the fingers' staggered curl, and closed them over each other), never nearer than `min_gap` between
    vertices, and bring the thumb in along the index."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    body = bpy.data.objects[holder["body"]]
    report = []
    for side, k in ((1, "L"), (-1, "R")):
        n, _, _ = _palm(pb, k, side)
        # curl: each joint about its hinge (across the finger, in the palm's plane), the tip toward the palm
        for f, angs in curl.items():
            for i, a in enumerate(angs):
                d = _dir(pb, f"DEF-{f}.0{i + 1}.{k}")
                _rotate(rig, f"{f}.0{i + 1}.{k}", d.cross(n), a)
        with _ArmatureOnly(body) as ev:
            # close the spread: each finger turned about the palm's normal toward its neighbour
            for f, ref in (("f_index", "f_middle"), ("f_ring", "f_middle"), ("f_pinky", "f_ring")):
                A, B = _finger_verts(body, k, f), _finger_verts(body, k, ref)
                s0, sgn = _splay(pb, k, f, ref, n)
                deg = max(0.0, min(30.0, s0 + converge))
                ctrl = f"{f}.01.{k}"
                base = pb[ctrl].matrix.copy()
                g = 1.0
                while True:
                    _rotate(rig, ctrl, n, sgn * deg, base)
                    g = _min_gap(ev.positions(A + B), A, B) if A and B else 1.0
                    if g >= min_gap or deg <= 0.0:
                        break
                    deg = max(0.0, deg - 1.0)
                s1, _ = _splay(pb, k, f, ref, n)
                report.append(f"{k} {f[2:]}->{ref[2:]} {deg:.1f} deg (splay {s0:+.1f}->{s1:+.1f}, gap {g * 1000:.1f} mm)")
            # the thumb in along the side of the index: turned toward the index's middle joint
            T = _finger_verts(body, k, "thumb", ("02", "03"))
            I = _finger_verts(body, k, "f_index", ("01", "02", "03"))
            if T and I:
                th = pb[f"DEF-thumb.01.{k}"].head
                aim = pb[f"DEF-f_index.02.{k}"].head - th
                ax = _dir(pb, f"DEF-thumb.01.{k}").cross(aim)
                if ax.length > 1e-6:
                    deg, g0, g1 = _close_on(rig, ev, f"thumb.01.{k}", ax, 1.0, T, I, thumb_gap, 33.0, 3.0)
                    report.append(f"{k} thumb {deg:.1f} deg (gap {g0 * 1000:.1f}->{g1 * 1000:.1f} mm)")
    print("VOID hands: " + "; ".join(report), flush=True)


ARM_BONES = ("DEF-upper_arm", "DEF-forearm", "DEF-hand", "DEF-elbow", "DEF-thumb", "DEF-palm", "DEF-f_")


def rest_seated_palms(holder, garment):
    """Set the palms and finger pads against the two posed trouser legs before placing Dawn on the bunk."""
    from aircraft_cabin import weighted_surface
    from hotel_room import ik_arm
    from visiting_room import palm_side, set_hand

    rig = rigged.rig_of(holder)
    suit = bpy.data.objects[f"{holder.name}_{garment}"]
    thigh_groups = {g.index for g in suit.vertex_groups if g.name.startswith(("DEF-thigh", "DEF-pelvis"))}
    cloth = weighted_surface(suit, thigh_groups, 0.45)
    down = Vector((0, 0, -1))

    def thigh_height(x, y):
        hit, _, _, _ = cloth.ray_cast(Vector((x, y, 1.2)), down, 1.5)
        return hit.z if hit is not None else None

    def cloth_gap(points):
        return min((p.z - z for p in points if (z := thigh_height(p.x, p.y)) is not None), default=None)

    # Put the left hand a little ahead of the right so the fingers do not stack in profile.
    for sign, side, station in ((1, "L", 0.61), (-1, "R", 0.56)):
        thigh = rig.pose.bones[f"thigh_fk.{side}"]
        point = rig.matrix_world @ thigh.head.lerp(thigh.tail, station)
        top = thigh_height(point.x, point.y)
        ahead = thigh_height(point.x - sign * 0.012, point.y - 0.060)
        if top is None or ahead is None:
            raise RuntimeError(f"Dawn's seated {side} hand target misses the trouser leg")
        forward = Vector((-sign * 0.16, -1, 0)).normalized()
        pitch = math.atan2(ahead - top, 0.060)
        target = Vector((point.x, point.y, top + 0.021))
        for _ in range(15):
            fingers = forward * math.cos(pitch) - down * math.sin(pitch)
            ik_arm(holder, sign, target, pole=(0.52, 0.32, -1))
            set_hand(holder, side, down, fingers)
            normal, _ = palm_side(holder, side)
            if normal.dot(down) <= 0:
                key = f"palm_flip_{side}"
                holder[key] = not holder.get(key, False)
                set_hand(holder, side, down, fingers)
            skin = rigged.hand_surface(holder, side)
            palm_gap = cloth_gap(skin["palm"])
            pad_gap = cloth_gap(skin["thumb"] + skin["fingers"])
            if palm_gap is None or pad_gap is None:
                raise RuntimeError(f"Dawn's seated {side} hand no longer overlaps the trouser leg")
            lift = 0.002 - min(palm_gap, pad_gap)
            tilt = palm_gap - pad_gap
            if abs(lift) < 0.001 and abs(tilt) < 0.006:
                break
            pitch += max(-0.12, min(0.12, 0.7 * math.atan2(tilt, 0.095)))
            target.z += max(-0.025, min(0.025, 0.8 * lift))
        if not (-0.002 < min(palm_gap, pad_gap) < 0.008 and abs(palm_gap - pad_gap) < 0.013):
            raise RuntimeError(f"Dawn's seated {side} hand does not rest on the trousers")
        print(f"VOID seated {side}: palms {palm_gap * 1000:.2f} mm, pads {pad_gap * 1000:.2f} mm", flush=True)


def _sleeve_verts(ob, me=None):
    """The garment's sleeve vertices: those weighted mostly to the arm bones."""
    me = me or ob.data
    gi = {g.index for g in ob.vertex_groups if g.name.startswith(ARM_BONES)}
    return {v.index for v in me.vertices if sum(g.weight for g in v.groups if g.group in gi) > 0.5}


def _signed_bvh(ob, inside_bones, rig, skip=()):
    """A BVH of `ob` under its armature alone (armature space) and the sign that makes (p - nearest) . normal
    positive outside (checked on points along bones that lie inside it)."""
    with _ArmatureOnly(ob) as ev:
        pos = ev.positions()
    inv = rig.matrix_world.inverted()
    pos = [inv @ p for p in pos]
    skip = set(skip)
    bvh = BVHTree.FromPolygons(pos, [tuple(p.vertices) for p in ob.data.polygons
                                     if not any(i in skip for i in p.vertices)])
    pb = rig.pose.bones
    s = []
    for b in inside_bones:
        if b in pb:
            p = (pb[b].head + pb[b].tail) / 2
            h = bvh.find_nearest(p, 0.3)
            if h[0] is not None:
                s.append((p - h[0]).dot(h[1]))
    flip = -1.0 if sum(1 for v in s if v > 0) > len(s) / 2 else 1.0
    return bvh, flip


def carry_arms(holder, garment, pose, clear=0.039, lo=3.0, hi=24.0):
    """Swing each forearm out from the elbow (the carrying angle a woman's arm hangs with) just enough that the hand,
    fingers curled, hangs `clear` off the suit as it is now (tight): after the suit's stand-off, loosening and creases
    (about 17 mm in all) that leaves the hand 2-3 cm off the trouser's side seam. The upper arms stay close
    (pose 'out' 2.5): round 2's arms held out at 6-7 deg read as hands hovering away from the body. Measured as a
    signed distance on the posed meshes, so a hand inside the trousers counts as negative."""
    gar = bpy.data.objects.get(f"{holder.name}_{garment}")
    if gar is None:
        return {}
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    body = bpy.data.objects[holder["body"]]
    inv = rig.matrix_world.inverted()
    # the suit without its sleeves (a full sleeve's cuff hangs round the wrist: the hand's clearance is to the hips)
    bvh, flip = _signed_bvh(gar, ("DEF-thigh.L", "DEF-thigh.R", "DEF-spine.001", "DEF-spine.002"), rig,
                            skip=_sleeve_verts(gar))
    done = {}
    with _ArmatureOnly(body) as ev:
        for side, k, key in ((1, "L", "l_arm"), (-1, "R", "r_arm")):
            fwd, out, elbow = pose[key]
            gi = {g.index for g in body.vertex_groups if g.name.endswith(f".{k}") and
                  g.name.startswith(("DEF-hand", "DEF-f_", "DEF-thumb", "DEF-palm"))}
            hv = [v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in gi) > 0.5]

            def at(c):
                rigged._aim(rig, f"forearm_fk.{k}", rigged._dir(0, fwd + elbow, side, c))
                pos = ev.positions(hv)
                best = 1.0
                for i in hv:
                    p = inv @ pos[i]
                    h = bvh.find_nearest(p, 0.2)
                    if h[0] is not None:
                        best = min(best, flip * (p - h[0]).dot(h[1]))
                return best
            c0 = at(lo)
            if c0 >= clear:
                c, d = lo, c0
            elif at(hi) < clear:
                c, d = hi, at(hi)
            else:
                a, b = lo, hi
                for _ in range(7):
                    m = (a + b) / 2
                    if at(m) >= clear:
                        b = m
                    else:
                        a = m
                c, d = b, at(b)
            done[k] = (c, c0, d)
    print("VOID carry: " + "; ".join(f"{k} forearm out {c:.1f} deg (hand to tight suit {c0 * 1000:+.0f} -> "
                                     f"{d * 1000:+.0f} mm)" for k, (c, c0, d) in done.items()), flush=True)
    return done


# ---------------------------------------------------------------- shoes

def shoe_fit(holder, tuck=0.010):
    """Tuck the foot's stone inside the shoes: every foot vertex an outward ray from which meets a shoe's inside
    within 3 cm (or that lies just outside the shoe) goes 10 mm in (a Displace after the armature)."""
    body = bpy.data.objects[holder["body"]]
    shoes = [o for o in holder.children_recursive if o.type == "MESH" and "_shoes" in o.name]
    if not shoes:
        return 0
    tris, verts = [], []
    for s in shoes:
        with _ArmatureOnly(s) as ev:
            pos = ev.positions()
        base = len(verts)
        verts += pos
        tris += [tuple(base + i for i in p.vertices) for p in s.data.polygons]
    bvh = BVHTree.FromPolygons(verts, tris)
    gi = {g.index for g in body.vertex_groups if g.name.startswith(("DEF-foot", "DEF-toe"))}
    cand = [v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in gi) > 0.3]
    with _ArmatureOnly(body) as ev:
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        be = body.evaluated_get(dg)
        me = be.to_mesh()
        mw, n3 = body.matrix_world, body.matrix_world.to_3x3()
        pn = {i: (mw @ me.vertices[i].co, (n3 @ me.vertices[i].normal).normalized()) for i in cand}
        be.to_mesh_clear()
    covered = []
    for i, (p, nr) in pn.items():
        out = bvh.ray_cast(p + nr * 0.0005, nr, 0.03)
        inn = bvh.ray_cast(p - nr * 0.0005, -nr, 0.012)
        if (out[0] is not None and out[1].dot(nr) > 0.0) or inn[0] is not None:
            covered.append(i)
    # feathered over three edge rings from the foot's uncovered skin, so the shoe's collar shows no step
    cov = set(covered)
    cset = set(cand)
    nbr = defaultdict(list)
    for e in body.data.edges:
        a, b = e.vertices
        if a in cset and b in cset:
            nbr[a].append(b)
            nbr[b].append(a)
    dist = {i: 0 for i in cand if i not in cov}
    front = list(dist)
    while front:
        nxt = []
        for i in front:
            for j in nbr[i]:
                if j not in dist:
                    dist[j] = dist[i] + 1
                    nxt.append(j)
        front = nxt
    vg = body.vertex_groups.get("under_shoe") or body.vertex_groups.new(name="under_shoe")
    for i in covered:
        vg.add([i], min(1.0, dist.get(i, 9) / 3.0), "REPLACE")
    tk = body.modifiers.new("tuck_shoe", "DISPLACE")
    tk.direction, tk.mid_level, tk.strength, tk.vertex_group = "NORMAL", 0.0, -tuck, "under_shoe"
    idx = next(i for i, m in enumerate(body.modifiers) if m.type == "ARMATURE")
    body.modifiers.move(len(body.modifiers) - 1, idx + 1)
    print(f"VOID shoe fit: {len(covered)} of {len(cand)} foot vertices tucked {tuck * 1000:.0f} mm inside the shoes",
          flush=True)
    return len(covered)


# ---------------------------------------------------------------- the loose prison suit

def _components(me):
    adj = defaultdict(list)
    for e in me.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    comp = [-1] * len(me.vertices)
    c = 0
    for i in range(len(me.vertices)):
        if comp[i] >= 0:
            continue
        stack = [i]
        comp[i] = c
        while stack:
            j = stack.pop()
            for q in adj[j]:
                if comp[q] < 0:
                    comp[q] = c
                    stack.append(q)
        c += 1
    return comp, adj


def _bake_pose(gar, subdiv=2):
    """Replace the suit's mesh by itself as posed (armature and stand-off applied, subdivided `subdiv` times), so it
    can be reshaped vertex by vertex in place; its remaining smoothing goes down to one level."""
    keep = {"ARMATURE", "SUBSURF"}
    off = [(m, m.show_viewport) for m in gar.modifiers if m.type not in keep and m.name != "standoff"]
    for m, _ in off:
        m.show_viewport = False
    sub = next((m for m in gar.modifiers if m.type == "SUBSURF"), None)
    if sub is not None:
        sub.levels = subdiv
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ge = gar.evaluated_get(dg)
    new = bpy.data.meshes.new_from_object(ge, preserve_all_data_layers=True, depsgraph=dg)
    old = gar.data
    for m, vis in off:
        m.show_viewport = vis
    if not new.materials:
        for m in old.materials:
            new.materials.append(m)
    gar.data = new
    for m in [m for m in gar.modifiers if m.type == "ARMATURE" or m.name == "standoff"]:
        gar.modifiers.remove(m)
    if sub is not None:
        sub.levels = sub.render_levels = 1
    bpy.context.view_layer.update()
    return new


def loosen_suit(holder, garment, push=0.006, hem_lift=0.030, knee_taper=0.06, leg_r=0.061, *, seated=False):
    """Reshape the posed suit (see the module's note). `push` more stand-off everywhere (along the normals), the legs
    straight from the knee, the shirt hanging from the bust with its hem `hem_lift` off the hips.
    On the bunk, use less of that drape so the shirt settles into the lap."""
    gar = bpy.data.objects.get(f"{holder.name}_{garment}")
    if gar is None:
        return None
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    body = bpy.data.objects[holder["body"]]
    me = _bake_pose(gar)
    ra = rig.matrix_world.inverted() @ gar.matrix_world      # garment local -> armature space
    ar = ra.inverted()
    r3 = ra.to_3x3()
    P = [ra @ v.co for v in me.vertices]
    N = [(r3 @ v.normal).normalized() for v in me.vertices]
    nv = len(P)
    comp, adj = _components(me)
    zmax = defaultdict(lambda: -1e9)
    for i, c in enumerate(comp):
        zmax[c] = max(zmax[c], P[i].z)
    shirt_c = max(zmax, key=zmax.get)
    uv = me.uv_layers.active.data if me.uv_layers.active else None
    vuv = {}
    if uv is not None:
        for li, lp in enumerate(me.loops):
            vuv.setdefault(lp.vertex_index, uv[li].uv)
    sleeve = {i for i in _sleeve_verts(gar, me) if comp[i] == shirt_c}
    if not sleeve:      # no weights on the baked mesh: the short-sleeved suit's sleeve UV islands
        sleeve = {i for i, t in vuv.items() if comp[i] == shirt_c and t[0] > 0.745 and 0.15 < t[1] < 0.45}
    torso = [i for i in range(nv) if comp[i] == shirt_c and i not in sleeve]
    legs = [i for i in range(nv) if comp[i] != shirt_c]
    off = [N[i] * push for i in range(nv)]
    # no extra stand-off at the collar and over the shoulders' top (fading in over 10 cm down from the shirt's
    # top): pushed out, the collar left a gap whose top-lit neck read as two white lines (preview 1), and a collar
    # flap and the shirt under it move together
    ztop_shirt = max(P[i].z for i in range(nv) if comp[i] == shirt_c)
    for i in range(nv):
        if comp[i] == shirt_c:
            off[i] = off[i] * _smooth(ztop_shirt, ztop_shirt - 0.10, P[i].z)
    Q = lambda i: P[i] + off[i]  # noqa: E731

    # Straight from the knee, with a few vertical folds and the shoe toes clear.
    for side, k in ((1, "L"), (-1, "R")):
        K, A = pb[f"DEF-shin.{k}"].head.copy(), pb[f"DEF-foot.{k}"].head.copy()
        u = A - K
        L = u.length
        u.normalize()
        fw = Vector((0.0, -1.0, 0.0))
        e1 = (fw - u * fw.dot(u)).normalized()
        e2 = u.cross(e1)
        mine = [i for i in legs if P[i].x * side > 0.0]
        geo = {}
        for i in mine:
            q = Q(i) - K
            t = q.dot(u) / L
            rv = q - u * q.dot(u)
            geo[i] = (t, rv)
        ring = sorted(rv.length for t, rv in geo.values() if abs(t) < 0.06)
        if not ring:
            continue
        Rk = ring[len(ring) // 2]
        for i, (t, rv) in geo.items():
            if t <= 0.0:
                continue
            r = rv.length
            if r < 1e-6:
                continue
            th = math.atan2(rv.dot(e2), rv.dot(e1))
            w = _smooth(0.0, 0.35, t)
            R = min(Rk, leg_r) * (1.0 - knee_taper * t)   # the uniform's legs are already eased: no flares
            tgt = r + w * max(-0.007, R - r)
            tgt += w * 0.0022 * (0.5 + 0.5 * math.sin(5 * th + 1.1 * math.sin(2 * th + 0.7)))
            off[i] += rv / r * (tgt - r)
        print(f"VOID suit: leg {k} falls straight from the knee at r {Rk * 1000:.0f} mm "
              f"({len(geo)} vertices)", flush=True)

    # the shirt: hanging from the bust (front) and the shoulder blades (back), not following the waist in
    band = [P[i] for i in torso if 0.95 < P[i].z < 1.25]
    yc = sum(p.y for p in band) / max(1, len(band))
    NB, DZ = 24, 0.015

    def polar(p):
        dy = p.y - yc
        return math.hypot(p.x, dy), math.atan2(p.x, -dy)

    front = [(polar(Q(i))[0], Q(i).z) for i in torso if abs(polar(Q(i))[1]) < math.radians(25) and
             1.08 < Q(i).z < 1.32]
    ztop = max(front)[1] if front else 1.2
    zmin = min(Q(i).z for i in torso)
    R = defaultdict(float)
    for i in torso:
        p = Q(i)
        if p.z > ztop:      # the shoulders and the collar stay as they are
            continue
        r, th = polar(p)
        b = int(((th + math.pi) / (2 * math.pi)) * NB) % NB
        j = int((ztop - p.z) / DZ)
        R[b, j] = max(R[b, j], r)
    nj = int((ztop - zmin) / DZ) + 2
    hang = [[0.0] * nj for _ in range(NB)]
    for b in range(NB):
        cur = R.get((b, 0), 0.0)
        for j in range(nj):
            cur = max(R.get((b, j), 0.0), cur - 0.0011)
            hang[b][j] = cur
    for _ in range(2):
        hang = [[0.25 * hang[(b - 1) % NB][j] + 0.5 * hang[b][j] + 0.25 * hang[(b + 1) % NB][j] for j in range(nj)]
                for b in range(NB)]
    drape = 0.43 if seated else 1.0
    for i in torso:
        p = Q(i)
        r, th = polar(p)
        if p.z >= ztop or r < 1e-6:
            continue
        fb = ((th + math.pi) / (2 * math.pi)) * NB - 0.5
        b0 = math.floor(fb)
        fr = fb - b0
        fj = min(nj - 1.001, max(0.0, (ztop - p.z) / DZ))
        j0 = int(fj)
        fz = fj - j0

        def hv(b):
            hb_ = hang[b % NB]
            return hb_[j0] * (1 - fz) + hb_[min(nj - 1, j0 + 1)] * fz
        h = hv(b0) * (1 - fr) + hv(b0 + 1) * fr
        w = _smooth(0.0, 0.05, ztop - p.z)
        tgt = r + w * drape * max(0.0, h - r)
        drop = _smooth(0.0, 0.25, ztop - p.z)
        tgt += drop * 0.0042 * (0.5 + 0.5 * math.sin(9 * th + 1.4 * math.sin(3 * th + 0.5)))
        rear = 1.0 - 0.70 * _smooth(math.radians(103), math.radians(132), abs(th))
        lap = 0.40 + 0.60 * _smooth(math.radians(20), math.radians(75), abs(th)) if seated else 1.0
        tgt += hem_lift * rear * lap * _smooth(zmin + 0.07, zmin, p.z)
        radial = Vector((p.x, p.y - yc, 0.0)) / r
        off[i] = off[i] + radial * (tgt - r)

    # soften the field over the mesh (no step at a bin edge), then keep it out of the arms and hands
    for _ in range(2):
        off = [off[i] * 0.5 + sum((off[j] for j in adj[i]), Vector()) * (0.5 / len(adj[i])) if adj[i] else off[i]
               for i in range(nv)]
    with _ArmatureOnly(body) as ev:
        bpos = ev.positions()
    ra_b = rig.matrix_world.inverted()
    bpos = [ra_b @ p for p in bpos]
    gi = {g.index for g in body.vertex_groups
          if g.name.startswith(("DEF-upper_arm", "DEF-forearm", "DEF-hand", "DEF-f_", "DEF-thumb", "DEF-palm"))}
    arm = [sum(g.weight for g in v.groups if g.group in gi) > 0.3 for v in body.data.vertices]
    polys = [tuple(p.vertices) for p in body.data.polygons if all(arm[i] for i in p.vertices)]
    bvh = BVHTree.FromPolygons(bpos, polys)
    # which way the faces' normals point (MakeHuman's winding): a point on each arm bone lies inside the arm
    probe = [(pb[b].head + pb[b].tail) / 2 for b in ("DEF-upper_arm.L.001", "DEF-forearm.L", "DEF-forearm.L.001",
                                                     "DEF-upper_arm.R.001", "DEF-forearm.R", "DEF-forearm.R.001")
             if b in pb]
    inside = [(p - h[0]).dot(h[1]) for p in probe for h in [bvh.find_nearest(p, 0.2)] if h[0] is not None]
    flip = -1.0 if sum(1 for s in inside if s > 0) > len(inside) / 2 else 1.0

    def sd(p):
        hit = bvh.find_nearest(p, 0.06)
        if hit[0] is None:
            return 1.0
        return flip * (p - hit[0]).dot(hit[1])

    cuff = me.color_attributes.new("uniform_cuff", "FLOAT_COLOR", "POINT")
    for k in ("L", "R"):
        wrist = pb[f"DEF-hand.{k}"].head
        u = (wrist - pb[f"DEF-forearm.{k}.001"].head).normalized()
        for i in sleeve:
            q = Q(i) - wrist
            along = q.dot(u)
            if not -0.080 < along < 0.035:
                continue
            rv = q - u * along
            if rv.length < 1e-6 or rv.length > 0.11:
                continue
            axis = wrist + u * along
            hit = bvh.ray_cast(axis, rv.normalized(), 0.11)
            if hit[0] is None:
                continue
            gap = 0.010 - 0.004 * _smooth(-0.035, -0.015, along)
            excess = max(0.0, rv.length - (hit[0] - axis).length - gap)
            off[i] -= rv.normalized() * excess * _smooth(-0.080, -0.045, along)
            val = _smooth(-0.065, -0.028, along)
            cuff.data[i].color = (val, val, val, 1)
    for mat in me.materials:
        if not mat or not mat.use_nodes:
            continue
        nt = mat.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        src = b.inputs["Base Color"]
        tint = nt.nodes.new("ShaderNodeMixRGB")
        tint.blend_type = "MULTIPLY"
        tint.inputs[2].default_value = (0.75, 0.75, 0.75, 1.0)
        if src.is_linked:
            nt.links.new(src.links[0].from_socket, tint.inputs[1])
        else:
            tint.inputs[1].default_value = src.default_value
        mask = nt.nodes.new("ShaderNodeAttribute")
        mask.attribute_name = cuff.name
        nt.links.new(mask.outputs["Fac"], tint.inputs[0])
        nt.links.new(tint.outputs[0], src)
    margin, held, neg0 = 0.006, 0, 0
    for i in range(nv):
        if off[i].length < 1e-5:
            continue
        p0 = P[i]
        d0 = sd(p0)
        if d0 < 0.0:
            neg0 += 1
        need = min(margin, d0)
        if sd(p0 + off[i]) >= need:
            continue
        lo, hi = 0.0, 1.0
        for _ in range(6):
            mid = (lo + hi) / 2
            if sd(p0 + off[i] * mid) >= need:
                lo = mid
            else:
                hi = mid
        off[i] = off[i] * lo
        held += 1
    co = [ar @ (P[i] + off[i]) for i in range(nv)]
    me.vertices.foreach_set("co", [c for v in co for c in v])
    me.update()
    mx = max(o.length for o in off)
    for name, ids in (("torso", torso), ("sleeves", sleeve), ("legs", legs)):
        j = max(ids, key=lambda i: off[i].length, default=None)
        if j is not None:
            print(f"VOID suit: largest {name} move {off[j].length * 1000:.0f} mm at "
                  f"{tuple(round(c, 3) for c in P[j])}", flush=True)
    print(f"VOID suit loosened: {nv} vertices (torso {len(torso)}, sleeves {len(sleeve)}, legs {len(legs)}); bust at "
          f"z {ztop:.3f}, hem z {zmin:.3f}; largest move {mx * 1000:.0f} mm; {held} held off the arms "
          f"({neg0} started inside; arm normals {'flipped' if flip < 0 else 'outward'})", flush=True)
    return gar


def clearance(holder, garment):
    """Report how far the hands hang from the suit (m), measured on the evaluated meshes, armature space."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    gar = bpy.data.objects.get(f"{holder.name}_{garment}")
    if gar is None:
        return {}
    bpy.context.view_layer.update()
    # the baked (posed) suit's own mesh, its sleeves left out (the cuff hangs round the wrist)
    gm = gar.data
    gw = gar.matrix_world
    skip = _sleeve_verts(gar, gm)
    bvh = BVHTree.FromPolygons([gw @ v.co for v in gm.vertices],
                               [tuple(p.vertices) for p in gm.polygons if not any(i in skip for i in p.vertices)])
    out = {}
    with _ArmatureOnly(body) as ev:
        pos = ev.positions()
    for k in ("L", "R"):
        gi = {g.index for g in body.vertex_groups if g.name.endswith(f".{k}") and
              g.name.startswith(("DEF-hand", "DEF-f_", "DEF-thumb", "DEF-palm"))}
        hv = [v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in gi) > 0.5]
        if not hv:
            continue
        hits = []
        for i in hv:
            h = bvh.find_nearest(pos[i], 0.2)
            if h[0] is not None:
                hits.append((h[3], i, h[0]))
        if hits:
            d, i, loc = min(hits)
            out[k] = (d, tuple(round(c, 3) for c in pos[i]), tuple(round(c, 3) for c in loc))
    print(f"VOID hand clearance to the suit ({len(skip)} sleeve vertices left out): " + "; ".join(f"{k} {v[0] * 1000:.1f} mm (hand {v[1]} suit {v[2]})"
                                                        for k, v in out.items()), flush=True)
    return out
