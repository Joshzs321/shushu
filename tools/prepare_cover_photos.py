# -*- coding: utf-8 -*-
"""第一页（封面）洗出来的照片：把 photos/第一页 里的原图裁成方形、缩到网页够用的大小，
   再生成 js/cover-photos.js —— 里面按文件名开头的数字排好顺序，并记下照片名字。

   文件名规则：数字 + 分隔符 + 名字，比如「1-第一次约会.jpg」。
   数字决定出现顺序，数字后面那段就是照片名字（会印在照片的角上）。

   换了照片以后，重新运行一次：
       python tools/prepare_cover_photos.py

   原图不动，处理完的图放在 photos/cover/01.jpg、02.jpg ……
"""

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos' / '第一页'
OUT = ROOT / 'photos' / 'cover'
JS = ROOT / 'js' / 'cover-photos.js'

SIZE = 800       # 正方形边长：照片最大只显示到 176px 宽，800 够 4 倍屏了
QUALITY = 82
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}

# 数字 + 分隔符 + 名字；名字里再出现「-」也照收
NAME_RE = re.compile(r'^\s*(?P<num>\d+)\s*[-_.、．·—–\s|]+\s*(?P<name>.+?)\s*$')


def parse(path):
    """→ (排序用的数字, 照片名字)；文件名里没有数字就排到最后、名字用整个文件名。"""
    m = NAME_RE.match(path.stem)
    if m and m.group('name').strip():
        return int(m.group('num')), m.group('name').strip()
    return None, path.stem.strip()


def square_crop(image):
    """居中裁成正方形：宽度优先，竖图裁掉上下多余的部分。"""
    w, h = image.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return image.crop((left, top, left + side, top + side))


def main():
    if not SRC.is_dir():
        sys.exit(f'找不到照片文件夹：{SRC}')

    photos = []
    for path in SRC.iterdir():
        if path.is_file() and path.suffix.lower() in EXTS:
            num, name = parse(path)
            photos.append((num, name, path))
    if not photos:
        sys.exit(f'{SRC} 里没有可用的照片（支持 {" ".join(sorted(EXTS))}）')

    # 有数字的按数字从小到大；没数字的按名字排在最后
    photos.sort(key=lambda item: (item[0] is None, item[0] if item[0] is not None else 0, item[1]))

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('[0-9][0-9].jpg'):  # 照片变少了也别留下旧图
        old.unlink()

    entries = []
    for index, (num, name, path) in enumerate(photos, start=1):
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
        image = square_crop(image).resize((SIZE, SIZE), Image.LANCZOS)
        target = OUT / f'{index:02d}.jpg'
        image.save(target, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        entries.append({
            'src': f'photos/cover/{index:02d}.jpg',
            'name': name,
            'from': path.name,
        })
        print(f'{index:02d}. {name}  ←  {path.name}')

    lines = [
        '/* 由 tools/prepare_cover_photos.py 生成，不用手改。',
        ' * 第一页（封面）按下快门洗出来的照片：数组顺序就是出现顺序，',
        ' * name 会印在照片上（左边的照片印右上角，右边的照片印左上角）。',
        ' */',
        'window.ANNIV_COVER_PHOTOS = [',
    ]
    for entry in entries:
        lines.append(f"  {{ src: '{entry['src']}', name: {json.dumps(entry['name'], ensure_ascii=False)} }},")
    lines.append('];')
    lines.append('')
    JS.write_text('\n'.join(lines), encoding='utf-8')

    print(f'\n共 {len(entries)} 张 → {OUT.relative_to(ROOT)}，顺序与名字写进 {JS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
