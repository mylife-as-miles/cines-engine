"""Crop Natural Earth 1:50m land (public domain) to the Pacific half used by the route map.

    python3 tools/prep_land.py <ne_50m_land.geojson> design/gfx/land_pacific.json

Longitudes west of 30W get +360 (the wrap is in the Atlantic), so Chicago (-87.6) sits east of Sydney (151.2); points are rounded
to 0.05 degrees and rings with fewer than 4 points after that are dropped.
"""
import json, sys
LON0, LON1, LAT0, LAT1 = 80, 292, -50, 84
src, dst = sys.argv[1], sys.argv[2]
out = []
for f in json.load(open(src))["features"]:
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        ring = poly[0]
        pts, last = [], None
        for lon, lat in ring:
            lon = lon + 360 if lon < -30 else lon  # wrap in the Atlantic: the Americas move east of Asia
            p = (round(lon * 20) / 20, round(lat * 20) / 20)
            if p != last:
                pts.append(p); last = p
        if len(pts) < 4:
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        # rings that straddle 0/360 after unwrapping (Africa, Europe) are outside the window anyway
        if max(xs) - min(xs) > 300 or max(xs) < LON0 or min(xs) > LON1 or max(ys) < LAT0 or min(ys) > LAT1:
            continue
        out.append([c for p in pts for c in p])
json.dump({"window": [LON0, LON1, LAT0, LAT1], "rings": out}, open(dst, "w"), separators=(",", ":"))
print(len(out), "rings")
