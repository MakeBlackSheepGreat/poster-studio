#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""出图后核对二维码：把导出的 JPG 分段扫描，解出每个二维码指向的真实地址。

用法：
    python verify-qr.py 海报.jpg
    python verify-qr.py 海报.jpg --expect https://qm.qq.com/q/xxx --expect https://wj.qq.com/s2/xxx

依赖：pip install zxing-cpp Pillow
为什么要这一步：配置里可能残留早期示例码（qr.image / cta.qr.image 没跟着换），
光看导出的图分辨不出来 —— 示例码也是黑白方块，必须解码出 URL 才算验证通过。
"""
import sys, os, argparse
from PIL import Image

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--segments", type=int, default=8, help="纵向切段数，长图调大")
    ap.add_argument("--expect", action="append", default=[], help="期望出现的 URL，可重复")
    args = ap.parse_args()

    try:
        import zxingcpp
    except ImportError:
        sys.exit("缺少依赖：pip install zxing-cpp")

    im = Image.open(args.image)
    w, h = im.size
    found = []
    for i in range(args.segments):
        top = max(0, int(h * i / args.segments) - 200)
        bot = min(h, int(h * (i + 1) / args.segments) + 200)
        for r in zxingcpp.read_barcodes(im.crop((0, top, w, bot)).convert("L")):
            if r.text and r.text not in found:
                found.append(r.text)

    print("%s  %dx%d  解出 %d 个二维码" % (os.path.basename(args.image), w, h, len(found)))
    for t in found:
        print("  -", t)
    if not found:
        print("!! 一个都没解出来：二维码可能太糊/太小/被遮挡，或根本不是有效码")

    if args.expect:
        missing = [e for e in args.expect if e not in found]
        extra = [t for t in found if t not in args.expect]
        if missing:
            print("!! 缺少期望的地址：" + ", ".join(missing))
        if extra:
            print("!! 出现未预期的地址（可能是残留示例码）：" + ", ".join(extra))
        sys.exit(0 if not missing and not extra else 1)

if __name__ == "__main__":
    main()
