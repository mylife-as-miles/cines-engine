#!/usr/bin/env python3
"""Put a handset screen built in code onto a generated take's blank display, and clean up the generator's dark
ghost under the finger:

    /home/user/ocio/.venv/bin/python tools/handset_insert.py edits/screen_Q10.json [--track] [--proof out.png]

Asked for a handset, the video model gives a blank grey display, and where a finger meets the glass it can leave a
dark, finger-shaped ghost (Q10: pure black, RGB 0,0,0; Q01: dark grey). Screens are never generated (lesson 55): the
script's screen is drawn by tools/handset_ui.py and composited here. The config names the take, the shots (first and
last take frame), the screen (a function of handset_ui.py, with its state by take frame) and how to track the phone.

1. Track: the display's corners are measured once on a reference frame where all four are visible ("display": tl, tr,
   br, bl); every other frame of the shot is aligned to it with an affine ECC warp (OpenCV findTransformECC), masked
   to what the fingers never cover ("ecc_mask": rectangles in display coordinates, u and v from 0 to 1 across the
   display, beyond it for the bezel). A full homography fitted to those regions let the hidden corners wobble 10-15 px
   (Q10, frames 85-88); the phone is far enough away for affine to hold. A shot without the reference frame starts
   from template matching on "seed_template" (x0, y0, x1, y1 on the reference frame: the crack). Corners are cached
   in the config's "track" file (--track re-measures them).
2. Composite: the screen is warped onto the display, set to a screen's level ("screen_level", its white against full
   scale), softened to the footage ("soft", px), and the glass's own cracks and reflection are added back, measured
   on bare glass only, so the ghost and the finger leave no trace on it ("ghost_rel": also treat as ghost anything on
   the display darker than this fraction of the glass, for a translucent grey one). Skin stays in front, with a soft contact
   shadow ("shadow": dy, dx, strength; "skin_rel": skin must be this bright against the median skin, so the dark,
   reddish rim where a grey ghost meets the finger is not kept as finger). A pure-black ghost spilling past the display onto the bezel is inpainted.
3. Writes the config's "out": every other frame passes through, the take's sound is copied unchanged. An .mkv out is
   lossless (FFV1), for a take that another pass (tools/window_decals.py) works on next.
--proof writes a sheet of the config's "proof" frames and logs where the finger tip is on the display, by frame
("tip": the skin point farthest in from the side the finger enters, "min_u" for a thumb from the right, "max_u" for
a finger from the left), to time the screen's changes to the hand.
"""
import json, os, subprocess, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, 'tools'))
import handset_ui


def frames(path):
    cap = cv2.VideoCapture(os.path.join(HERE, path))
    out = []
    while True:
        ok, f = cap.read()
        if not ok:
            return out
        out.append(f)


def track(F, C):
    P0 = np.float32(C['display'])
    gray = lambda f: cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (3, 3), 0).astype(np.float32)
    U = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), P0)

    def poly(u0, v0, u1, v1):
        q = np.float32([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]).reshape(-1, 1, 2)
        return cv2.perspectiveTransform(q, U).reshape(-1, 2).astype(np.int32)
    mask = np.zeros(F[0].shape[:2], np.uint8)
    for r in C['ecc_mask']:
        cv2.fillPoly(mask, [poly(*r)], 255)
    REF = C['ref']
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
    for a, b in C['shots']:
        seed = np.eye(2, 3, dtype=np.float32)
        if a <= REF <= b:
            order = list(range(REF, b + 1)) + list(range(REF - 1, a - 1, -1))
        else:
            order = list(range(a, b + 1))
            x0, y0, x1, y1 = C['seed_template']                      # the crack, to place the phone in a new shot
            _, _, _, loc = cv2.minMaxLoc(cv2.matchTemplate(F[a], F[REF][y0:y1, x0:x1], cv2.TM_CCOEFF_NORMED))
            seed[0, 2], seed[1, 2] = loc[0] - x0, loc[1] - y0
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


def state(C, i):
    s = C['timeline'][0][1]
    for t, st in C['timeline']:
        if i >= t:
            s = st
    return s


