"""Natural Earth 1:50m lakes (public domain) for the route map, at the land's own detail.

    python3 -I prep_lakes.py <ne_50m_lakes.geojson> <ne_50m_land.geojson> design/gfx/lakes_pacific.json

Same wrap and rounding as tools/prep_land.py (longitudes west of 30W get +360; 0.01 deg inside FINE, 0.05 deg
elsewhere; consecutive duplicates dropped, rings under 4 points dropped). Kept: NE's small-scale lakes (min_zoom <= 2,
the set NE shows on a world map) whose rounded area is at least MIN_AREA square degrees, inside the window every map
frame can show, plus the Caspian Sea, which NE keeps as the one hole in its land polygons (prep_land.py keeps outer
rings only, so without it the Caspian is drawn as land). Each lake is [outer ring, island rings...].
"""
import json, sys
LON0, LON1, LAT0, LAT1 = 36, 300, -40, 84      # every frame of the three modes lies inside 37E-300E
FINE = (60, 150, 0, 60)
MIN_ZOOM, MIN_AREA = 2, 0.25


def wrap(lon):
    return lon + 360 if lon < -30 else lon


def rnd(lon, lat):
    fine = FINE[0] <= lon <= FINE[1] and FINE[2] <= lat <= FINE[3]
    q = 100 if fine else 20
    return (round(lon * q) / q, round(lat * q) / q)


def ring_pts(ring):
    pts, last = [], None
    for lon, lat in ring:
        p = rnd(wrap(lon), lat)
        if p != last:
            pts.append(p); last = p
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    return pts if len(pts) >= 4 else None


def area(pts):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def polys(geom):
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


flat = lambda pts: [c for p in pts for c in p]
out = []


def add(name, poly):
    outer = ring_pts(poly[0])
    if not outer or area(outer) < MIN_AREA:
        return
    xs = [p[0] for p in outer]; ys = [p[1] for p in outer]
    if max(xs) - min(xs) > 300 or max(xs) < LON0 or min(xs) > LON1 or max(ys) < LAT0 or min(ys) > LAT1:
        return
    holes = [h for h in (ring_pts(r) for r in poly[1:]) if h]
    out.append({"name": name, "rings": [flat(outer)] + [flat(h) for h in holes]})


for f in json.load(open(sys.argv[1]))["features"]:
    p = f["properties"]
    if p.get("min_zoom", 99) > MIN_ZOOM:
        continue
    for poly in polys(f["geometry"]):
        add(p.get("name") or "", poly)
for f in json.load(open(sys.argv[2]))["features"]:
    for poly in polys(f["geometry"]):
        for hole in poly[1:]:
            add("Caspian Sea", [hole])
json.dump({"source": "Natural Earth 1:50m lakes (public domain), min_zoom <= 2 and at least 0.25 sq deg after rounding, "
                     "plus the Caspian Sea (the hole in Natural Earth 1:50m land); the land's wrap (west of 30W +360) and "
                     "rounding (0.01 deg in 60-150E 0-60N, 0.05 deg elsewhere); each lake is [outer ring, island rings...] "
                     "as flat lon,lat lists",
           "window": [LON0, LON1, LAT0, LAT1], "lakes": out}, open(sys.argv[3], "w"), separators=(",", ":"))
for l in out:
    print(l["name"], len(l["rings"][0]) // 2, "pts", len(l["rings"]) - 1, "islands")
print(len(out), "lakes,", sum(len(r) // 2 for l in out for r in l["rings"]), "points")
