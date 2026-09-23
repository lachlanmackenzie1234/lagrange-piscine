"""Normalize and pack the selected transparent ImageGen props. Requires Pillow.

The original source sheets stay intact. Crop bounds are authored around each
isolated object, then sampled to the map's native pixel budget.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-hubs'
SPECS = [
    ('boss-desk', 'office', (0, 0, 687, 572), (58, 94)),
    ('reception-counter', 'office', (687, 0, 687, 572), (112, 80)),
    ('cabinet', 'bureau', (0, 512, 768, 512), (40, 86)),
    ('sofa', 'office', (0, 572, 687, 573), (60, 104)),
    ('coffee-table', 'office', (687, 572, 687, 573), (46, 44)),
    ('gardener-van', 'vehicles', (0, 0, 800, 724), (104, 94)),
    ('karine-van', 'vehicles', (800, 0, 700, 724), (90, 80)),
    ('jojo-van', 'vehicles', (1500, 0, 672, 724), (90, 80)),
    ('workshop', 'depot', (640, 0, 896, 584), (220, 152)),
    ('potions', 'depot', (0, 584, 768, 440), (80, 84)),
    ('storage', 'depot', (768, 584, 768, 440), (108, 86)),
    ('scenic-black', 'spares', (0, 0, 1035, 828), (96, 76)),
    ('chair-east', 'chairs', (0, 0, 561, 720), (32, 40)),
    ('chair-south', 'chairs', (0, 720, 561, 682), (32, 40)),
]
source_files = {'bureau': 'bureau-props.png', 'depot': 'depot-props.png', 'vehicles': 'vehicles.png', 'office': 'office-layout.png', 'spares': 'spare-cars.png', 'chairs': 'chairs.png', 'plant': 'broadleaf-pot.png'}
sources = {name: Image.open(DEST / 'source' / file).convert('RGBA') for name, file in source_files.items()}
SPECS += [('broadleaf-pot', 'plant', (0, 0, *sources['plant'].size), (50, 66))]
sprites = []
for name, sheet, (x, y, w, h), (width, height) in SPECS:
    crop = sources[sheet].crop((x, y, x + w, y + h))
    mask = crop.getchannel('A').point(lambda a: 255 if a >= 150 else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError('Empty prop: ' + name)
    crop = crop.crop(bounds)
    scale = min((width - 4) / crop.width, (height - 3) / crop.height)
    size = (round(crop.width * scale), round(crop.height * scale))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    alpha = crop.getchannel('A').point(lambda a: 255 if a >= 145 else 0)
    crop = crop.convert('RGB').quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    crop.putalpha(alpha)
    sprite = Image.new('RGBA', (width, height))
    sprite.paste(crop, (round((width - size[0]) / 2), height - size[1] - 1))
    sprites.append((name, sprite))

placements = []
x = y = row_height = 0
for name, sprite in sprites:
    if x + sprite.width > 512:
        x = 0
        y += row_height
        row_height = 0
    placements.append((name, sprite, x, y))
    x += sprite.width
    row_height = max(row_height, sprite.height)
page = Image.new('RGBA', (512, y + row_height))
props = {}
for name, sprite, x, y in placements:
    page.paste(sprite, (x, y))
    props[name] = {'r': [x, y, sprite.width, sprite.height], 'anchor': [sprite.width // 2, sprite.height - 1]}
page.save(DEST / 'props.png', optimize=True)
manifest = {'version': 1, 'page': 'props.png', 'props': props,
            'sourceSHA256': {name: hashlib.sha256((DEST / 'source' / file).read_bytes()).hexdigest() for name, file in source_files.items()},
            'pngBytes': (DEST / 'props.png').stat().st_size,
            'decodedPixelBytes': page.width * page.height * 4}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'size': page.size, 'props': len(props), 'pngBytes': manifest['pngBytes'], 'decodedPixelBytes': manifest['decodedPixelBytes']}))

# Standalone vehicle exports include two requested spares. They are development
# assets, kept out of the runtime atlas and service-worker downloads until used.
exports = DEST / 'exports'
exports.mkdir(exist_ok=True)
vehicles = []
for name, sprite in sprites:
    if name.endswith('-van'):
        sprite.save(exports / (name + '.png'), optimize=True)
        vehicles.append({'id': name, 'file': name + '.png', 'size': list(sprite.size), 'inUse': True})
spares = Image.open(DEST / 'source/spare-cars.png').convert('RGBA')
for name, bounds, size in [
    ('scenic-black', (0, 0, 1035, 828), (96, 76)),
    ('polo-white', (1035, 0, 1900, 828), (86, 68)),
]:
    crop = spares.crop(bounds)
    bbox = crop.getchannel('A').point(lambda a: 255 if a >= 150 else 0).getbbox()
    crop = crop.crop(bbox)
    factor = min((size[0] - 4) / crop.width, (size[1] - 3) / crop.height)
    fitted = (round(crop.width * factor), round(crop.height * factor))
    crop = crop.resize(fitted, Image.Resampling.LANCZOS)
    alpha = crop.getchannel('A').point(lambda a: 255 if a >= 145 else 0)
    crop = crop.convert('RGB').quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    crop.putalpha(alpha)
    sprite = Image.new('RGBA', size)
    sprite.paste(crop, (round((size[0] - fitted[0]) / 2), size[1] - fitted[1] - 1))
    sprite.save(exports / (name + '.png'), optimize=True)
    vehicles.append({'id': name, 'file': name + '.png', 'size': list(size), 'inUse': name == 'scenic-black'})
(exports / 'manifest.json').write_text(json.dumps({'vehicles': vehicles}, indent=2) + '\n')