def composite(f, quad, screen, C, info=None):
    h, w = f.shape[:2]
    UH, UW = screen.shape[:2]
    img = f[..., ::-1].astype(np.float32) / 255                     # RGB, 0..1
    q = np.float32(quad)
    S = 2                                                            # the display's edge drawn at twice the size
    src = np.float32([[0, 0], [UW, 0], [UW, UH], [0, UH]])
    M = cv2.getPerspectiveTransform(src, q)
    menu = screen * C.get('screen_level', 0.8)
    menu = cv2.warpPerspective(menu, M, (w, h), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT)
    big = cv2.getPerspectiveTransform(src, q * S)
    a = cv2.warpPerspective(np.ones((UH, UW), np.float32), big, (w * S, h * S), flags=cv2.INTER_LINEAR)
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)          # anti-aliased display edge
    menu = cv2.GaussianBlur(menu, (0, 0), C.get('soft', 0.7))
    # skin (the finger, the thumb) stays in front, by hue, softened by a pixel
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    skin = (((hsv[..., 0] <= 25) | (hsv[..., 0] >= 165)) & (hsv[..., 1] >= 35) & (hsv[..., 2] >= 70)).astype(np.uint8)
    if C.get('skin_rel') and skin.any():                             # the ghost's edge against a finger is dark but red:
        v = hsv[..., 2]                                               # not skin unless near the skin's own brightness
        skin &= (v > C['skin_rel'] * np.median(v[skin > 0])).astype(np.uint8)
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # the glass's cracks (fine detail) and reflection (broad shading) carry over the screen, measured on the bare glass
    # only: the ghost and the finger are filled with the glass's level first, and the fine detail is dropped near
    # their edges, so neither leaves a trace
    grey = img.mean(2)
    inside = cv2.erode((a > 0.99).astype(np.uint8), np.ones((5, 5), np.uint8))
    ghost = f.max(2) < C.get('ghost_below', 60)                      # a pure-black ghost (Q10)
    if C.get('ghost_rel') and inside.any():                          # a translucent grey one (Q01): darker than the glass
        lvl = np.median(grey[(inside > 0) & (skin == 0)])
        ghost |= (inside > 0) & (grey < lvl * C['ghost_rel'])
    away = cv2.dilate((ghost | (skin > 0)).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=8)
    glass = (inside > 0) & (away == 0)
    ref_lvl = np.median(grey[glass]) if glass.any() else 0.5
    clean = np.where(glass, grey, ref_lvl)
    detail = np.where(glass, clean - cv2.GaussianBlur(clean, (0, 0), 1.6), 0)
    refl = cv2.GaussianBlur(clean, (0, 0), 25) - ref_lvl
    menu = menu + (detail * 1.1 + refl * 0.6)[..., None]
    skin_s = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), 0.8)
    dy, dx, k = C.get('shadow', [5, -3, 0.35])                       # a soft contact shadow under the finger
    sh = cv2.GaussianBlur(np.roll(np.roll(skin.astype(np.float32), dy, 0), dx, 1), (0, 0), 6)
    menu = menu * (1 - k * sh[..., None] * (1 - skin_s[..., None]))
    alpha = (a * (1 - skin_s))[..., None]
    out = img * (1 - alpha) + np.clip(menu, 0, 1) * alpha
    # a pure-black ghost where it spills past the display, onto the bezel: inpaint it from around
    hole = ((f.max(2) < 22) & (a < 0.5)).astype(np.uint8)
    near = cv2.dilate((a > 0).astype(np.uint8), np.ones((61, 61), np.uint8))
    hole = cv2.dilate(hole * near, np.ones((3, 3), np.uint8), iterations=2)
    u8 = (np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)
    if hole.any():
        u8 = cv2.inpaint(u8, hole, 6, cv2.INPAINT_TELEA)
    if info is not None:                                             # where the finger tip is on the display (u, v)
        ys, xs = np.nonzero(skin & (a > 0.5))
        if len(xs):
            uv = cv2.perspectiveTransform(np.float32(np.c_[xs, ys]).reshape(-1, 1, 2), np.linalg.inv(M)).reshape(-1, 2)
            uv /= (UW, UH)
            j = np.argmin(uv[:, 0]) if C.get('tip', 'min_u') == 'min_u' else np.argmax(uv[:, 0])
            info.append(uv[j].round(2).tolist())
        else:
            info.append(None)
    return u8[..., ::-1]


def write(F, C):
    h, w = F[0].shape[:2]
    out = os.path.join(HERE, C['out'])
    codec = (['-c:v', 'ffv1', '-level', '3'] if out.endswith('.mkv') else
             ['-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
              '-movflags', '+faststart'])
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}',
                            '-r', '24', '-i', '-', '-i', os.path.join(HERE, C['take']), '-map', '0:v', '-map', '1:a']
                           + codec + ['-c:a', 'copy', out], stdin=subprocess.PIPE)
    for f in F:
        enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close()
    enc.wait()
    print('wrote', C['out'], len(F), 'frames')


def main():
    C = json.load(open(os.path.join(HERE, sys.argv[1])))
    draw = getattr(handset_ui, C['ui'])
    F = frames(C['take'])
    path = os.path.join(HERE, C['track'])
    if '--track' in sys.argv or not os.path.exists(path):
        json.dump(track(F, C), open(path, 'w'), indent=0)
    Q = json.load(open(path))
    tips, cache = {}, {}
    for a, b in C['shots']:
        for i in range(a, b + 1):
            st = state(C, i)
            key = json.dumps(st, sort_keys=True)
            if key not in cache:
                cache[key] = draw(**st)
            info = []
            F[i] = composite(F[i], Q[str(i)], cache[key], C, info)
            tips[i] = info[0]
    if '--proof' in sys.argv:
        pick = C['proof']
        tiles = [cv2.resize(F[i], (427, 240), interpolation=cv2.INTER_AREA) for i in pick]
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(os.path.join(HERE, sys.argv[sys.argv.index('--proof') + 1]),
                    np.vstack([np.hstack(tiles[r:r + 4]) for r in range(0, len(tiles), 4)]))
        for a, b in C['shots']:
            print('finger tip (u, v) on the display by frame:', {i: tips[i] for i in range(a, b + 1, 3)})
    write(F, C)


if __name__ == '__main__':
    main()
