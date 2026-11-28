#!/usr/bin/env python3
"""The film so far, cut v25: the yard and the hall as they were in cut v22, with the fall and the stumble out. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v25.py
        ->  out/review/film_v25.mp4, out/review/film_v25_hall.mp4 (from the end of the descent to the end),
            edit/film_v25.edl.json

The author, 28 November, on cuts v23 and v24 (the critics' re-cut): "I prefer the old ... version this is just so rushed
as if it's a trailer"; "I'm talking about when you did Q8 and Q9 ... this is just full of cuts ... I love how the council
own part was so natural, so direct". So this is cut v22 again, frame for frame and sample for sample, with one change:

  cut v22's yard opened on the cutter set down, ending as Serath stumbles (0.7 s), and later showed her between two dark
  backs while the aide fell behind her (1.7 s). Both shots are out ("pls remove that scene of that guy falling"; and on
  27 November, "The screenplay may have them tripping, but remove that"). In their place, at the head, is the cutter
  flying in over the wall (2.4 s): Q08 round 2's own first shot, at its own speed, registered to the descent's last frame
  so that the valley simply goes on.

Everything else is the old cut: the spear, the two watching, Karst, her close shot, Karst, her profile; then the hall as
the Q09 take plays, every shot whole and every line spoken on camera; then the three pictures from Q10. No shot is slowed,
mirrored, re-framed, re-graded or shortened, and no line is moved. The sound is cut v22's file unchanged (every shot
from her close shot on starts where it did; before it there are only the song and the yard's air).
"""
import importlib.util, json, os, subprocess, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


mq, gb = load('montage_q08'), load('grade_bell')
W, H, FPS = 992, 432, 24
N17, N22 = 3360, 4499
OLD = dict(boat=(3360, 3377), spear=(3377, 3433), watch=(3433, 3475), backs=(3475, 3516), karst=(3516, 3536), rest=(3536, N22))   # cut v22's frames
CUTTER_TO_V17 = np.array([[1.0039, 0.0013, 11.2767], [-0.0013, 1.0039, 6.5235]], np.float32)   # Q08A take 2, frame 0, onto cut v17's last frame (SIFT, 142 inliers)
GRAIN = dict(json.load(open(P('grade/looks.json')))['looks']['orison']['grain'], amount=0.0185, size=1.25)   # matched to the descent's last frames (measured)


def run(*a):
    subprocess.run(list(a), check=True)


def grab(path, a, b):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(path), '-vf', f"select='between(n\\,{a}\\,{b - 1})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3); assert len(fr) == b - a, (len(fr), a, b)
    return fr


def main():
    old = grab('out/review/film_v22.mp4', N17, N22)                          # cut v22 from the yard to the end
    o = lambda k: old[OLD[k][0] - N17:OLD[k][1] - N17]
    n_cut = (OLD['boat'][1] - OLD['boat'][0]) + (OLD['backs'][1] - OLD['backs'][0])      # 17 + 41 = 58 frames: the two shots that go
    A2 = mq.frames('out/takes/Q08A_t2.mp4')
    last = grab('out/review/film_v17.mp4', N17 - 8, N17).astype(np.float32).mean(0) / 255                  # the descent's last picture, its grain averaged out
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    cutter = []
    for k, f in enumerate(A2[0:n_cut]):
        a = cv2.warpAffine(np.ascontiguousarray(f), CUTTER_TO_V17, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT).astype(np.float32) / 255 * 0.965
        if k < 4:
            a = a + (last - a) * (0.8 - 0.2 * k)                             # a four-frame dissolve out of the descent's last frame
        g = np.clip(gb.grain(np.clip(a * 1.016, 0, 1).astype(np.float32), N17 + k, GRAIN), 0, 1)
        u = (g * 255 + 0.5).astype(np.uint8); u[:top] = 0; u[top + band:] = 0
        cutter.append(u)
    seq = [('the cutter over the wall', cutter), ('the spear', o('spear')), ('they watch', o('watch')), ('Karst', o('karst')), ('from her close shot on, cut v22 unchanged', o('rest'))]
    n_new = sum(len(s[1]) for s in seq); assert N17 + n_new == N22, n_new
    out = P('out/review/film_v25.mp4'); a_mp4 = P('out/edits/_v25_a.mp4'); b_mp4 = P('out/edits/_v25_b.mp4'); lst = P('out/edits/_v25.txt'); silent = P('out/edits/_v25_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v17.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    for _, fr in seq:
        for f in fr:
            enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', P('out/edits/film_v22.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{N22 / FPS:.4f}', '-movflags', '+faststart', out)
    for p_ in (a_mp4, b_mp4, lst, silent):
        os.remove(p_)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != N22:
        sys.exit(f'frame count {got}, expected {N22}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '137.0', '-i', out, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v25_hall.mp4'))
    starts = np.cumsum([0] + [len(s[1]) for s in seq])
    rec = {'file': 'out/review/film_v25.mp4', 'frames': N22, 'seconds': round(N22 / FPS, 4), 'is': 'cut v22 with its stumble and fall shots replaced by the cutter over the wall',
           'sound': 'out/edits/film_v22.wav, unchanged', 'excerpt': 'out/review/film_v25_hall.mp4', 'excerpt_starts_at_s': 137.0,
           'shots': [{'name': nm, 'starts_at_s': round((N17 + int(s)) / FPS, 3), 'frames': len(fr)} for (nm, fr), s in zip(seq, starts)]}
    json.dump(rec, open(P('edit/film_v25.edl.json'), 'w'), indent=1); print(json.dumps(rec))


if __name__ == '__main__':
    main()
