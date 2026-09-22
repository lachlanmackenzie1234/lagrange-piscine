"""Normalize the user's v5 tree study for the runtime. Pillow required."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-world'
source_path = DEST / 'source/coastal-tree-species.png'
source = Image.open(source_path).convert('RGBA')
spec = json.loads((DEST / 'source/tree-species-manifest.json').read_text())
sizes = {'oak': (108, 120), 'pine': (78, 137), 'umbrella': (116, 116), 'holm': (100, 111), 'birch': (82, 132)}
sprites = []
for variant, row in enumerate(spec['rows']):
    for col in spec['columns']:
        crop = source.crop((col['x'], row['y'], col['x'] + col['width'], row['y'] + row['height']))
        bbox = crop.getchannel('A').point(lambda a: 255 if a >= 180 else 0).getbbox()
        crop = crop.crop(bbox)
        w, h = sizes[col['id']]
        if variant: w, h = round(w * .84), round(h * .84)
        ratio = min((w - 4) / crop.width, (h - 2) / crop.height)
        crop = crop.resize((round(crop.width * ratio), round(crop.height * ratio)), Image.Resampling.LANCZOS)
        alpha = crop.getchannel('A').point(lambda a: 255 if a >= 160 else 0)
        crop = crop.convert('RGB').quantize(colors=80, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        crop.putalpha(alpha)
        frame = Image.new('RGBA', (w, h)); frame.paste(crop, ((w - crop.width) // 2, h - crop.height - 1))
        sprites.append((col['id'] + '-' + str(variant), frame))
page = Image.new('RGBA', (512, 274)); regions = {}; x = y = 0; row_height = 0
for key, sprite in sprites:
    if x + sprite.width > 512: y += row_height; x = 0; row_height = 0
    if y + sprite.height > page.height: raise ValueError('Tree atlas exceeded budget')
    page.paste(sprite, (x, y)); regions[key] = [x, y, sprite.width, sprite.height]
    x += sprite.width; row_height = max(row_height, sprite.height)
page.save(DEST / 'trees.png', optimize=True)
manifest = {'page': 'trees.png', 'regions': regions, 'sourceSHA256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
            'pngBytes': (DEST / 'trees.png').stat().st_size, 'decodedPixelBytes': page.width * page.height * 4}
(DEST / 'trees.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'trees': len(regions), 'pngBytes': manifest['pngBytes'], 'decodedPixelBytes': manifest['decodedPixelBytes']}))
