"""How the creator's world map was prepared for the film (run once; the result is embedded in film/assets/worldmap.js).

    python tools/clean_worldmap.py <map.jpg> <out.jpg> <Cinzel[wght].ttf> <preview.jpg>

With the creator's permission: the four gold rings drawn on the map are found by colour along an ellipse fitted to each and
filled in (OpenCV Telea inpainting), the clipped labels KORV(ENIA) and AETHELGARD are filled in the same way and re-lettered in
full in Cinzel, cream with a soft shadow like the map's own lettering. The preview shows each place before and after.
Needs numpy, opencv-python-headless and Pillow.
"""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
src, out, font_path, prev = sys.argv[1:5]
im = cv2.imread(src); H, W = im.shape[:2]
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# eclipse centre (dark disc in the violet sky)
box = hsv[80:180, 240:380, 2]; ys, xs = np.nonzero(box < 45)
print('eclipse centre', 240 + xs.mean(), 80 + ys.mean(), 'r~', np.sqrt(len(xs) / np.pi))

RINGS = {'korv': (344.6, 151.6), 'aeth': (919.7, 167.1), 'kwind': (316, 409), 'solf': (910, 451)}
gold = ((hsv[..., 0] >= 14) & (hsv[..., 0] <= 34) & (hsv[..., 1] > 90) & (hsv[..., 2] > 120)).astype(np.uint8)
mask = np.zeros((H, W), np.uint8)
for k, (cx, cy) in RINGS.items():
    d = np.hypot(xx - cx, yy - cy)
    ann = (gold > 0) & (d > 14) & (d < 40)
    pts = np.stack(np.nonzero(ann)[::-1], 1).astype(np.float32)
    (ex, ey), (ma, mb), ang = cv2.fitEllipse(pts)
    # keep only gold pixels close to the fitted ring, then paint the whole ring band
    wide = np.zeros((H, W), np.uint8); cv2.ellipse(wide, ((ex, ey), (ma, mb), ang), 255, 9)
    core = np.zeros((H, W), np.uint8); cv2.ellipse(core, ((ex, ey), (ma, mb), ang), 255, 2)
    # the ring's own pixels: warm, bright, inside the wide band; plus a thin core so the stroke has no gaps
    ringpx = ((wide > 0) & (gold > 0)).astype(np.uint8) * 255
    band = cv2.dilate(ringpx | core, np.ones((3, 3), np.uint8), iterations=1)
    print(k, 'ring', round(ex, 1), round(ey, 1), round(ma, 1), round(mb, 1), round(ang, 1))
    mask |= band
LABELS = {'korv': (272, 142, 330, 168), 'aeth': (888, 150, 996, 172)}
for k, (x0, y0, x1, y1) in LABELS.items():
    mask[y0:y1, x0:x1] = 255
clean = cv2.inpaint(im, mask, 3, cv2.INPAINT_TELEA)
# soften the filled areas a touch so the patch has the painting's grain rather than streaks
blur = cv2.GaussianBlur(clean, (0, 0), 0.6)
m3 = cv2.GaussianBlur(mask, (0, 0), 1.5)[..., None] / 255.0
noise = (np.random.default_rng(7).normal(0, 4.0, im.shape)).astype(np.float32)
clean = (clean * (1 - m3) + (blur + noise) * m3).clip(0, 255).astype(np.uint8)

# re-letter the two names in Cinzel, cream with a dark soft shadow, like the map's own labels
pil = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)).convert('RGBA')
def letter(text, cx, base, cap, spacing, tint):
    f = ImageFont.truetype(font_path, 40)
    try: f.set_variation_by_axes([620])
    except Exception as e: print('no variation', e)
    # scale so the cap height is `cap` px
    bb = f.getbbox('H'); size = 40 * cap / (bb[3] - bb[1]); f = ImageFont.truetype(font_path, round(size * 4))
    try: f.set_variation_by_axes([620])
    except Exception: pass
    ws = [f.getlength(c) for c in text]; total = sum(ws) + spacing * 4 * (len(text) - 1)
    lay = Image.new('L', (int(total) + 40, int(size * 8)), 0); dr = ImageDraw.Draw(lay)
    x = 20; asc = f.getbbox('H')[1]
    for c, w in zip(text, ws):
        dr.text((x, size * 4 - asc - (f.getbbox('H')[3] - asc) + size * 0), c, font=f, fill=255); x += w + spacing * 4
    lay = lay.resize((lay.width // 4, lay.height // 4), Image.LANCZOS)
    ys = np.nonzero(np.asarray(lay).max(1) > 40)[0]; bottom = ys.max()
    ox, oy = int(round(cx - lay.width / 2)), int(round(base - bottom))
    sh = lay.filter(ImageFilter.GaussianBlur(1.6)); a = np.asarray(sh, np.float32) / 255
    region = np.asarray(pil, np.float32)
    def comp(alpha, rgb, dx, dy):
        h, w = alpha.shape; X0, Y0 = ox + dx, oy + dy
        sub = region[Y0:Y0 + h, X0:X0 + w, :3]
        sub[:] = sub * (1 - alpha[..., None]) + np.array(rgb, np.float32) * alpha[..., None]
    comp(np.clip(a * 1.4, 0, 0.85), (12, 8, 10), 1, 1)
    bg = region[oy:oy + lay.height, ox:ox + lay.width, :3].mean((0, 1))
    col = np.array(tint, np.float32) * 0.66 + bg * 0.34
    comp(np.asarray(lay, np.float32) / 255, col, 0, 0)
    pil.paste(Image.fromarray(region.clip(0, 255).astype(np.uint8)))
    print(text, 'at', ox, oy, lay.size)
letter('KORVENIA', 293, 164, 10.5, 1.1, (214, 172, 200))
letter('AETHELGARD', 942, 165, 10, 0.9, (206, 182, 152))
res = cv2.cvtColor(np.asarray(pil.convert('RGB')), cv2.COLOR_RGB2BGR)
cv2.imwrite(out, res, [cv2.IMWRITE_JPEG_QUALITY, 92])
# preview: before/after crops at 3x
crops = [(250, 100, 410, 200), (860, 120, 1020, 210), (250, 360, 390, 460), (850, 400, 980, 500)]
rows = []
for (x0, y0, x1, y1) in crops:
    a = cv2.resize(im[y0:y1, x0:x1], None, fx=3, fy=3, interpolation=cv2.INTER_LANCZOS4)
    b = cv2.resize(res[y0:y1, x0:x1], None, fx=3, fy=3, interpolation=cv2.INTER_LANCZOS4)
    pad = np.zeros((a.shape[0], 10, 3), np.uint8)
    row = np.hstack([a, pad, b]); rows.append(cv2.copyMakeBorder(row, 0, 10, 0, 1000 - row.shape[1] if row.shape[1] < 1000 else 0, cv2.BORDER_CONSTANT))
wmax = max(r.shape[1] for r in rows); rows = [cv2.copyMakeBorder(r, 0, 0, 0, wmax - r.shape[1], cv2.BORDER_CONSTANT) for r in rows]
cv2.imwrite(prev, np.vstack(rows))
