#!/usr/bin/env python3
"""Movement I (the bell), cut v5: the PICTURE, frame-accurate, in one pass from the takes.

    python3 tools/cut_bell.py [--release A|B|C] [--name I_bell_v5]

Editing only; nothing is generated. Writes out/edits/<name>_picture_<release>.mp4 (video only, ungraded) and
edit/<name>.edl.json: every shot with its timeline start, length, source take and frames, speed, grade_key (for
tools/grade_bell.py) and the timed events the sound is built on. The sound is mixed separately against this file.

The release has three versions of the same length, so one mix serves all:
  A  the wide as it is            B  the wide, punched in 1.5x on the tower and slowed to 80%
  C  the bell seen from below, continuing the tilt: the chains go slack, dust falls (slowed to 80%)   [default]
"""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAKE = lambda n: os.path.join(HERE, 'out', 'takes', n + '.mp4')
FPS, W, H = 24, 992, 432
BELOW = 'crop=754:328:0:104,scale=992:432:flags=lanczos,unsharp=5:5:0.4'      # Q02B from below, clear of the stray panel
HAMMER = 'crop=768:334:224:58,scale=992:432:flags=lanczos,unsharp=5:5:0.5'    # Q02B hammer, clear of the ringers


def shake(t0, amp):
    """A short decaying camera shake from t0 (seconds into the shot): the frame is enlarged 3% to hide the edges."""
    e = f"{amp}*exp(-(t-{t0})*11)*gte(t,{t0})"
    return (f"scale=1022:446:flags=lanczos,crop=992:432:x='15+{e}*sin(2*PI*13*(t-{t0}))':"
            f"y='7+0.7*{e}*cos(2*PI*10*(t-{t0}))'")


def shots(release):
    slow80 = "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=N/24/TB"
    rel = {
        'A': ('The release, wide', 'Q02:wide', 'Q02_t1', 334, 397, None, 1.0,
              'The wide as it is: the bell drops, the chains fall away.'),
        'B': ('The release, wide, punched in', 'Q02:wide', 'Q02_t1', 339, 396,
              f"crop=662:288:165:0,scale=992:432:flags=lanczos,unsharp=5:5:0.5,{slow80}", 0.8,
              'The same wide enlarged 1.5 times on the tower and slowed to 80%.'),
        'C': ('The release, from below', 'Q02B:below', 'Q02B_t1', 54, 111, f"{BELOW},{slow80}", 0.8,
              'The tilt carries on: the four chains go slack and swing, dust falls on the bell. Slowed to 80%.'),
    }[release]
    return [
        # label, grade_key, take, first frame, end frame (exclusive), filter, speed, frames out, purpose
        ('Black, the stroke, the super', 'black', None, 0, 90, None, 1.0, 90,
         'A01 and A05: one bell stroke over black; "THE KINGDOM OF ORISON. YEAR 800 OF THE ASCENSION."'),
        ('The nave', 'Q01:nave', 'Q01_t1', 0, 160,
         "scale=3968:1728:flags=lanczos,zoompan=z='1+0.06*on/160':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=992x432:fps=24,fade=t=in:st=0:d=0.9",
         1.0, 160, 'Fades up out of the black on the stroke\'s decay; a slow push toward the bell; the first line plays over it.'),
        ('The Hierophant', 'Q01:hierophant', 'Q01_t1', 192, 253, None, 1.0, 61, 'Enters as his eyes open; his arms rise.'),
        ('From behind him, up to the bell', 'Q01:reverse', 'Q01_t1', 253, 332, None, 1.0, 79, 'Carries "What heaven has raised".'),
        ('The gallery', 'Q01:gallery', 'Q01_t1', 332, 366, None, 1.0, 34, 'Only as long as the answer needs; its last words land on Serath.'),
        ('Unread', 'Q02A:unread', 'Q02A_t2', 208, 253, None, 1.0, 45, 'Her hand goes out, her eyes stay up; out while the hand is still moving.'),
        ('The seal', 'Q02A:seal', 'Q02A_t2', 276, 346, None, 1.0, 70, 'The ring into the wax; the seal left on the page.'),
        ('The warrant raised, up to the bell', 'Q02B:below', 'Q02B_t1', 11, 54, BELOW, 1.0, 43, 'In with the warrant already rising, so the red seal carries the eye across the cut.'),
        (rel[0], rel[1], rel[2], rel[3], rel[4], ((rel[5] + ',') if rel[5] else '') + shake(1.25, 4), rel[6], 63, rel[7] + ' A small shake as the weight lands.'),
        ('The hammer and the stroke', 'Q02B:hammer', 'Q02B_t1', 173, 231, HAMMER + ',' + shake(2.0, 6), 1.0, 58,
         'Hauled back in near silence, the stroke two seconds in, out ten frames later while the note blooms. A shake on the stroke.'),
        ('The still cup', 'Q02:cup', 'Q02_t1', 594, 625, 'CUP', 0.5, 132,
         'Half speed, played forward, back and forward again: 5.5 s of perfectly still wine, locked off, fading to black.'),
        ('Black', 'black', None, 0, 36, None, 1.0, 36, 'The note rings out.'),
    ]


