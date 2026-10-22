#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""make-qr.py — 生成真实二维码（PNG + 可直接粘进 config 的 data URI）。

用法:
  python make-qr.py <内容或URL> [输出.png] [尺寸px=372] [边距px=12]

产出:
  1) <输出>.png            —— 白底黑码 PNG，直接当海报二维码素材
  2) <输出>.datauri.txt    —— 一行 data:image/png;base64,... ，粘到模板 config 的 qr.image 即可
                             （模板会渲染 <img src=...>，替换占位二维码）

依赖: segno（纯 Python）+ Pillow。装法: pip install segno
示例: python make-qr.py "https://qm.qq.com/xxxx" 报名码.png 372
"""
import base64
import io
import os
import sys

try:
    import segno
except ImportError:
    sys.exit("缺 segno：先 pip install segno")

try:
    from PIL import Image
except ImportError:
    sys.exit("缺 Pillow：先 pip install Pillow")


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if args else 64)
    content = args[0]
    out = args[1] if len(args) > 1 else "qr.png"
    size = int(args[2]) if len(args) > 2 else 372
    border = int(args[3]) if len(args) > 3 else 12

    qr = segno.make(content, error="m")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=10, border=2, dark="#111318", light="#FFFFFF")
    buf.seek(0)
    img = Image.open(buf).convert("RGB")

    # 定尺寸：先留出白边（quiet zone），整体缩放到 size×size
    inner = img.resize((size - border * 2, size - border * 2), Image.NEAREST)
    final = Image.new("RGB", (size, size), "#FFFFFF")
    final.paste(inner, (border, border))
    final.save(out, "PNG")

    datauri = "data:image/png;base64," + base64.b64encode(open(out, "rb").read()).decode("ascii")
    uri_path = os.path.splitext(out)[0] + ".datauri.txt"
    with open(uri_path, "w", encoding="utf-8") as f:
        f.write(datauri)

    print("二维码已生成: %s (%dx%d)" % (out, size, size))
    print("内容: %s" % content)
    print("data URI: %s (共 %d 字符，已存到 %s)" % (datauri[:48] + "...", len(datauri), uri_path))
    print('粘贴方法: config 里写  "qr": { "image": "<把 datauri.txt 的整行贴进来>" }')


if __name__ == "__main__":
    main()
