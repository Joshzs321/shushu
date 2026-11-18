# -*- coding: utf-8 -*-
"""最后一页的合照：把 photos/final.jpg 裁成 4:3 存成 photos/finale.jpg，
   再按 64x48 取样生成 js/mosaic-data.js —— 结尾「像素 + 灯光」拼图用的就是这份颜色数据。

   换了合照以后，重新运行一次：
       python tools/prepare_finale_photo.py
"""

import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos' / 'final.jpg'
OUT_IMG = ROOT / 'photos' / 'finale.jpg'
JS = ROOT / 'js' / 'mosaic-data.js'

RATIO = 4 / 3            # 结尾相框和拼图画布都是 4:3
LONG_EDGE = 1280         # 存成足够清楚的尺寸
COLS = 64
ROWS = 48
QUALITY = 86


def crop_to_ratio(image, ratio):
    """裁成 ratio。竖着多出来的部分从下面裁：人在画面上半部，先保住头。"""
    width, height = image.size
    if width / height > ratio:
        new_width = round(height * ratio)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    new_height = round(width / ratio)
    return image.crop((0, 0, width, new_height))


def keep_photo_count():
    """其它页面还在用 mosaic-data 里的 photoCount 找 photos/p00…，换合照时保持不变。"""
    if JS.is_file():
        match = re.search(r'photoCount:\s*(\d+)', JS.read_text(encoding='utf-8'))
        if match:
            return int(match.group(1))
    return 8


def main():
    if not SRC.is_file():
        sys.exit(f'找不到合照：{SRC}')

    with Image.open(SRC) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
    image = crop_to_ratio(image, RATIO)

    if max(image.size) > LONG_EDGE:
        scale = LONG_EDGE / max(image.size)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)

    image.save(OUT_IMG, 'JPEG', quality=QUALITY, optimize=True, progressive=True)

    # 拼图用的颜色：缩到 64x48，一张格子一个颜色
    small = image.resize((COLS, ROWS), Image.Resampling.BOX)
    pixels = list(small.getdata())
    hex_colors = ''.join(f'{r:02x}{g:02x}{b:02x}' for r, g, b in pixels)

    lines = [
        '/* 由 tools/prepare_finale_photo.py 生成，不要手改。换合照后重新运行脚本。 */',
        'window.ANNIV_MOSAIC = {',
        f'  photoCount: {keep_photo_count()}, cols: {COLS}, rows: {ROWS},',
        '  src: "photos/finale.jpg",',
        f'  hex: "{hex_colors}",',
        '};',
        '',
    ]
    JS.write_text('\n'.join(lines), encoding='utf-8')

    print(f'合照已存到 {OUT_IMG.relative_to(ROOT)}（{image.width}x{image.height}），'
          f'拼图颜色写进 {JS.relative_to(ROOT)}（{COLS}x{ROWS}）')


if __name__ == '__main__':
    main()
