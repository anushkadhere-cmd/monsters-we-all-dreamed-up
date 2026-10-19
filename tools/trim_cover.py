"""Trim the full-artboard cover images before publishing.

Every PNG in assets/cover/full/ is the whole artboard with only one layer
visible, which is easy to export but heavy for phones. This script cuts each
one down to its visible pixels, saves it as WebP (or PNG), and writes
assets/cover/layout.json so js/cover.js knows where each piece goes.

Run from the project folder:
    pip install pillow
    python3 tools/trim_cover.py

Run it again whenever you change an image in assets/cover/full/.
To go back to the untrimmed files, delete assets/cover/layout.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image, features

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "cover" / "full"
OUT = ROOT / "assets" / "cover"
MAX_WIDTH = 2400   # artboard width after export; bigger images are scaled down to this
PAD = 4            # px of breathing room kept around each trimmed image
QUALITY = 88       # WebP quality


def main():
    files = sorted(SRC.glob("*.png"))
    if not files:
        sys.exit(f"No PNGs found in {SRC}")

    use_webp = features.check("webp")
    ext = "webp" if use_webp else "png"
    size = None
    scale = 1.0
    layers = {}
    total_in = total_out = 0

    for f in files:
        im = Image.open(f).convert("RGBA")
        if size is None:
            size = im.size
            scale = min(1.0, MAX_WIDTH / size[0])
        elif im.size != size:
            sys.exit(f"{f.name} is {im.size[0]}x{im.size[1]} but the others are {size[0]}x{size[1]}. "
                     "Export every layer from the same artboard.")
        if scale < 1:
            im = im.resize((round(size[0] * scale), round(size[1] * scale)), Image.LANCZOS)

        bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox is None:
            print(f"  skipped {f.name} (empty)")
            continue
        x0, y0, x1, y1 = bbox
        x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
        x1, y1 = min(im.width, x1 + PAD), min(im.height, y1 + PAD)
        crop = im.crop((x0, y0, x1, y1))

        out = OUT / f"{f.stem}.{ext}"
        if use_webp:
            crop.save(out, "WEBP", quality=QUALITY, method=6)
        else:
            crop.save(out, "PNG", optimize=True)
        layers[f.stem] = {"file": out.name, "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
        total_in += f.stat().st_size
        total_out += out.stat().st_size
        print(f"  {f.name:28s} -> {out.name:28s} {x1 - x0:5d}x{y1 - y0:<5d} {out.stat().st_size // 1024:5d} KB")

    canvas = {"w": round(size[0] * scale), "h": round(size[1] * scale)}
    (OUT / "layout.json").write_text(json.dumps({"canvas": canvas, "layers": layers}, indent=2))
    print(f"\nWrote {OUT / 'layout.json'}  ({len(layers)} layers, {total_in // 1024} KB -> {total_out // 1024} KB)")


if __name__ == "__main__":
    main()
