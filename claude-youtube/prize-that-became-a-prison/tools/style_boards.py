"""Grade the style-option frames and lay them out as boards for the author.

    python3 tools/style_boards.py        # reads out/style/raw_*.png and A_ending.png, writes out/style/board_*.jpg

Each option has one grade (ffmpeg), applied to all three of its moments. The headings on the boards are for
choosing between options only; they are not part of the film.
"""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "out", "style")
GRADE = {
    "A": "curves=r='0/0.02 0.5/0.46 1/0.95':g='0/0.03 0.5/0.5 1/0.97':b='0/0.06 0.5/0.56 1/1',hue=s=0.55,"
         "vignette=angle=PI/4.4,noise=alls=6:allf=u",
    "B": "curves=r='0/0.03 0.5/0.53 1/1':g='0/0.03 0.5/0.49 1/0.96':b='0/0.055 0.5/0.45 1/0.9',hue=s=0.85,"
         "vignette=angle=PI/4,noise=alls=7:allf=u",
    "C": "hue=s=0.12,curves=all='0/0 0.25/0.15 0.7/0.78 1/1',curves=b='0/0.025 1/1',vignette=angle=PI/4.6,noise=alls=5:allf=u",
}
TITLE = {
    "A": ("A  FLUORESCENT NOIR", "Real rooms, cold fluorescent light, deep shadow. Archive lives inside the rooms."),
    "B": ("B  EVIDENCE TABLE", "The investigation on a table under one lamp. 3D scenes arrive as prints among the real documents."),
    "C": ("C  VOID STAGE", "Only the figures and props that matter, on a black stage. Archive and graphics float as light."),
}
MOMENTS = ("question", "record", "ending")
FONT = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
LIGHT = "/usr/share/fonts/opentype/inter/Inter-Light.otf"


def grade(opt, moment):
    src = os.path.join(D, f"raw_{opt}_{moment}.png")
    dst = os.path.join(D, f"{opt}_{moment}_graded.jpg")
    if opt == "A" and moment == "ending":  # already graded black and white; set the date in it
        im = Image.open(os.path.join(D, "A_ending.png")).convert("RGB")
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype(LIGHT, 34)
        txt = "1933  –  2026"
        x = im.width - 120 - d.textlength(txt, font=f)
        d.text((x, im.height - 150), txt, font=f, fill=(226, 228, 230))
        im.save(dst, quality=92)
        return dst
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", GRADE[opt], "-q:v", "2", dst], check=True)
    return dst


def board(opts, out, w=640):
    h = w * 9 // 16
    head = 74
    sheet = Image.new("RGB", (3 * w + 4 * 14, len(opts) * (h + head + 14) + 14), (12, 13, 16))
    d = ImageDraw.Draw(sheet)
    ft, fs = ImageFont.truetype(FONT, 24), ImageFont.truetype(LIGHT, 17)
    y = 14
    for opt in opts:
        d.text((14, y + 6), TITLE[opt][0], font=ft, fill=(236, 232, 224))
        d.text((14, y + 40), TITLE[opt][1], font=fs, fill=(170, 172, 176))
        for i, m in enumerate(MOMENTS):
            im = Image.open(os.path.join(D, f"{opt}_{m}_graded.jpg")).convert("RGB").resize((w, h), Image.LANCZOS)
            sheet.paste(im, (14 + i * (w + 14), y + head))
        y += h + head + 14
    sheet.save(out, quality=90)
    return out


if __name__ == "__main__":
    for o in "ABC":
        for m in MOMENTS:
            grade(o, m)
        board([o], os.path.join(D, f"board_{o}.jpg"), w=900)
    board(list("ABC"), os.path.join(D, "board_compare.jpg"))
    print("boards written to", D)
