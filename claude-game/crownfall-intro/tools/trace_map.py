"""Trace the creator's map of Aethelgard into data the film can draw (film/mapdata.js).

    python tools/trace_map.py <coloured-layout.png> [debug-dir]

The input is the creator's "Blood-Throne of Aethelgard" working layout (v0.2, proposals, not canon). It stays out of
the repository; only the traced shapes are kept. Coordinates are the map sheet's own: 2000 x 1650 units, origin top
left, the same as the creator's ink map. Shapes come from the layout's colours (sea, glacier, the Feral Ranges, forest,
mountains, lava, the land inside the frontier); places, roads and halls are read off the map by hand (see PLACES).
A blue ring the creator drew around the Hwaelmearc (the player's home) is taken out of the shapes and kept as HOME.
Needs numpy, pillow and scikit-image.
"""
import json, os, sys

import numpy as np
from PIL import Image
from skimage import measure, morphology, filters

SRC = sys.argv[1]
DBG = sys.argv[2] if len(sys.argv) > 2 else None
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'film', 'mapdata.js')
S = 2.0                                     # map units per analysis pixel (analysis grid 1000 x 825)

im = Image.open(SRC).convert('RGB').resize((1000, 825), Image.LANCZOS)
a = np.array(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn) / (mx + 1e-3)
H, W = lum.shape
yy, xx = np.mgrid[0:H, 0:W]
X, Y = xx * S, yy * S
inner = (X > 68) & (X < 1932) & (Y > 66) & (Y < 1586)

ring = (b > 205) & (r < 70) & (g < 130)                       # the creator's blue ring
ring_d = morphology.binary_dilation(ring, morphology.disk(2))
sea_raw = inner & (b > r + 22) & (b > g - 6) & (r < 170) & (lum < 175) & ~ring_d
# under the ring, take whatever surrounds it
near = filters.gaussian(sea_raw.astype(float), 4.0) / np.maximum(filters.gaussian((~ring_d).astype(float), 4.0), 1e-3)
sea_raw = sea_raw | (ring_d & inner & (near > 0.5))
glacier = inner & (r > 185) & (g > 195) & (b > 205) & (b >= r - 2)
green = inner & (g > r + 4) & (g > b + 4)
forest = green & (lum < 120)
grey = inner & (sat < 0.09) & (lum > 135) & (lum < 182) & ~glacier
feral = inner & (r > g + 4) & (g > b + 6) & (r - b > 22) & (lum > 70) & (lum < 170) & (X > 1150)
mount = inner & (sat < 0.12) & (lum < 140) & (X > 940) & (X < 1340) & (Y > 300) & (Y < 1300)
lava = inner & (lum < 62) & (X > 1000) & (X < 1340) & (Y > 740) & (Y < 1200)


def biggest(m, n=1, min_area=0):
    lab = measure.label(m)
    props = sorted(measure.regionprops(lab), key=lambda p: -p.area)
    out = np.zeros_like(m)
    for p in props[:n]:
        if p.area >= min_area:
            out |= lab == p.label
    return out


def contours(m, tol=0.9, min_len=12):
    m = np.pad(m, 1, mode='edge').astype(float)
    m = filters.gaussian(m, 1.0)
    out = []
    for c in measure.find_contours(m, 0.5):
        c = measure.approximate_polygon(c, tolerance=tol)
        if len(c) < min_len:
            continue
        out.append([[round(float(p[1] - 1) * S, 1), round(float(p[0] - 1) * S, 1)] for p in c])
    return out


