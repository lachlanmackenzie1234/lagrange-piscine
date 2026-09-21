"""Pack the existing v5 foliage into native runtime sprites (Pillow required).

This deterministic importer preserves the original ImageGen source and samples
the same eight regions as the living-world art study. No artwork is generated.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-world'
SOURCE = DEST / 'source/coastal-foliage.png'
REGIONS = [
    (0, 0, 516, 626, 106, 122), (516, 0, 299, 626, 65, 130),
    (815, 0, 452, 626, 96, 113), (1267, 0, 269, 626, 54, 94),
    (0, 634, 400, 390, 46, 39), (400, 634, 403, 390, 39, 34),
    (803, 634, 390, 390, 46, 43), (1193, 634, 343, 390, 39, 34),
]


def sample(source, region, tree):
    x, y, w, h, width, height = region
    crop = source.crop((x, y, x + w, y + h))
    bbox = crop.getchannel('A').point(lambda a: 255 if a > 155 else 0).getbbox()
    if not bbox:
        raise ValueError('Empty foliage region')
    crop = crop.crop(bbox)
    factor = min((width - 2) / crop.width, (height - 2) / crop.height)
    size = (round(crop.width * factor), round(crop.height * factor))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    sprite = Image.new('RGBA', (width, height))
    sprite.paste(crop, (round((width - size[0]) / 2), height - size[1] - 1))
    pixels = sprite.load()
    for yy in range(height):
        for xx in range(width):
            r, g, b, a = pixels[xx, yy]
            pixels[xx, yy] = tuple(min(255, round(c / 8) * 8) for c in (r, g, b)) + (255 if a > 130 else 0,)
    if tree:
        # Discard detached fragments from neighbouring atlas objects. A 2px
        # neighbourhood retains the intended scattered leaves of each canopy.
        unseen = {(xx, yy) for yy in range(height) for xx in range(width) if pixels[xx, yy][3]}
        groups = []
        while unseen:
            group = [unseen.pop()]
            for xx, yy in group:
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        point = (xx + dx, yy + dy)
                        if point in unseen:
                            unseen.remove(point)
                            group.append(point)
            groups.append(group)
        largest = max(map(len, groups))
        for group in groups:
            if len(group) < largest * .05:
                for xx, yy in group:
                    pixels[xx, yy] = (0, 0, 0, 0)
    return sprite


source = Image.open(SOURCE).convert('RGBA')
sprites = [sample(source, region, i < 4) for i, region in enumerate(REGIONS)]
page = Image.new('RGBA', (321, 173))
rectangles = []
x = y = 0
for i, sprite in enumerate(sprites):
    if i == 4:
        x, y = 0, 130
    rectangles.append([x, y, sprite.width, sprite.height])
    page.paste(sprite, (x, y))
    x += sprite.width
page.save(DEST / 'foliage.png', optimize=True)
manifest = {'sourceSHA256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            'size': list(page.size), 'regions': rectangles,
            'pngBytes': (DEST / 'foliage.png').stat().st_size,
            'decodedPixelBytes': page.width * page.height * 4}
(DEST / 'foliage.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
