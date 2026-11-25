#!/usr/bin/env python3
"""Put the script's share menu on Helena's handset in Q10 and remove the generator's black hole under her thumb.

    /home/user/ocio/.venv/bin/python tools/handset_insert.py [--track] [--proof out/review/handset_proof.png]

Q10_t1's two handset shots (take frames 52-145 and 259-284) came back with a blank grey display and a pure-black,
thumb-shaped hole (RGB 0,0,0) where the thumb meets the glass. The script wants "A share menu. Three folders:
NOTICES. APPOINTMENTS. RECORDINGS. Her thumb hovers. She ticks two." and then "She presses send."

1. Track: the display's corners are measured once on take frame 53, the one frame where all four are visible; every
   other frame is aligned to it with an affine ECC warp (OpenCV findTransformECC) masked to what the thumb never
   covers: the cracked top of the glass and the left bezel. (A full homography fitted to those two regions let the
   hidden bottom corners wobble 10-15 px at frames 85-88; the phone is far enough away for affine to hold.) The second shot starts from template matching on the
   crack. Corners are cached in edits/handset_track.json (--track re-measures them).
2. Composite: tools/handset_ui.py draws the menu flat; it is warped onto the display, dimmed to a screen's level
   under an overcast sky, softened to the footage's sharpness, and the glass's own cracks and reflection are added
   back on top. Skin (her thumb) stays in front, with a soft contact shadow. Where the black hole spills past the
   display onto the bezel it is inpainted.
3. Writes out/takes/Q10_t1_menu.mp4 (every other frame passes through; the take's sound is copied unchanged).
"""
import json, os, subprocess, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, 'tools'))
from handset_ui import ui, W as UW, H as UH

TAKE, OUT = 'out/takes/Q10_t1.mp4', 'out/takes/Q10_t1_menu.mp4'
TRACK = 'edits/handset_track.json'
SHOTS = [(52, 145), (259, 284)]
REF = 53
P0 = np.float32([[153, 136], [332, 38], [533, 348], [367, 438]])   # display tl, tr, br, bl on frame 53
# what the screen shows, by take frame. The thumb tip, read from the take (--proof logs it as display height v):
# rests at v 0.50-0.53 (the NOTICES row) to frame 70, drops through 0.59-0.66 (APPOINTMENTS) at 76-80, hovers at
# 0.70-0.77 (RECORDINGS) from 82 and again at 118-124, and never presses it. In the second shot it reaches 0.82
# (Send) at frame 268 and lifts away from 271.
TIMELINE = [(52, (), 'off', None), (59, (), 'off', 0), (62, (0,), 'on', None), (77, (0,), 'on', 1),
            (80, (0, 1), 'on', None), (259, (0, 1), 'on', None), (267, (0, 1), 'pressed', None),
            (271, (0, 1), 'sent', None)]
SCREEN_LEVEL = 0.80      # the menu's white, relative to full scale: a lit screen, not a light box
SOFT = 0.7               # px of blur: the take's sharpness at 854x480


def frames():
    cap = cv2.VideoCapture(os.path.join(HERE, TAKE))
    out = []
    while True:
        ok, f = cap.read()
        if not ok:
            return out
        out.append(f)


def track(F):
    gray = lambda f: cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (3, 3), 0).astype(np.float32)
    U = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), P0)

    def poly(u0, v0, u1, v1):
        q = np.float32([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]).reshape(-1, 1, 2)
        return cv2.perspectiveTransform(q, U).reshape(-1, 2).astype(np.int32)
    mask = np.zeros(F[0].shape[:2], np.uint8)
    cv2.fillPoly(mask, [poly(-0.12, -0.16, 1.12, 0.33)], 255)      # the cracked top of the glass
    cv2.fillPoly(mask, [poly(-0.10, 0.33, 0.18, 1.06)], 255)       # the left bezel
    T = gray(F[REF])
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)

    def ecc(W, i):
        for sc in (0.5, 1.0):                                       # coarse to fine
            Ws = W.copy(); Ws[:, 2] *= sc
            _, Ws = cv2.findTransformECC(cv2.resize(T, None, fx=sc, fy=sc), cv2.resize(gray(F[i]), None, fx=sc, fy=sc),
                                         Ws, cv2.MOTION_AFFINE, crit, cv2.resize(mask, None, fx=sc, fy=sc), 5)
            W = Ws.copy(); W[:, 2] /= sc
        return W
    quads = {}
    for a, b in SHOTS:
        seed = np.eye(2, 3, dtype=np.float32)
        if a <= REF <= b:
            order = list(range(REF, b + 1)) + list(range(REF - 1, a - 1, -1))
        else:
            order = list(range(a, b + 1))
            tpl = F[REF][0:200, 110:360]                            # the crack, to place the phone in a new shot
            _, _, _, loc = cv2.minMaxLoc(cv2.matchTemplate(F[a], tpl, cv2.TM_CCOEFF_NORMED))
            seed[0, 2], seed[1, 2] = loc[0] - 110, loc[1]
        Hs = {}
        for i in order:
            init = Hs.get(i - 1, Hs.get(i + 1, seed))
            Hs[i] = np.eye(2, 3, dtype=np.float32) if i == REF else ecc(init, i)
        q = np.array([cv2.transform(P0.reshape(-1, 1, 2), Hs[i]).reshape(-1, 2) for i in range(a, b + 1)])
        k = np.array([1, 2, 1], np.float32) / 4                     # a light 3-frame smoothing of each corner
        sm = q.copy()
        sm[1:-1] = k[0] * q[:-2] + k[1] * q[1:-1] + k[2] * q[2:]
        for j, i in enumerate(range(a, b + 1)):
            quads[str(i)] = sm[j].round(3).tolist()
    return quads