# sea: drop rivers and lines, fill the legend, scale bar and compass boxes it surrounds, extend it over the frame
sea = morphology.binary_opening(sea_raw, morphology.disk(3))
# the legend, the scale bar and the compass sit on the sea: fill their boxes
for x0, y0, x1, y1 in [(70, 330, 380, 652), (70, 760, 500, 840), (70, 70, 330, 290)]:
    sea |= (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
sea = morphology.remove_small_holes(sea, area_threshold=60000)
sea = morphology.remove_small_objects(sea, 30)
main_sea = biggest(sea, 1)
lake = sea & ~main_sea
lake = biggest(lake, 3, 60)
# carry the main sea out to the sheet's edges where it meets the frame
ms = main_sea.copy()
for _ in range(20):
    ms = ms | (morphology.binary_dilation(ms, morphology.disk(1)) & ~inner)
coast = contours(ms, 0.8, 30)
lakes = contours(lake, 0.6, 6)

glac = morphology.binary_closing(glacier, morphology.disk(7))
glac = biggest(morphology.remove_small_holes(glac, 20000), 1)
feral_r = morphology.binary_closing(feral | ((X > 1150) & (X < 1480) & (Y > 64) & (Y < 196)), morphology.disk(9))
feral_r = biggest(morphology.remove_small_holes(feral_r, 40000), 1)
lava_r = morphology.binary_opening(morphology.binary_closing(lava, morphology.disk(4)), morphology.disk(2))
lava_r = biggest(lava_r, 2, 80)

land = inner & ~morphology.binary_dilation(main_sea, morphology.disk(1)) & ~grey & ~lake
land = morphology.binary_closing(land, morphology.disk(6))
land = morphology.binary_opening(land, morphology.disk(4))
land = biggest(morphology.remove_small_holes(land, 80000), 1)
realm = contours(land, 1.0, 40)

# forest: density of dark-green tree marks, sampled on a jittered grid
rng = np.random.default_rng(1033)
dens = filters.gaussian(forest.astype(float), 3.0)
trees = []
for j in range(0, H, 6):
    for i in range(0, W, 6):
        jx, jy = i + rng.uniform(-2.6, 2.6), j + rng.uniform(-2.6, 2.6)
        ii, jj = int(min(W - 1, max(0, jx))), int(min(H - 1, max(0, jy)))
        d = dens[jj, ii]
        if d > 0.1 and rng.uniform() < min(1.0, d * 2.6) and not main_sea[jj, ii] and not glac[jj, ii] and not lake[jj, ii]:
            trees.append([round(jx * S), round(jy * S), int(min(3, d * 6))])

# mountains along the Brynefeld spine
mdens = filters.gaussian((mount | lava).astype(float), 4.0)
peaks = []
for j in range(0, H, 8):
    for i in range(0, W, 8):
        jx, jy = i + rng.uniform(-3, 3), j + rng.uniform(-3, 3)
        ii, jj = int(min(W - 1, max(0, jx))), int(min(H - 1, max(0, jy)))
        d = mdens[jj, ii]
        if d > 0.16 and rng.uniform() < min(1.0, d * 2.2):
            peaks.append([round(jx * S), round(jy * S), round(float(14 + d * 40))])
peaks.sort(key=lambda p: p[1])

# rivers, read off the layout by hand (thin lines do not survive the colour analysis)
rivers = [
    [[745, 607], [790, 601], [840, 600], [880, 595], [925, 586]],
    [[767, 787], [800, 783], [850, 778], [880, 765], [905, 752], [950, 750], [985, 748]],
    [[795, 985], [830, 978], [862, 972], [900, 960]],
    [[557, 1168], [601, 1195], [651, 1229], [668, 1240]],
    [[717, 1249], [770, 1242], [826, 1253], [857, 1240], [920, 1236], [976, 1249], [1032, 1223], [1082, 1207], [1105, 1197]],
    [[1525, 1312], [1547, 1357], [1570, 1390], [1593, 1430], [1603, 1457], [1620, 1490], [1627, 1513], [1637, 1537], [1623, 1557], [1612, 1590], [1606, 1650]],
]

# the creator's ring: the player's home
ry, rx = np.nonzero(ring)
home = None
if len(rx):
    home = {'x': round(float(rx.mean()) * S), 'y': round(float(ry.mean()) * S), 'rx': round(float(rx.max() - rx.min()) * S / 2), 'ry': round(float(ry.max() - ry.min()) * S / 2)}

PLACES = {
    'blodsetl': {'x': 875, 'y': 1100, 'name': 'BLODSETL', 'note': 'seat of the Blood-Throne', 'kind': 'seat'},
    'waeltafel': {'x': 985, 'y': 1150, 'name': 'the Wæl-Tafel', 'kind': 'arena'},
    'hwaelwic': {'x': 556, 'y': 875, 'name': 'Hwælwic', 'kind': 'town'},
    'mearcstede': {'x': 675, 'y': 1325, 'name': 'Mearcstede', 'kind': 'town'},
    'aewelm': {'x': 1525, 'y': 1311, 'name': 'Æwelm', 'kind': 'town'},
    'vane': {'x': 523, 'y': 1398, 'name': 'VANE', 'note': 'the Concord spire', 'kind': 'spire'},
    'vigilea': {'x': 312, 'y': 1431, 'name': 'Vigilea', 'kind': 'town'},
    'heofonban': {'x': 825, 'y': 248, 'name': 'Heofon-ban', 'kind': 'shard'},
    'hrimtind': {'x': 1018, 'y': 292, 'name': 'Hrimtind', 'note': '3,410 m', 'kind': 'volcano', 's': 62},
    'uncer': {'x': 1118, 'y': 690, 'name': 'Uncer', 'note': '3,120 m', 'kind': 'volcano', 's': 54},
    'uncer2': {'x': 1056, 'y': 690, 'kind': 'volcano', 's': 42},
    'blodfell': {'x': 1160, 'y': 1075, 'name': 'Blodfell', 'note': '2,780 m', 'kind': 'volcano', 's': 56},
}
# the seven halls, and the house each one is drawn for (by what it holds; names stay off screen)
HALL_HOUSES = ['beasts', 'armies', 'roads', 'laws', 'grain', 'iron', 'frontier']
HALLS = [[800, 470], [862, 698], [825, 858], [675, 1047], [900, 1258], [1350, 1245], [1475, 1022]]
ROOKERIES = [[965, 432], [980, 588], [1005, 862], [1262, 975], [1093, 1225]]
LAIRS = [[1425, 375], [1625, 650], [1350, 700]]
VILLAGES = [[650, 548], [948, 800], [700, 1198], [810, 1388], [1200, 1412], [1437, 1400]]
RAIL = [[312, 1431], [523, 1398], [700, 1420], [1000, 1455], [1300, 1480], [1600, 1500], [2000, 1515]]
ROADS = [
    [[800, 470], [818, 560], [845, 640], [862, 698], [845, 780], [825, 858], [842, 960], [860, 1040], [875, 1100]],
    [[556, 875], [600, 950], [675, 1047], [730, 1150], [772, 1225]],
    [[875, 1100], [820, 1170], [772, 1225], [700, 1300], [600, 1360], [523, 1398]],
    [[875, 1100], [935, 1128], [985, 1150]],
    [[772, 1225], [900, 1258], [1100, 1258], [1350, 1245], [1440, 1275], [1525, 1311]],
    [[1350, 1245], [1410, 1140], [1475, 1022]],
    [[523, 1398], [675, 1325], [760, 1230]],
]
LABELS = [
    {'t': 'HRIMFELD', 'x': 825, 'y': 384, 's': 30, 'sp': 14},
    {'t': 'HWÆLMEARC', 'x': 676, 'y': 710, 's': 30, 'sp': 14},
    {'t': 'BRYNEFELD', 'x': 1165, 'y': 942, 's': 30, 'sp': 14},
    {'t': 'SUÐMEARC', 'x': 1125, 'y': 1362, 's': 34, 'sp': 14},
    {'t': 'THE FERAL RANGES', 'x': 1500, 'y': 535, 's': 26, 'sp': 9, 'red': True},
    {'t': 'GRAND DUCHY', 'x': 212, 'y': 1330, 's': 17, 'sp': 5, 'faint': True},
    {'t': 'OF KORVENIA', 'x': 212, 'y': 1356, 's': 17, 'sp': 5, 'faint': True},
    {'t': 'SCORCHED CALIPHATE OF SOLFORIZ', 'x': 1125, 'y': 1556, 's': 17, 'sp': 5, 'faint': True},
    {'t': 'THE CONCORD STRIP', 'x': 1250, 'y': 1510, 's': 16, 'sp': 5, 'blue': True},
    {'t': 'THE KWIND ZAIBATSU', 'x': 1878, 'y': 800, 's': 16, 'sp': 5, 'rot': -90, 'blue': True},
]

data = {
    'source': 'Traced from the creator\'s "Blood-Throne of Aethelgard" working layout v0.2 (proposals, not canon).',
    'w': 2000, 'h': 1650,
    'coast': coast, 'lakes': lakes, 'glacier': contours(glac, 1.0, 20), 'feral': contours(feral_r, 1.2, 20),
    'lava': contours(lava_r, 0.8, 8), 'realm': realm, 'rivers': rivers, 'trees': trees, 'peaks': peaks,
    'places': PLACES, 'halls': HALLS, 'hallHouses': HALL_HOUSES, 'rookeries': ROOKERIES, 'lairs': LAIRS, 'villages': VILLAGES, 'roads': ROADS, 'rail': RAIL,
    'labels': LABELS, 'home': home,
}
with open(OUT, 'w') as f:
    f.write('// Built by tools/trace_map.py from the creator\'s map of Aethelgard (proposals, not canon). Do not edit by hand.\n')
    f.write('window.MAPDATA = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('coast', len(coast), [len(c) for c in coast][:6], 'lakes', len(lakes), 'glacier', len(data['glacier']), 'feral', len(data['feral']),
      'lava', len(data['lava']), 'realm', len(realm), [len(c) for c in realm][:4], 'rivers', len(rivers), 'trees', len(trees), 'peaks', len(peaks), 'home', home)
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
if DBG:
    for k, m in dict(sea=ms, lake=lake, glac=glac, feral=feral_r, lava=lava_r, land=land).items():
        Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(DBG, f't_{k}.png'))
