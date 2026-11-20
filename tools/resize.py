import sys
from PIL import Image

src, dst, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
quality = int(sys.argv[4]) if len(sys.argv) > 4 else 82
img = Image.open(src).convert("RGB")
w, h = img.size
if w > width:
    img = img.resize((width, round(h * width / w)), Image.LANCZOS)
img.save(dst, "JPEG", quality=quality, optimize=True)
print(f"{dst} {img.size[0]}x{img.size[1]}")
