"""Builds web assets from the original logo (run with the backend venv's Python).

    python branding/make_assets.py
Outputs: branding/logo.png (transparent outside the circle) and the favicons in frontend/public.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "frontend" / "public"
SS = 4  # supersampling for a smooth circular edge

src = Image.open(ROOT / "logo-original.jpg").convert("RGB")
w, h = src.size

# Find the outer ring: the bounding box of everything that is not near-white.
gray = src.convert("L").point(lambda v: 255 if v < 200 else 0)
left, top, right, bottom = gray.getbbox()
cx, cy = (left + right) / 2, (top + bottom) / 2
radius = max(right - left, bottom - top) / 2 + 4

mask = Image.new("L", (w * SS, h * SS), 0)
ImageDraw.Draw(mask).ellipse(
    [(cx - radius) * SS, (cy - radius) * SS, (cx + radius) * SS, (cy + radius) * SS], fill=255
)
mask = mask.resize((w, h), Image.LANCZOS)

logo = src.convert("RGBA")
logo.putalpha(ImageChops.multiply(mask, Image.new("L", (w, h), 255)))
box = (int(cx - radius), int(cy - radius), int(cx + radius), int(cy + radius))
logo = logo.crop(box)

logo.resize((512, 512), Image.LANCZOS).save(ROOT / "logo.png", optimize=True)
# Lightweight version uploaded to the site.
logo.resize((400, 400), Image.LANCZOS).save(ROOT / "logo.webp", quality=92, method=6)
for size, name in [(32, "favicon-32.png"), (64, "favicon-64.png")]:
    logo.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)
# iOS ignores transparency: put the round logo on white.
touch = Image.new("RGB", (180, 180), "white")
touch.paste(logo.resize((164, 164), Image.LANCZOS), (8, 8), logo.resize((164, 164), Image.LANCZOS))
touch.save(PUBLIC / "apple-touch-icon.png", optimize=True)
print("circle", round(cx), round(cy), round(radius), "->", ROOT / "logo.png")

# Ready-made banner designs: web-optimised WebP copies (originals stay untouched).
for png in sorted((ROOT / "banners").glob("*.png")):
    art = Image.open(png).convert("RGB")
    if art.width > 1920:
        art = art.resize((1920, round(art.height * 1920 / art.width)), Image.LANCZOS)
    out = png.with_suffix(".webp")
    art.save(out, quality=86, method=6)
    print(png.name, art.size, "->", out.name, out.stat().st_size // 1024, "KB")
