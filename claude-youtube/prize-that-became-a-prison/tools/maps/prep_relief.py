"""The route map's land relief: the shading alone, taken from a public-domain shaded-relief raster.

    python3 -I prep_relief.py <shadedrelief.jpg> <out.jpg> [px_per_deg]

Source: Natural Earth I shaded relief by Tom Patterson (shadedrelief.com, public domain), 10800 x 5400 plate carree,
as shipped in basemap-data 2.0.0 (mpl_toolkits/basemap_data/shadedrelief.jpg). It is a colour image: hypsometric tints
(green lowland, tan upland, white high ground) with a hillshade lit from the north-west. Only the hillshade is kept: its
lightness over a land-only Gaussian blur of itself (SIGMA deg), as a log ratio, so the tints (which change slowly) fall
out and only the slopes' light and shade remain; flat ground and water come out neutral. Nothing is invented: every
mark is a real slope of the source.

Output: one grey image over the route map's window (36E-300E, 40S-84N, the land's wrap: west of 30W gets +360), plate
carree at px_per_deg (default 12), where 128 is neutral, lighter is a lit slope and darker a shaded one (GAIN grey
levels per unit of log ratio). The page lays it over the land with soft-light at low alpha.
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
LON0, LON1, LAT0, LAT1 = 36, 300, -40, 84
WORK = 15            # px/deg to work at (the source is 30)
SIGMA = 0.3          # deg: the blur that carries the tints
GAIN = 200


def blur(a, s):
    """Gaussian blur by three box passes on each axis (s in px)."""
    r = max(1, int(round((np.sqrt(12 * s * s / 3 + 1) - 1) / 2)))
    for ax in (0, 1):
        for _ in range(3):
            c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
            hi = np.take(c, np.arange(2 * r + 1, c.shape[ax]), axis=ax)
            lo = np.take(c, np.arange(0, c.shape[ax] - 2 * r - 1), axis=ax)
            a = (hi - lo) / (2 * r + 1)
    return a


src = Image.open(sys.argv[1]).convert('RGB')
S = src.size[0] / 360
# the window, wrapped: 36E..180E, then 180W..60W (= 180E..300E)
y0, y1 = int((90 - LAT1) * S), int((90 - LAT0) * S)
east = src.crop((int((LON0 + 180) * S), y0, src.size[0], y1))
west = src.crop((0, y0, int((LON1 - 360 + 180) * S), y1))
win = Image.new('RGB', (east.size[0] + west.size[0], y1 - y0))
win.paste(east, (0, 0)); win.paste(west, (east.size[0], 0))
win = win.resize((int((LON1 - LON0) * WORK), int((LAT1 - LAT0) * WORK)), Image.BOX)
a = np.asarray(win, dtype=np.float32) / 255
R, G, B = a[..., 0], a[..., 1], a[..., 2]
Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
water = (B - R > 0.06) & (B >= G - 0.01)          # the source's sea and lakes: blue over red, not under green
land = (~water).astype(np.float32)
s = SIGMA * WORK
base = blur(Y * land, s) / np.maximum(blur(land, s), 1e-3)
d = np.log(np.maximum(Y, 1e-3) / np.maximum(base, 1e-3)) * land
# keep a coast from ringing: fade the detail in over the first ~2 work px inland
d *= np.clip((blur(land, 1.5) - 0.5) * 2, 0, 1)
print('detail p1/p50/p99', np.percentile(d[land > 0], [1, 50, 99]).round(3))
ppd = float(sys.argv[3]) if len(sys.argv) > 3 else 12
v = np.clip(128 + GAIN * d, 0, 255).astype(np.uint8)
out = Image.fromarray(v, 'L').resize((int((LON1 - LON0) * ppd), int((LAT1 - LAT0) * ppd)), Image.LANCZOS)
out.save(sys.argv[2], quality=82, optimize=True)
print(out.size, 'grey', np.percentile(np.asarray(out), [1, 5, 50, 95, 99]))
