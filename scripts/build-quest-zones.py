"""Pack supplied native zone-kit PNGs without resampling. Pillow required.

Import once with --import-kit PATH. Subsequent builds use the preserved native
files in assets/quest-zones/native/. The simulator and its sources are read-only.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/quest-zones'
parser = argparse.ArgumentParser()
parser.add_argument('--import-kit', type=Path)
args = parser.parse_args()
native = DEST / 'native'
if args.import_kit:
    origin = args.import_kit.resolve()
    original = json.loads((origin / 'manifest.json').read_text())
    for asset in original['assets']:
        source = (origin / asset['file']).resolve()
        if not source.is_relative_to(origin) or source.suffix != '.png':
            raise ValueError('Invalid native asset path')
        target = native / asset['file']; target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    for name in ['manifest.json', 'README.md', 'houses-cartoon-v2-prompt.txt', 'pool-sheds-v3-prompt.txt', 'trees-prompt.txt', 'grass-prompt.txt']:
        shutil.copyfile(origin / name, native / name)
    for name in sorted({a['source'] for a in original['assets'] if a.get('source', '').startswith('sources/')}):
        source = (origin / name).resolve()
        if not source.is_relative_to(origin): raise ValueError('Invalid source path')
        target = native / name; target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

original = json.loads((native / 'manifest.json').read_text())
assets = original['assets']
if len(assets) != 55 or len({a['id'] for a in assets}) != 55:
    raise ValueError('Expected the complete 55-asset native kit')
def metadata(asset, picture):
    return {'anchor': asset['anchor'], 'family': asset['family'],
        'identity': asset['identity'], 'stage': asset['stage'], 'native': 'native/' + asset['file'],
        'pngSHA256': hashlib.sha256((native / asset['file']).read_bytes()).hexdigest(),
        'rgbaSHA256': hashlib.sha256(picture.tobytes()).hexdigest(),
        'source': asset.get('source'), 'sourceRect': asset.get('sourceRect'), 'sampling': asset.get('sampling')}

placements = []; references = {}; x = y = row_height = 0
for asset in sorted(assets, key=lambda a: (-a['size'][1], -a['size'][0], a['id'])):
    picture = Image.open(native / asset['file']).convert('RGBA')
    if list(picture.size) != asset['size']: raise ValueError('Native dimensions changed: ' + asset['id'])
    alpha = set(picture.getchannel('A').tobytes())
    if not alpha.issubset({0, 255}) or asset['family'] == 'ground' and alpha != {255}:
        raise ValueError('Unexpected transparency: ' + asset['id'])
    # Keep the alternative buildings as source references. The game retains
    # its original house/shelter perspective, so do not download unused art.
    if asset['family'] == 'houses':
        references[asset['id']] = metadata(asset, picture)
        continue
    if x + picture.width > 1024: x = 0; y += row_height + 2; row_height = 0
    placements.append((asset, picture, x, y)); x += picture.width + 2; row_height = max(row_height, picture.height)
page = Image.new('RGBA', (1024, y + row_height))
regions = {}
for asset, picture, x, y in placements:
    page.paste(picture, (x, y))
    w, h = picture.size
    if page.crop((x, y, x + w, y + h)).tobytes() != picture.tobytes():
        raise ValueError('Packing changed native pixels')
    regions[asset['id']] = {'r': [x, y, w, h], **metadata(asset, picture)}
page.save(DEST / 'zones.png', optimize=True)
manifest = {'version': 'coastal-zone-kit-2', 'page': 'zones.png', 'regions': regions, 'references': references,
            'pngBytes': (DEST / 'zones.png').stat().st_size, 'decodedPixelBytes': page.width * page.height * 4}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'assets': len(regions), 'size': page.size, 'pngBytes': manifest['pngBytes'], 'decodedPixelBytes': manifest['decodedPixelBytes'], 'pixelsUnchanged': True}))
