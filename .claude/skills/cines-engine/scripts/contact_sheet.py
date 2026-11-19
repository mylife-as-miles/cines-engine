#!/usr/bin/env python3
"""Contact sheet of a video at given times (or evenly spaced), for looking at your work before you send it.

    python3 contact_sheet.py video.mp4 out.jpg                 # 12 frames, evenly spaced
    python3 contact_sheet.py video.mp4 out.jpg 5 14 27 70      # these times (seconds)
    python3 contact_sheet.py video.mp4 out.jpg --n 20 --cols 5 --width 480
    python3 contact_sheet.py video.mp4 crop.png 70 --crop 100,640,1200,760 --scale 1   # one detail at full size

Each frame is labelled with its time. Needs ffmpeg, ffprobe and Pillow.
"""
import argparse, os, subprocess, tempfile
from PIL import Image, ImageDraw


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True, check=True).stdout.strip())


def grab(path, t, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', out], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('times', nargs='*', type=float)
    ap.add_argument('--n', type=int, default=12); ap.add_argument('--cols', type=int, default=4)
    ap.add_argument('--width', type=int, default=480, help='width of each cell')
    ap.add_argument('--crop', help='x0,y0,x1,y1 in source pixels, applied before scaling')
    ap.add_argument('--scale', type=float, help='scale of each cell instead of --width (1 = full size)')
    a = ap.parse_args()
    d = duration(a.video)
    times = a.times or [d * (i + 0.5) / a.n for i in range(a.n)]
    cells = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            f = os.path.join(tmp, f'{i}.png'); grab(a.video, min(t, d - 0.05), f)
            im = Image.open(f).convert('RGB')
            if a.crop: im = im.crop(tuple(int(v) for v in a.crop.split(',')))
            s = a.scale if a.scale else a.width / im.width
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))))
            ImageDraw.Draw(im).text((8, 6), f'{int(t // 60)}:{t % 60:05.2f}', fill=(255, 230, 0))
            cells.append(im)
    cols = min(a.cols, len(cells)); rows = -(-len(cells) // cols)
    w, h = cells[0].size
    sheet = Image.new('RGB', (cols * w, rows * h))
    for i, im in enumerate(cells): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet.save(a.out, quality=88)
    print(f'{len(cells)} frames -> {a.out} ({sheet.width}x{sheet.height})')


if __name__ == '__main__':
    main()
