#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""长图导出 JPG 的质检切片：单边超过 8192px 的图 read_image 读不了，先切块降采样再逐段看。
用法: python qc-split.py <jpg路径> [块数=3] [输出目录=图片同目录/_qc]
审阅片宽 ≤700、高 ≤2600，字迹保持清晰；只用于质检，发布仍用原图。"""
import sys, os
from PIL import Image

src = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
qc = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(src)), "_qc")
os.makedirs(qc, exist_ok=True)
im = Image.open(src)
w, h = im.size
print("source:", w, h)
step = h // n + 1
for i in range(n):
    top = i * step
    bot = min(h, top + step)
    chunk = im.crop((0, top, w, bot))
    scale = min(700.0 / chunk.width, 2600.0 / chunk.height, 1.0)
    if scale < 1.0:
        chunk = chunk.resize((int(chunk.width * scale), int(chunk.height * scale)), Image.LANCZOS)
    p = os.path.join(qc, "part%d.jpg" % (i + 1))
    chunk.save(p, quality=88)
    print(p, chunk.size)
