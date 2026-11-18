# -*- coding: utf-8 -*-
"""第二页（胶卷）两排的照片：把 photos/第二页/第一排、第二排 里的原图
   做成胶卷格子里用的小图，再把原图整份复制过去给「点开看原图」用，
   最后生成 js/film-photos.js —— 里面按文件夹分好 row1 / row2。

   换了照片以后，重新运行一次：
       python tools/prepare_film_photos.py

   原图不动：小图放 photos/film/r1-01.jpg……，原图放 photos/film/r1-01-full.jpg……
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos' / '第二页'
OUT = ROOT / 'photos' / 'film'
JS = ROOT / 'js' / 'film-photos.js'

ROWS = [('row1', '第一排', 'r1'), ('row2', '第二排', 'r2')]
THUMB_SIZE = (480, 600)   # 胶卷格子是 4:5 竖着的，小图也照这个比例裁
QUALITY = 80
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}


def center_crop(image, ratio):
    """按 宽/高 = ratio 居中裁切。"""
    width, height = image.size
    if width / height > ratio:
        new_width = round(height * ratio)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    new_height = round(width / ratio)
    top = (height - new_height) // 2
    return image.crop((0, top, width, top + new_height))


def photos_in(folder):
    return sorted(
        (p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS),
        key=lambda p: p.name,
    )


def main():
    if not SRC.is_dir():
        sys.exit(f'找不到照片文件夹：{SRC}')

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.jpg'):    # 照片变少了也别留下旧图
        old.unlink()

    data = {}
    for key, folder_name, prefix in ROWS:
        folder = SRC / folder_name
        if not folder.is_dir():
            sys.exit(f'找不到照片文件夹：{folder}')
        files = photos_in(folder)
        if not files:
            sys.exit(f'{folder} 里没有可用的照片')

        entries = []
        for index, path in enumerate(files, start=1):
            name = f'{prefix}-{index:02d}'
            with Image.open(path) as source:
                image = ImageOps.exif_transpose(source).convert('RGB')
            image = center_crop(image, THUMB_SIZE[0] / THUMB_SIZE[1])
            image = image.resize(THUMB_SIZE, Image.LANCZOS)
            image.save(OUT / f'{name}.jpg', 'JPEG', quality=QUALITY, optimize=True, progressive=True)
            # 原图整份复制：点开看的就是它，不重新压
            full_suffix = path.suffix.lower() if path.suffix.lower() in ('.jpg', '.jpeg') else '.jpg'
            if full_suffix != '.jpg':
                with Image.open(path) as source:
                    ImageOps.exif_transpose(source).convert('RGB').save(
                        OUT / f'{name}-full.jpg', 'JPEG', quality=92, optimize=True)
            else:
                shutil.copyfile(path, OUT / f'{name}-full.jpg')
            entries.append({
                'thumb': f'photos/film/{name}.jpg',
                'full': f'photos/film/{name}-full.jpg',
                'caption': path.stem,
                'from': path.name,
            })
            print(f'{folder_name} {index:02d}. {path.stem}')

        data[key] = entries

    lines = [
        '/* 由 tools/prepare_film_photos.py 生成，不用手改。',
        ' * 第二页（胶卷）两排的照片：row1 = 第一排，row2 = 第二排。',
        ' * thumb 是胶卷格子里的小图，full 是点开后看的原图。',
        ' */',
        'window.ANNIV_FILM_PHOTOS = {',
    ]
    for key, _, _ in ROWS:
        lines.append(f'  {key}: [')
        for entry in data[key]:
            lines.append(
                '    {{ thumb: {thumb}, full: {full}, caption: {caption} }},'.format(
                    thumb=json.dumps(entry['thumb']),
                    full=json.dumps(entry['full']),
                    caption=json.dumps(entry['caption'], ensure_ascii=False),
                )
            )
        lines.append('  ],')
    lines.append('};')
    lines.append('')
    JS.write_text('\n'.join(lines), encoding='utf-8')

    total = sum(len(v) for v in data.values())
    print(f'\n共 {total} 张（第一排 {len(data["row1"])}、第二排 {len(data["row2"])}）→ '
          f'{OUT.relative_to(ROOT)}，清单写进 {JS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
