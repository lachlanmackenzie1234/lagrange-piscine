"""Pack aligned hairstyle edits, using the original keeper's scale for all styles.

Pillow and NumPy required. The full ImageGen sources stay unchanged.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-hair'
ref = Image.open(ROOT / 'assets/quest-people/source/keeper.png').convert('RGBA')
cells = json.loads((ROOT / 'assets/quest-people/manifest.json').read_text())['sources']['keeper']['cells']
page = Image.new('RGBA', (768, 64))
manifest = {'version': 'hair-native-64', 'pages': ['hair.png'], 'clips': {}, 'sources': {}}
(DEST / 'exports').mkdir(exist_ok=True)
for style_index, name in enumerate(['short', 'bald', 'long']):
    path = DEST / 'source' / (name + '.png')
    source = Image.open(path).convert('RGBA')
    if source.size != ref.size:
        raise ValueError('Hairstyle sheets must retain reference registration')
    manifest['sources'][name] = hashlib.sha256(path.read_bytes()).hexdigest()
    for view, (direction, cell) in enumerate(zip(['south', 'east', 'north', 'west'], cells)):
        original = ref.crop(cell)
        bounds = original.getchannel('A').point(lambda a: 255 if a >= 150 else 0).getbbox()
        factor = min(56 / (bounds[2] - bounds[0]), 58 / (bounds[3] - bounds[1]))
        crop = source.crop(cell)
        crop = crop.crop(crop.getchannel('A').point(lambda a: 255 if a >= 150 else 0).getbbox())
        # Bald heads are naturally shorter. Never enlarge them to fill the frame.
        size = (round(crop.width * factor), round(crop.height * factor))
        if size[0] > 62 or size[1] > 62:
            raise ValueError('Hairstyle exceeds native frame')
        crop = crop.resize(size, Image.Resampling.LANCZOS)
        alpha = crop.getchannel('A').point(lambda a: 255 if a >= 140 else 0)
        crop = crop.convert('RGB').quantize(colors=80, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        crop.putalpha(alpha)
        frame = Image.new('RGBA', (64, 64))
        frame.paste(crop, ((64 - size[0]) // 2, 63 - size[1]))
        mask = np.asarray(frame.getchannel('A')) > 0
        bottom = np.flatnonzero(mask.any(axis=1))[-1]
        xs = np.flatnonzero(mask[bottom - 2:bottom + 1].any(axis=0))
        shift = 32 - round((int(xs[0]) + int(xs[-1]) + 1) / 2)
        aligned = Image.new('RGBA', (64, 64)); aligned.paste(frame, (shift, 0))
        if np.count_nonzero(np.asarray(aligned.getchannel('A'))) != np.count_nonzero(mask):
            raise ValueError('Alignment crops hairstyle')
        x = (style_index * 4 + view) * 64
        page.paste(aligned, (x, 0)); aligned.save(DEST / 'exports' / f'{name}-{direction}.png', optimize=True)
        id = f"keeper/{'base' if name == 'short' else name}/{direction}"
        manifest['clips'][id] = {'page': 'hair.png', 'px': 4, 'nativeBody': True, 'hairStyle': name, 'a': [32, 63],
            'loop': False, 'duration': 1, 'reduced': 0, 'f': [{'r': [x, 0, 64, 64], 'd': 1, 'o': [0, 0]}]}
page.save(DEST / 'hair.png', optimize=True)
manifest['pngBytes'] = (DEST / 'hair.png').stat().st_size
manifest['decodedPixelBytes'] = page.width * page.height * 4
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'views': 12, 'pngBytes': manifest['pngBytes'], 'decodedPixelBytes': manifest['decodedPixelBytes']}))