def title_card(path):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Light.otf', 17) if os.path.exists('/usr/share/fonts/opentype/inter/Inter-Light.otf') else ImageFont.load_default()
    for text, y in (('THE KINGDOM OF ORISON', H // 2 - 24), ('YEAR 800 OF THE ASCENSION', H // 2 + 10)):
        track = 6.5
        widths = [d.textlength(ch, font=font) for ch in text]
        x = (W - (sum(widths) + track * (len(text) - 1))) / 2
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=font, fill=(233, 230, 222, 235)); x += w + track
    im.save(path)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--release', default='C', choices='ABC'); ap.add_argument('--name', default='I_bell_v5')
    a = ap.parse_args()
    S = shots(a.release)
    os.makedirs(os.path.join(HERE, 'out', 'edits'), exist_ok=True)
    card = os.path.join(HERE, 'out', 'edits', a.name + '_super.png'); title_card(card)
    takes = sorted({s[2] for s in S if s[2]}); idx = {t: i for i, t in enumerate(takes)}
    inputs = sum((['-i', TAKE(t)] for t in takes), []) + ['-loop', '1', '-framerate', str(FPS), '-i', card]
    ci = len(takes)
    fc, labels = [], []
    for k, (label, key, take, f0, f1, vf, speed, nout, _) in enumerate(S):
        if take is None and k == 0:        # black, then the super fades in at 1.3 s and out by 3.6 s
            fc.append(f"color=black:s={W}x{H}:r={FPS}:d={nout / FPS}[bk{k}];[{ci}:v]format=rgba,fade=t=in:st=1.3:d=0.7:alpha=1,fade=t=out:st=3.0:d=0.6:alpha=1[ttl];"
                      f"[bk{k}][ttl]overlay=shortest=1,trim=end_frame={nout},setpts=PTS-STARTPTS,format=yuv420p[v{k}]")
        elif take is None:
            fc.append(f"color=black:s={W}x{H}:r={FPS}:d={nout / FPS},trim=end_frame={nout},format=yuv420p[v{k}]")
        elif vf == 'CUP':
            fc.append(f"[{idx[take]}:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=N/24/TB,"
                      f"trim=end_frame=59,setpts=PTS-STARTPTS,split=3[c0][c1][c2];[c1]reverse[c1r];[c2]trim=end_frame=14,setpts=PTS-STARTPTS[c2s];"
                      f"[c0][c1r][c2s]concat=n=3:v=1:a=0,fade=t=out:st=4.9:d=0.6,fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[v{k}]")
        else:
            fc.append(f"[{idx[take]}:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS" + (f",{vf}" if vf else '')
                      + f",fps={FPS},scale={W}:{H},setsar=1,trim=end_frame={nout},setpts=PTS-STARTPTS,format=yuv420p[v{k}]")
        labels.append(f"[v{k}]")
    fc.append(''.join(labels) + f"concat=n={len(S)}:v=1:a=0[v]")
    out = os.path.join(HERE, 'out', 'edits', f"{a.name}_picture_{a.release}.mp4")
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[v]', '-an',
                        '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), out], capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-3000:])
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    want = sum(s[7] for s in S)
    pic, f = [], 0
    for (label, key, take, f0, f1, vf, speed, nout, purpose) in S:
        pic.append(dict(n=len(pic) + 1, label=label, grade_key=key, start=round(f / FPS, 4), duration=round(nout / FPS, 4), start_frame=f, frames=nout,
                        take=take, src_in=None if take is None else round(f0 / FPS, 4), src_out=None if take is None else round(f1 / FPS, 4), speed=speed, purpose=purpose))
        f += nout
    t = {p['label']: p['start'] for p in pic}
    rel_start = pic[8]['start']
    events = {
        'opening_bell_stroke': 0.5, 'super_in': 1.3, 'super_out': 3.6, 'picture_fades_in': [3.75, 4.65],
        'line1 (Q01 1.95-6.45 s)': [round(t['The nave'] + 1.95, 3), round(t['The nave'] + 6.45, 3)],
        'q01_audio_map': 'Q01 0-6.667 s plays from the nave\'s start; Q01 6.667-8.0 s is REMOVED (picture and sound); Q01 from 8.0 s plays from the Hierophant\'s start and runs on past the gallery under Serath',
        'line2 (Q01 11.95-13.2 s)': [round(t['The Hierophant'] + 11.95 - 8.0, 3), round(t['The Hierophant'] + 13.2 - 8.0, 3)],
        'answer (Q01 13.95-16.3 s)': [round(t['The Hierophant'] + 13.95 - 8.0, 3), round(t['The Hierophant'] + 16.3 - 8.0, 3)],
        'ring_touches_wax (Q02A 11.87 s)': round(t['The seal'] + 11.87 - 11.5, 3),
        'ring_lifts (Q02A 13.45 s)': round(t['The seal'] + 13.45 - 11.5, 3),
        'warrant_raised': round(t['The warrant raised, up to the bell'], 3),
        'release_starts_chains_go_slack': round(rel_start + 0.4, 3), 'weight_lands_shake': round(rel_start + 1.25, 3),
        'hammer_hauled_back': [round(t['The hammer and the stroke'], 3), round(t['The hammer and the stroke'] + 1.45, 3)],
        'hammer_swing': [round(t['The hammer and the stroke'] + 1.5, 3), round(t['The hammer and the stroke'] + 2.0, 3)],
        'stroke': round(t['The hammer and the stroke'] + (9.205 - 173 / FPS), 3),
        'cup': [round(t['The still cup'], 3), round(t['The still cup'] + 5.5, 3)], 'cup_fades_to_black': round(t['The still cup'] + 4.9, 3),
        'end': round(want / FPS, 4),
    }
    edl = dict(name=a.name, fps=FPS, size=[W, H], frames=want, duration=round(want / FPS, 4), release_variant=a.release, picture=pic, events=events)
    if a.release == 'C': json.dump(edl, open(os.path.join(HERE, 'edit', a.name + '.edl.json'), 'w'), indent=1)
    json.dump(edl, open(out.replace('.mp4', '.edl.json'), 'w'), indent=1)
    print(f"wrote {out}: {n} frames (expected {want}), {n / FPS:.3f} s")
    for p in pic: print(f"  {p['n']:2d} {p['start']:7.3f} {p['duration']:6.3f}  {p['label']}")
    if n != want: sys.exit('FRAME COUNT MISMATCH')


if __name__ == '__main__':
    main()
