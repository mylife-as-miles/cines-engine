"""Sets shared by this production's scenes: the airport inspection room and the bench with the two bags.

    import sets
    sets.airport_room()
    case, bag = sets.bench_and_bags(sets.M["steel"], sets.M["case"], sets.M["leather"], sets.M["rubber"], sets.M["tag"])
"""
import math

import bpy  # noqa: F401  (loaded before setkit uses bmesh)
import setkit as sk

M = {}


def materials():
    """The shared materials, made once per scene."""
    if not M:
        M.update(steel=sk.mat("steel", (0.62, 0.63, 0.65), 0.28, 1.0), case=sk.mat("hard case", (0.025, 0.03, 0.045), 0.35),
                 leather=sk.mat("leather", (0.085, 0.05, 0.03), 0.48), rubber=sk.mat("rubber", (0.01, 0.01, 0.01), 0.7),
                 tag=sk.mat("tag paper", (0.75, 0.74, 0.68), 0.8))
    return M


def bench_and_bags(steel, case_m, leather, rubber, tag_m, top=0.86, x=0.0, y=0.0):
    sk.box("bench_top", (2.0, 0.8, 0.04), (x, y, top - 0.02), steel, bevel=0.006)
    for dx in (-0.94, 0.94):
        for dy in (-0.34, 0.34):
            sk.box("bench_leg", (0.04, 0.04, top - 0.04), (x + dx, y + dy, (top - 0.04) / 2), steel)
    sk.box("bench_shelf", (1.92, 0.72, 0.02), (x, y, 0.18), steel)
    case = sk.box("case", (0.72, 0.48, 0.27), (x + 0.18, y + 0.02, top + 0.135), case_m, bevel=0.035, rot=(0, 0, math.radians(-8)))
    for i, dx in enumerate((-0.2, 0.0, 0.2)):
        sk.box(f"case_ridge{i}", (0.03, 0.44, 0.012), (dx, 0, 0.137), case_m, bevel=0.005).parent = case
    for yy in (-0.17, 0.17):
        sk.cyl("wheel", 0.03, 0.025, (-0.37, yy, -0.1), rubber, rot=(math.pi / 2, 0, 0)).parent = case
    sk.box("case_grip", (0.025, 0.16, 0.03), (0.375, 0, 0.0), rubber, bevel=0.008).parent = case
    sk.box("tag", (0.005, 0.05, 0.1), (0.405, 0.02, -0.07), tag_m, rot=(0, math.radians(8), 0)).parent = case
    bag = sk.box("holdall", (0.6, 0.32, 0.3), (x - 0.12, y - 0.1, top + 0.15), leather, bevel=0.12, rot=(0, 0, math.radians(14)))
    sk.arc("holdall_handle", (-0.12, -0.05, 0.13), (0.12, -0.05, 0.13), 0.13, leather, r=0.012).parent = bag
    sk.arc("holdall_handle2", (-0.12, 0.05, 0.13), (0.12, 0.05, 0.13), 0.12, leather, r=0.012).parent = bag
    return case, bag



def airport_room():
    M = materials()
    W, D, H = 5.6, 4.8, 2.8
    floor = sk.mat("vinyl", (0.2, 0.2, 0.2), 0.3, nodes=sk.tiles(1.6, (0.065, 0.07, 0.07), (0.05, 0.055, 0.055), (0.025, 0.025, 0.025), 0.004))
    wall = sk.mat("wall paint", (0.11, 0.125, 0.12), 0.85)
    ceil = sk.mat("ceiling tile", (0.2, 0.2, 0.2), 0.9, nodes=sk.tiles(1.65, (0.2, 0.2, 0.2), (0.19, 0.19, 0.19), (0.08, 0.08, 0.08), 0.012, False))
    sk.box("floor", (W, D, 0.02), (0, 0.2, -0.01), floor)
    sk.box("ceiling", (W, D, 0.02), (0, 0.2, H + 0.01), ceil)
    for n, s, l in (("wall_back", (W, 0.1, H), (0, 0.2 + D / 2 + 0.05, H / 2)), ("wall_left", (0.1, D, H), (-W / 2 - 0.05, 0.2, H / 2)),
                    ("wall_right", (0.1, D, H), (W / 2 + 0.05, 0.2, H / 2)), ("wall_front", (W, 0.1, H), (0, 0.2 - D / 2 - 0.05, H / 2))):
        sk.box(n, s, l, wall)
    door = sk.mat("door", (0.13, 0.15, 0.17), 0.45, 0.3)
    sk.box("door", (0.05, 0.95, 2.1), (-W / 2 + 0.03, 1.6, 1.05), door)
    for n, loc, k in (("troffer_bench", (0.0, 0.05, H - 0.005), 1.0), ("troffer_back", (0.0, 2.0, H - 0.005), 0.06)):
        sk.box(n + "_housing", (1.24, 0.64, 0.03), loc, M["steel"])
        sk.box(n, (1.18, 0.58, 0.01), (loc[0], loc[1], loc[2] - 0.02), sk.emission(n + "_em", (0.86, 0.94, 1.0), 9.0 * k))
        sk.area_light(n + "_light", (loc[0], loc[1], loc[2] - 0.03), (1.18, 0.58), 480 * k, (0.86, 0.94, 1.0), spread_deg=75)
    sk.haze((W - 0.02, D - 0.02, H - 0.02), (0, 0.2, H / 2), 0.009)
