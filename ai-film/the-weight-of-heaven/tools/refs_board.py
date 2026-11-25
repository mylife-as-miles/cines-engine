#!/usr/bin/env python3
"""Contact board of a generation's references, in @Image order.

usage: refs_board.py out.jpg "label|path" "label|path" ...
Each cell: '@ImageN  label' in gold, the image fitted into a 16:9 cell on dark grey.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

COLS, CW, CH, PAD, HEAD = 4, 560, 315, 14, 38
BG, CELL, GOLD = (24, 25, 27), (38, 40, 43), (212, 172, 92)
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)

def main(out, items):
    rows = (len(items) + COLS - 1) // COLS
    W = COLS * CW + (COLS + 1) * PAD
    H = rows * (CH + HEAD) + (rows + 1) * PAD
    board = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(board)
    for i, it in enumerate(items):
        label, path = it.split("|", 1)
        r, c = divmod(i, COLS)
        x = PAD + c * (CW + PAD)
        y = PAD + r * (CH + HEAD + PAD)
        d.text((x, y + 6), f"@Image{i+1}  {label}", font=FONT, fill=GOLD)
        d.rectangle([x, y + HEAD, x + CW, y + HEAD + CH], fill=CELL)
        im = Image.open(path).convert("RGB")
        im.thumbnail((CW, CH), Image.LANCZOS)
        board.paste(im, (x + (CW - im.width) // 2, y + HEAD + (CH - im.height) // 2))
    board.save(out, quality=90)
    print("wrote", out, board.size)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
