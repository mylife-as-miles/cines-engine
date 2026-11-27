"""Crop Natural Earth 1:50m land (public domain) to the Pacific half used by the route map, and cut its lit regions.

    python3 tools/prep_land.py <ne_50m_land.geojson> design/gfx/land_pacific.json \
        [<ne_50m_admin_0_countries.geojson> design/gfx/regions.json]

Longitudes west of 30W get +360 (the wrap is in the Atlantic), so Chicago (-87.6) sits east of Sydney (151.2). Points
are rounded to 0.01 degrees inside FINE, the part of Asia the mainland's 2.5x push shows (about 0.2 px a step there),
and to 0.05 degrees elsewhere; rings with fewer than 4 points after that are dropped.

regions.json: the outer ring of each country's largest polygon (mainland China excludes Taiwan, Hong Kong and Macau,
which are separate features), rounded to 0.01 degrees, with `border`: the runs of that ring which are not coastline
(more than 0.02 degrees from the land's coast), so a region strokes only its land frontier and its coast is drawn once,
by the land outline.
"""
import json, math, sys
LON0, LON1, LAT0, LAT1 = 80, 292, -50, 84
FINE = (60, 150, 0, 60)          # lon0, lon1, lat0, lat1 at 0.01 deg
REGIONS = ("CHN", "AUS")
COAST_TOL = 0.02


def wrap(lon):
    return lon + 360 if lon < -30 else lon  # wrap in the Atlantic: the Americas move east of Asia


def rnd(lon, lat):
    fine = FINE[0] <= lon <= FINE[1] and FINE[2] <= lat <= FINE[3]
    q = 100 if fine else 20
    return (round(lon * q) / q, round(lat * q) / q)


def outer_rings(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [p[0] for p in polys]


land_src = json.load(open(sys.argv[1]))
out = []
for f in land_src["features"]:
    for ring in outer_rings(f["geometry"]):
        pts, last = [], None
        for lon, lat in ring:
            p = rnd(wrap(lon), lat)
            if p != last:
                pts.append(p); last = p
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts.pop()
        if len(pts) < 4:
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        # rings that straddle 0/360 after unwrapping (Africa, Europe) are outside the window anyway
        if max(xs) - min(xs) > 300 or max(xs) < LON0 or min(xs) > LON1 or max(ys) < LAT0 or min(ys) > LAT1:
            continue
        out.append([c for p in pts for c in p])
json.dump({"window": [LON0, LON1, LAT0, LAT1], "rings": out}, open(sys.argv[2], "w"), separators=(",", ":"))
print(len(out), "rings,", sum(len(r) // 2 for r in out), "points")

if len(sys.argv) < 5:
    sys.exit()

# the land's coast as segments in a 0.1 degree grid, to tell a region's coast from its land frontier
CELL = 0.1
grid = {}
for f in land_src["features"]:
    for ring in outer_rings(f["geometry"]):
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            for gx in range(math.floor(min(x1, x2) / CELL) - 1, math.floor(max(x1, x2) / CELL) + 2):
                for gy in range(math.floor(min(y1, y2) / CELL) - 1, math.floor(max(y1, y2) / CELL) + 2):
                    grid.setdefault((gx, gy), []).append((x1, y1, x2, y2))


def on_coast(x, y):
    best = 1e9
    for x1, y1, x2, y2 in grid.get((math.floor(x / CELL), math.floor(y / CELL)), ()):
        dx, dy = x2 - x1, y2 - y1; L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / L))
        best = min(best, math.hypot(x1 + t * dx - x, y1 + t * dy - y))
    return best < COAST_TOL


def centroid(ring):
    a = cx = cy = 0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1; a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    return [round(cy / (3 * a), 2), round(cx / (3 * a), 2)]   # [lat, lon]


regions = {}
for f in json.load(open(sys.argv[3]))["features"]:
    code = f["properties"].get("ADM0_A3")
    if code not in REGIONS:
        continue
    src = max(outer_rings(f["geometry"]), key=len)
    if src[0] == src[-1]:
        src = src[:-1]
    n = len(src)
    coast_v = [on_coast(x, y) for x, y in src]
    # a segment is coast when both ends and its middle lie on the land's coast
    coast_s = [coast_v[i] and coast_v[(i + 1) % n] and on_coast((src[i][0] + src[(i + 1) % n][0]) / 2, (src[i][1] + src[(i + 1) % n][1]) / 2)
               for i in range(n)]
    border = []
    if not all(coast_s):
        start = next(i for i in range(n) if coast_s[i])     # walk the ring from a coast segment, collecting frontier runs
        run = None
        for k in range(1, n + 1):
            i = (start + k) % n
            if not coast_s[i]:
                run = run or [src[i]]
                run.append(src[(i + 1) % n])
            elif run:
                border.append(run); run = None
        if run:
            border.append(run)
    flat = lambda pts: [c for x, y in pts for c in (round(wrap(x), 2), round(y, 2))]
    regions[code] = {"ring": flat(src), "centroid": centroid([(wrap(x), y) for x, y in src]), "border": [flat(r) for r in border]}
    print(code, n, "points,", len(border), "frontier runs,", sum(len(r) for r in border), "frontier points")
json.dump({"source": "Natural Earth 1:50m admin 0 countries (public domain): the outer ring of each country's largest polygon "
                     "(mainland China excludes Taiwan, Hong Kong and Macau, which are separate features), at 0.01 deg; border "
                     "holds the ring's runs that are not coastline (its land frontier)", "regions": regions},
          open(sys.argv[4], "w"), separators=(",", ":"))
