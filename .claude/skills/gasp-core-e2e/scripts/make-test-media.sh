#!/bin/sh
# Builds the test media for gasp-core-e2e into $1 (default: $TMPDIR/gasp-core-e2e/media):
#   gasp-audio.mp4  ~9s 720x1280 video, pt-BR voice, on-screen clock "AUDIO x.xs"
#   gasp-photo.jpg  1080x1920 photo with a big "FOTO E2E" label
# The on-screen clock lets frame captures show exactly where playback is.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-${TMPDIR:-/tmp}/gasp-core-e2e/media}"
mkdir -p "$OUT"
say -v Luciana -o "$OUT/voice.aiff" "Teste de som do gasp. Um, dois, três, quatro, cinco, seis. Se você está ouvindo, o áudio funciona."
swift "$HERE/make-video.swift" "$OUT/gasp-audio.mp4" "$OUT/voice.aiff"
python3 - "$OUT/gasp-photo.jpg" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (1080, 1920), (124, 58, 237))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 150)
except OSError:
    font = ImageFont.load_default()
d.text((540, 960), 'FOTO E2E', fill='white', font=font, anchor='mm')
img.save(sys.argv[1], quality=90)
PY
ls -la "$OUT"