def state(i):
    s = TIMELINE[0]
    for t in TIMELINE:
        if i >= t[0]:
            s = t
    return s[1:]


def composite(f, quad, st, info=None):
    h, w = f.shape[:2]
    img = f[..., ::-1].astype(np.float32) / 255                     # RGB, 0..1
    q = np.float32(quad)
    S = 2                                                            # draw at twice the display's size, then warp down
    src = np.float32([[0, 0], [UW, 0], [UW, UH], [0, UH]])
    M = cv2.getPerspectiveTransform(src, q)
    menu = ui(*st) * SCREEN_LEVEL
    menu = cv2.warpPerspective(menu, M, (w, h), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT)
    big = cv2.getPerspectiveTransform(src, q * S)
    a = cv2.warpPerspective(np.ones((UH, UW), np.float32), big, (w * S, h * S), flags=cv2.INTER_LINEAR)
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)          # anti-aliased display edge
    menu = cv2.GaussianBlur(menu, (0, 0), SOFT)
    # the glass: its cracks (fine detail) and reflection (broad shading) carry over the menu
    # her thumb stays in front: skin by hue, softened by a pixel
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    skin = (((hsv[..., 0] <= 25) | (hsv[..., 0] >= 165)) & (hsv[..., 1] >= 35) & (hsv[..., 2] >= 70)).astype(np.uint8)
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # measured on the bare glass only: the hole and the thumb are filled with the glass's level first, and the fine
    # detail is dropped near their edges, so neither leaves a ghost on the menu
    grey = img.mean(2)
    inside = cv2.erode((a > 0.99).astype(np.uint8), np.ones((5, 5), np.uint8))
    away = cv2.dilate(((f.max(2) < 60) | (skin > 0)).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=8)
    glass = (inside > 0) & (away == 0)
    ref_lvl = np.median(grey[glass]) if glass.any() else 0.5
    clean = np.where(glass, grey, ref_lvl)
    detail = np.where(glass, clean - cv2.GaussianBlur(clean, (0, 0), 1.6), 0)
    refl = cv2.GaussianBlur(clean, (0, 0), 25) - ref_lvl
    menu = menu + (detail * 1.1 + refl * 0.6)[..., None]
    skin_s = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), 0.8)
    # a soft contact shadow under the thumb, cast down and left (the light is high, soft and behind her)
    sh = cv2.GaussianBlur(np.roll(np.roll(skin.astype(np.float32), 5, 0), -3, 1), (0, 0), 6)
    menu = menu * (1 - 0.35 * sh[..., None] * (1 - skin_s[..., None]))
    alpha = (a * (1 - skin_s))[..., None]
    out = img * (1 - alpha) + np.clip(menu, 0, 1) * alpha
    # the black hole where it spills past the display, onto the bezel: inpaint it from around
    hole = ((f.max(2) < 22) & (a < 0.5)).astype(np.uint8)
    near = cv2.dilate((a > 0).astype(np.uint8), np.ones((61, 61), np.uint8))
    hole = cv2.dilate(hole * near, np.ones((3, 3), np.uint8), iterations=2)
    u8 = (np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)
    if hole.any():
        u8 = cv2.inpaint(u8, hole, 6, cv2.INPAINT_TELEA)
    if info is not None:                                             # where the thumb tip is on the display (u, v)
        ys, xs = np.nonzero(skin & (a > 0.5))
        if len(xs):
            uv = cv2.perspectiveTransform(np.float32(np.c_[xs, ys]).reshape(-1, 1, 2), np.linalg.inv(M)).reshape(-1, 2)
            uv /= (UW, UH)
            j = np.argmin(uv[:, 0])
            info.append(uv[j].round(2).tolist())
        else:
            info.append(None)
    return u8[..., ::-1]


def main():
    F = frames()
    path = os.path.join(HERE, TRACK)
    if '--track' in sys.argv or not os.path.exists(path):
        json.dump(track(F), open(path, 'w'), indent=0)
    Q = json.load(open(path))
    tips = {}
    for a, b in SHOTS:
        for i in range(a, b + 1):
            info = []
            F[i] = composite(F[i], Q[str(i)], state(i), info)
            tips[i] = info[0]
    if '--proof' in sys.argv:
        pick = [55, 63, 81, 100, 122, 262, 268, 278]
        tiles = [cv2.resize(F[i], (427, 240), interpolation=cv2.INTER_AREA) for i in pick]
        cv2.imwrite(os.path.join(HERE, sys.argv[sys.argv.index('--proof') + 1]),
                    np.vstack([np.hstack(tiles[:4]), np.hstack(tiles[4:])]))
        print('thumb tip (u, v) on the display by frame:', {i: tips[i] for i in range(52, 146, 6)},
              {i: tips[i] for i in range(259, 285, 3)})
    h, w = F[0].shape[:2]
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}',
                            '-r', '24', '-i', '-', '-i', os.path.join(HERE, TAKE), '-map', '0:v', '-map', '1:a',
                            '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                            '-profile:v', 'high', '-c:a', 'copy', '-movflags', '+faststart',
                            os.path.join(HERE, OUT)], stdin=subprocess.PIPE)
    for f in F:
        enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close()
    enc.wait()
    print('wrote', OUT, len(F), 'frames')


if __name__ == '__main__':
    main()
