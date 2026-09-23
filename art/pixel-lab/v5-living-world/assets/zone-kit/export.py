"""Package the three ImageGen atlases into native, bottom-anchored PNGs.

Run from any directory with Python, Pillow, NumPy and SciPy. Sources are never
modified. Connected-component masks separate mature crowns whose bounds overlap.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, label, find_objects

ROOT = Path(__file__).resolve().parent
ZONES = ['EC', 'AG', 'EP', 'EPP', 'GP']
SPECIES = ['oak', 'pine', 'umbrella', 'holm', 'birch']
SIZES = {
    'small': [(40, 48), (32, 54), (46, 46), (38, 44), (30, 54)],
    'medium': [(70, 82), (58, 90), (80, 80), (66, 76), (50, 88)],
    'large': [(108, 120), (96, 137), (116, 116), (100, 111), (82, 132)],
}

def objects(sheet, y0, y1):
    rgba = np.array(sheet)
    mask = rgba[y0:y1, :, 3] > 150
    labels, _ = label(binary_dilation(mask, iterations=1))
    groups = []
    for number, bounds in enumerate(find_objects(labels), 1):
        selected = (labels == number) & mask
        if selected.sum() < 500:
            continue
        ys, xs = np.where(selected)
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        top, bottom = int(ys.min()), int(ys.max()) + 1
        cut = rgba[y0+top:y0+bottom, x0:x1].copy()
        cut[:, :, 3] = np.where(selected[top:bottom, x0:x1], cut[:, :, 3], 0)
        groups.append((x0, [x0, y0+top, x1-x0, bottom-top], Image.fromarray(cut)))
    groups.sort(key=lambda group: group[0])
    if len(groups) != 5:
        raise ValueError(f'Expected five isolated sprites in row {y0}:{y1}, found {len(groups)}')
    return groups

def native(cut, size):
    w, h = size
    factor = min((w-2) / cut.width, (h-2) / cut.height)
    dw, dh = round(cut.width*factor), round(cut.height*factor)
    resized = cut.resize((dw, dh), Image.Resampling.LANCZOS)
    pixels = np.array(resized)
    pixels[:, :, 3] = np.where(pixels[:, :, 3] > 130, 255, 0)
    pixels[:, :, :3] = np.minimum(248, np.round(pixels[:, :, :3].astype(float)/8)*8).astype('uint8')
    pixels[pixels[:, :, 3] == 0] = 0
    output = Image.new('RGBA', (w, h))
    offset = [(w-dw)//2, h-dh-1]
    output.paste(Image.fromarray(pixels), tuple(offset))
    return output, {'offset': offset, 'drawSize': [dw, dh]}

def main():
    manifest = {'version': 2, 'origin': 'ImageGen sprites and code-authored seamless meadow tiles',
                'anchor': 'bottom-centre', 'alpha': 'binary at native size', 'assets': []}
    plans = [
        ('pool-sheds-v3', [(0,714,'pump',(75,83))], ZONES),
        ('houses-cartoon-v2', [(0,520,'house',(150,126))], ZONES),
        ('trees', [(0,215,'small',None), (215,515,'medium',None), (515,971,'large',None)], SPECIES),
        ('grass', [(0,270,'cut',(32,8)), (270,550,'medium',(32,16)), (550,1024,'tall',(32,24))], ZONES),
    ]
    for atlas, rows, identities in plans:
        sheet = Image.open(ROOT / 'sources' / f'{atlas}.png').convert('RGBA')
        for y0, y1, kind, size in rows:
            for index, (_, rect, cut) in enumerate(objects(sheet, y0, y1)):
                identity = identities[index]
                sprite, sampling = native(cut, size or SIZES[kind][index])
                family = 'houses' if atlas.startswith(('houses','pool-sheds')) else atlas
                folder = 'houses-v2' if family == 'houses' else atlas
                path = f'{folder}/{identity}-{kind}.png'
                (ROOT / folder).mkdir(exist_ok=True)
                sprite.save(ROOT / path)
                manifest['assets'].append({'id': f'{identity}-{kind}', 'family': family, 'identity': identity,
                    'stage': kind, 'file': path, 'size': list(sprite.size), 'anchor': [sprite.width/2, sprite.height],
                    'source': f'sources/{atlas}.png', 'sourceRect': rect, 'sampling': sampling})
    if (ROOT/'manifest.json').exists():
        previous = json.loads((ROOT/'manifest.json').read_text())
        manifest['assets'].extend(a for a in previous['assets'] if a['family'] == 'ground')
    (ROOT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(f'Exported {len(manifest["assets"])} native assets')

if __name__ == '__main__':
    main()
