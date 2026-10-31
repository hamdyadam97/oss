"""Corrects two spelling mistakes baked into the banner designs by editing dots only
(same font, same letters, nothing redrawn):

  patient-safety:  «المرضي» -> «المرضى»   remove the two dots under the final ي
  join-community:  «وشيكة» -> «وشبكة»     two dots under the medial ي -> one centred dot (ب)

Originals are kept untouched in banners/originals/. Run with the backend venv's Python:
    python branding/fix_typos.py && python branding/make_assets.py
"""
import shutil
from pathlib import Path

from PIL import Image

BANNERS = Path(__file__).resolve().parent / "banners"
ORIGINALS = BANNERS / "originals"


def erase(img, x0, y0, x1, y1, sample_rows):
    """Paints the box (inclusive) with the per-column average of clean background rows."""
    px = img.load()
    for x in range(x0, x1 + 1):
        samples = [px[x, y] for y in sample_rows]
        avg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))
        for y in range(y0, y1 + 1):
            px[x, y] = avg


def original(name):
    ORIGINALS.mkdir(exist_ok=True)
    src = ORIGINALS / name
    if not src.exists():  # first run: move the delivered file aside, never overwrite it
        shutil.copy2(BANNERS / name, src)
    return Image.open(src).convert("RGB")


# 1) «المرضي» -> «المرضى» in the wide 2078×757 design (the 16:9 v1 had the dots at x 98-106, y 645-650):
#    dots occupy x 205-212, y 527-531 (letter curve ends at y 525).
img = original("patient-safety.png")
erase(img, 204, 526, 213, 532, sample_rows=(534, 535, 536))
img.save(BANNERS / "patient-safety.png")

# 2) «وشيكة» -> «وشبكة»: dots at x 985-991, y 507-510; the tooth above is centred on x 989.
img = original("join-community.png")
dot = img.crop((989, 506, 992, 512))  # the right-hand dot (3 px wide, centred on x 990), same size/colour
erase(img, 984, 506, 992, 511, sample_rows=(513, 514))
img.paste(dot, (988, 506))  # one dot, centred under the tooth (x 989)
img.save(BANNERS / "join-community.png")

print("corrected:", [p.name for p in BANNERS.glob("*.png")], "| originals kept in", ORIGINALS)
