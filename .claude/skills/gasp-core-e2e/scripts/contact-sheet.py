"""Tile extracted frames into one labelled image: contact-sheet.py <frames-dir> <out.jpg> [cols]."""
import os
import sys
from PIL import Image, ImageDraw

frames_dir, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
names = sorted(n for n in os.listdir(frames_dir) if n.endswith('.jpg'))
if not names:
    sys.exit('no frames in ' + frames_dir)
first = Image.open(os.path.join(frames_dir, names[0]))
w, h = first.size
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 24)), 'black')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(names):
    x, y = (i % cols) * w, (i // cols) * (h + 24)
    sheet.paste(Image.open(os.path.join(frames_dir, name)), (x, y + 24))
    # frames.swift names files f<index>_<seconds>.jpg
    label = name.split('_', 1)[-1].removesuffix('.jpg') + 's'
    draw.text((x + 6, y + 4), label, fill='yellow')
sheet.save(out, quality=80)
print(out, f'{len(names)} frames')
