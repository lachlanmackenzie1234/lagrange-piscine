"""Pack regenerated, naturally compact people. Pillow and NumPy required.

Source art is normalized once, preserving aspect ratio. No body bands are scaled.
The original ImageGen sources remain unchanged in assets/quest-people/source/.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-people'
NAMES = ['keeper', 'jojo', 'karine', 'matt', 'jp', 'pj']
DIRECTIONS = ['south', 'east', 'north', 'west']


def split_gap(counts):
    """ImageGen gutters vary slightly; find the clear central separation."""
    n = len(counts)
    start = None
    runs = []
    for i in range(int(n * .36), int(n * .64)):
        if counts[i] <= 3:
            if start is None:
                start = i
        elif start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, int(n * .64)))
    if not runs:
        raise ValueError('No clear central sprite gutter')
    lo, hi = max(runs, key=lambda r: r[1] - r[0])
    return (lo + hi) // 2


frames = []
sources = {}
for name in NAMES:
    path = DEST / 'source' / (name + '.png')
    if not path.exists():
        continue
    sheet = Image.open(path).convert('RGBA')
    opaque = np.asarray(sheet.getchannel('A')) >= 150
    sx = split_gap(opaque.sum(axis=0))
    sy = split_gap(opaque.sum(axis=1))
    cells = [(0, 0, sx, sy), (sx, 0, sheet.width, sy), (0, sy, sx, sheet.height), (sx, sy, sheet.width, sheet.height)]
    sources[name] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'cells': cells}
    for direction, bounds in zip(DIRECTIONS, cells):
        cell = sheet.crop(bounds)
        mask = cell.getchannel('A').point(lambda a: 255 if a >= 150 else 0)
        bbox = mask.getbbox()
        if bbox is None:
            raise ValueError('Empty view: ' + name + '/' + direction)
        crop = cell.crop(bbox)
        factor = min(56 / crop.width, 58 / crop.height)
        size = (round(crop.width * factor), round(crop.height * factor))
        crop = crop.resize(size, Image.Resampling.LANCZOS)
        alpha = crop.getchannel('A').point(lambda a: 255 if a >= 140 else 0)
        crop = crop.convert('RGB').quantize(colors=80, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        crop.putalpha(alpha)
        frame = Image.new('RGBA', (64, 64))
        frame.paste(crop, ((64 - size[0]) // 2, 63 - size[1]))
        mask = np.asarray(frame.getchannel('A')) > 0
        bottom = np.flatnonzero(mask.any(axis=1))[-1]
        xs = np.flatnonzero(mask[max(0, bottom - 2):bottom + 1].any(axis=0))
        centre = round((int(xs[0]) + int(xs[-1]) + 1) / 2)
        shift = 32 - centre
        if shift:
            aligned = Image.new('RGBA', (64, 64))
            aligned.paste(frame, (shift, 0))
            if np.count_nonzero(np.asarray(aligned.getchannel('A'))) != np.count_nonzero(mask):
                raise ValueError('Foot alignment would crop artwork: ' + name + '/' + direction)
            frame = aligned
        frames.append((name, direction, frame))

if not frames:
    raise ValueError('No source sheets')
columns = min(16, len(frames))
page = Image.new('RGBA', (columns * 64, ((len(frames) + columns - 1) // columns) * 64))
manifest = {'version': 'compact-native-64', 'pages': ['people.png'], 'clips': {}, 'sources': sources}
exports = DEST / 'exports'
exports.mkdir(exist_ok=True)
for i, (name, direction, frame) in enumerate(frames):
    x, y = (i % columns) * 64, (i // columns) * 64
    page.paste(frame, (x, y))
    frame.save(exports / f'{name}-{direction}.png', optimize=True)
    id = f'keeper/base/{direction}' if name == 'keeper' else f'npc/{name}/{direction}'
    timings = [1] if name == 'keeper' else [280] * 4
    offsets = [[0, 0]] if name == 'keeper' else [[0, 0], [0, 0], [0, -1], [0, 0]]
    manifest['clips'][id] = {'page': 'people.png', 'px': 4, 'nativeBody': True, 'a': [32, 63],
        'loop': name != 'keeper', 'duration': sum(timings), 'end': False, 'reduced': 0,
        'f': [{'r': [x, y, 64, 64], 'd': d, 'o': o} for d, o in zip(timings, offsets)]}
page.save(DEST / 'people.png', optimize=True)
manifest['pngBytes'] = (DEST / 'people.png').stat().st_size
manifest['decodedPixelBytes'] = page.width * page.height * 4
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'people': len(sources), 'views': len(frames), 'pngBytes': manifest['pngBytes'], 'decodedPixelBytes': manifest['decodedPixelBytes']}))
