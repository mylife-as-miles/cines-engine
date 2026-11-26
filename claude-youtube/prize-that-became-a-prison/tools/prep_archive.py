"""Turn archive documents into images the scenes can use, with a highlighter on chosen words.

    python3 tools/prep_archive.py            # writes out/archive/s1_page1.png and s1_page1_yes.png

Needs poppler (pdftoppm, pdftotext). The highlighter is multiplied into the page, as ink on paper would be.
"""
import os
import re
import subprocess

from PIL import Image, ImageChops, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "out", "archive")
S1 = os.path.join(ROOT, "archive", "S1_tim_hunt_cecc_written_submission_2024.pdf")
MARKER = (255, 226, 92)


def page(pdf, n, dpi, stem):
    subprocess.run(["pdftoppm", "-f", str(n), "-l", str(n), "-r", str(dpi), "-png", "-singlefile", pdf, stem], check=True)
    subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), "-bbox", pdf, stem + ".html"], check=True)
    html = open(stem + ".html", encoding="utf-8").read()
    pw = float(re.search(r'<page width="([\d.]+)"', html).group(1))
    words = re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', html)
    return Image.open(stem + ".png").convert("RGB"), pw, words


def highlight(im, pw, words, match):
    k = im.width / pw
    ink = Image.new("RGB", im.size, (255, 255, 255))
    d = ImageDraw.Draw(ink)
    for x0, y0, x1, y1, w in words:
        if match(w):
            x0, y0, x1, y1 = (float(v) * k for v in (x0, y0, x1, y1))
            d.rectangle([x0 - 6, y0 + 2, x1 + 6, y1 + 3], fill=MARKER)
    return ImageChops.multiply(im, ink)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    im, pw, words = page(S1, 1, 200, os.path.join(OUT, "s1_page1"))
    highlight(im, pw, words, lambda w: "yes" in w.lower()).save(os.path.join(OUT, "s1_page1_yes.png"))
    print("wrote", os.path.join(OUT, "s1_page1_yes.png"))
