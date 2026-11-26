"""List extracted frames that show the REC chip's red dot.

Usage: find-rec.py <frames-dir>   (frames from frames.swift, 330px wide)
In the simulator there is no camera, so a correct build shows REC in no frame.
Calibrated on a real "REC 0:00" frame: the dot sits near (29, 117).
"""
import os
import sys
from PIL import Image

frames_dir = sys.argv[1]

def red_pixels(path):
    im = Image.open(path).convert('RGB')
    return sum(
        1
        for y in range(100, 130)
        for x in range(10, 50)
        for p in [im.getpixel((x, y))]
        if p[0] - max(p[1], p[2]) > 70
    )

names = sorted(n for n in os.listdir(frames_dir) if n.endswith('.jpg'))
hits = [n for n in names if red_pixels(os.path.join(frames_dir, n)) >= 2]
print(f'{len(hits)} of {len(names)} frames show REC' + (': ' + ', '.join(hits) if hits else ''))
