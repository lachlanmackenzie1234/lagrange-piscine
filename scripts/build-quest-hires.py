"""Import generated hub/NPC art and re-export original large sprites at native HD sizes.

This is deterministic asset normalization/atlas packing, not image generation.
ImageGen sources and exact prompts are preserved beside the generated pack.
"""
from pathlib import Path
import argparse, importlib.util, json, hashlib, math, random
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('legacy', type=Path, help='Published v3-complete source pack')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
dest = root/'assets/quest-hires'; source = dest/'source'

def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result

art = module('legacy_pixel_export', args.legacy/'sources/pixel_export.py')
motion = module('legacy_motion', args.legacy/'animations/source/motion.py')
catalog = json.loads((args.legacy/'exports/manifest.json').read_text())
animations = json.loads((args.legacy/'animations/manifest.json').read_text())
assets = {a['id']: a for a in catalog['assets']}
out = {'version': 'pocket-coast-hd-1', 'pixelRatio': 2, 'pages': [], 'clips': {}, 'sources': {}}

def static_clip(id, im, anchor=None):
    return {'id': id, 'images': [im], 'anchor': anchor or [0, 0], 'loop': False, 'durations': [1], 'offsets': [[0, 0]], 'end': False, 'reduced': 0}

def pack(name, records):
    entries = []; unique = {}; x = y = row_h = width = 0
    for record in records:
        rects = []
        for im in record['images']:
            key = (im.size, hashlib.sha256(im.tobytes()).hexdigest())
            if key not in unique:
                if x + im.width > 1024: x = 0; y += row_h; row_h = 0
                rect = [x, y, im.width, im.height]; unique[key] = rect
                entries.append((im, x, y)); x += im.width; row_h = max(row_h, im.height); width = max(width, x)
            rects.append(unique[key])
        out['clips'][record['id']] = {'page': name+'.png', 'px': 2, 'a': record['anchor'], 'loop': record['loop'], 'duration': sum(record['durations']), 'end': record['end'], 'reduced': record['reduced'], 'f': [{'r': r, 'd': d, 'o': o} for r, d, o in zip(rects, record['durations'], record['offsets'])]}
    page = Image.new('RGBA', (width, y+row_h))
    for im, x, y in entries: page.paste(im, (x, y))
    page.save(dest/(name+'.png')); out['pages'].append(name+'.png')

for id in ['bureau', 'depot']:
    path = source/(id+'.png'); im = Image.open(path).convert('RGB').resize((512, 384), Image.Resampling.LANCZOS)
    im = im.quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    pack(id, [static_clip('scene/'+id, im)])
    out['sources'][id] = hashlib.sha256(path.read_bytes()).hexdigest()

npcs = []; keeper = []
heights = {'jojo': 54, 'karine': 54, 'matt': 60, 'jp': 64, 'pj': 62, 'keeper': 64}
directions = ['south', 'east', 'north', 'west']
for id, height in heights.items():
    path = source/(id+'.png'); sheet = Image.open(path).convert('RGBA')
    out['sources'][id] = hashlib.sha256(path.read_bytes()).hexdigest()
    for i, direction in enumerate(directions):
        x = i % 2; y = i // 2
        cell = sheet.crop((x*sheet.width//2, y*sheet.height//2, (x+1)*sheet.width//2, (y+1)*sheet.height//2))
        alpha = cell.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
        cell.putalpha(alpha); bbox = alpha.getbbox()
        if bbox is None: raise ValueError('Empty generated character: '+id)
        small = art.normalize(cell.crop(bbox), (48, height), margin=1, colours=40)
        frame = Image.new('RGBA', (48, 64)); frame.paste(small, (0, 64-height))
        anchor = motion.feet(frame); shift = 24-anchor[0]
        aligned = Image.new('RGBA', (48, 64)); aligned.paste(frame, (shift, 0)); frame = aligned
        if id == 'keeper': keeper.append(static_clip('keeper/base/'+direction, frame, [24, 63]))
        else: npcs.append({'id': 'npc/'+id+'/'+direction, 'images': [frame]*4, 'anchor': [24, 63], 'loop': True, 'durations': [280]*4, 'offsets': [[0, 0], [0, 0], [0, -1], [0, 0]], 'end': False, 'reduced': 0})
pack('npcs', npcs); pack('keepers', keeper)

def large(id, size):
    a = assets[id]; path = args.legacy/'exports'/a['large']
    im = Image.open(path).convert('RGBA')
    return art.normalize(im, size, margin=2, colours=32)

species = {res: large('species-'+res, (48, 48)) for res in ['EC', 'AG', 'EP', 'EPP', 'GP']}
pool_assets = [a for a in catalog['assets'] if a['category'] == 'pool-creatures']
pool_bases = {}
for a in pool_assets:
    pool = a.get('poolId') or a['variation']['identity']; base = species[a['base'].replace('species-', '')]
    pool_bases[pool] = art.cosmetic_variant(base, pool)[0]
actor_records = []
for id, clip in animations['clips'].items():
    category = clip['category']
    if category not in ('monster', 'species', 'pool-creature'): continue
    parts = id.split('/'); identity = parts[1]; action = parts[2]
    if category == 'monster': base = large('monster-'+identity, (56, 48))
    elif category == 'species': base = species[identity]
    else: base = pool_bases[identity]
    frames = [motion.pose(base, action, i) for i in range(len(clip['frames']))]
    actor_records.append({'id': id, 'images': frames, 'anchor': motion.feet(base), 'loop': clip['loop'], 'durations': [f['durationMs'] for f in clip['frames']], 'offsets': [[v*2 for v in f['offset']] for f in clip['frames']], 'end': clip['disappearOnEnd'], 'reduced': clip['reducedMotionFrame']})
pack('actors', actor_records)

icons = []
for a in catalog['assets']:
    if a['category'] != 'equipment-base': continue
    base = large(a['id'], (32, 32))
    for rarity in art.RARITIES:
        rar = rarity['id']; im = art.rarity_icon(base, rar)
        icons.append(static_clip('item/'+a['set']+'/'+a['gameSlot']+'/'+rar+'/plain', im))
        if rar != 'common': icons.append(static_clip('item/'+a['set']+'/'+a['gameSlot']+'/'+rar+'/cursed', art.curse(im)))
for a in catalog['assets']:
    if a['category'] == 'resources': icons.append(static_clip(a['id'], large(a['id'], (32, 32))))
crate = large('utility-crate', (32, 32))
for rarity in art.RARITIES: icons.append(static_clip('crate/'+rarity['id'], art.rarity_icon(crate, rarity['id'])))
for id, col in [('small', '#d95362'), ('large', '#a052c9')]:
    im = Image.new('RGBA', (32, 32)); d = ImageDraw.Draw(im)
    d.rectangle((12, 2, 19, 7), fill='#3b354b'); d.rectangle((13, 3, 18, 5), fill='#cb9f61')
    d.rounded_rectangle((7, 9, 24, 29), radius=5, fill='#25344c'); d.rounded_rectangle((9, 11, 22, 27), radius=4, fill='#c7e8e4')
    d.rounded_rectangle((10, 16, 21, 26), radius=3, fill=col); d.rectangle((11, 12, 12, 18), fill='#fff8da')
    d.polygon([(12, 19), (14, 18), (16, 20), (18, 18), (20, 19), (20, 21), (16, 25), (12, 21)], fill='#fff5db')
    icons.append(static_clip('potion/'+id, im))
pack('icons', icons)

tiles = []
for kind, colours in {
    'grass': ['#87c6a1', '#75b58f', '#a3d3ac', '#66a98c'], 'sand': ['#e9dbb1', '#d1bd8f', '#f7e7be', '#dbc99f'],
    'gravel': ['#ccc6b3', '#b3ac9b', '#e5ddca', '#c0b8a7'], 'slab': ['#e4d2a4', '#c8b589', '#f5e5bb', '#dcc899'],
    'deck': ['#b99058', '#826845', '#d7b272', '#a08051'], 'paving': ['#d1c9c1', '#a99da6', '#e9e0d5', '#bdb4b6'],
}.items():
    for variant in range(4):
        rand = random.Random(kind + str(variant)); im = Image.new('RGBA', (32, 32), colours[0]); d = ImageDraw.Draw(im)
        if kind in ('slab', 'paving'):
            d.line((0, 0, 31, 0), fill=colours[1]); d.line((0, 0, 0, 31), fill=colours[1]); d.line((1, 1, 30, 1), fill=colours[2])
            d.line((16, 0, 16, 16), fill=colours[1]); d.line((0, 16, 31, 16), fill=colours[1])
        elif kind == 'deck':
            for y in (0, 8, 16, 24):
                d.line((0, y, 31, y), fill=colours[1]); d.line((0, y + 1, 31, y + 1), fill=colours[2]); d.point((3, y + 4), fill=colours[1]); d.point((28, y + 4), fill=colours[1])
        for _ in range(9 if kind == 'grass' else 5):
            x, y = rand.randrange(2, 29), rand.randrange(2, 29)
            d.rectangle((x, y, x + rand.randrange(1, 4), y + 1), fill=colours[1]); d.point((x + 1, y - 1), fill=colours[2])
        tiles.append(static_clip(f'tile/{kind}/{variant}', im))
pack('tiles', tiles)

water = []
for state, colours in {'calme': ['#4d9bc3', '#78c5d9', '#a6dfdf'], 'traite': ['#4aa6b5', '#78ccca', '#b6e2d6'], 'sauvage': ['#649e75', '#89bb80', '#b9d599'], 'critique': ['#526f54', '#769466', '#9eae7a']}.items():
    frames = []
    for frame in range(8):
        im = Image.new('RGBA', (32, 32), colours[0]); pixels = im.load(); phase = frame * math.tau / 8
        for y in range(32):
            for x in range(32):
                a = abs(math.sin(math.pi * (x + 2 * math.sin(y * math.tau / 32 + phase)) / 16))
                b = abs(math.sin(math.pi * (y + 2 * math.sin(x * math.tau / 32 - phase)) / 16))
                if min(a, b) < .10: pixels[x, y] = art.colour(colours[2] if max(a, b) < .5 else colours[1]) + (255,)
        frames.append(im)
    water.append({'id': 'water/'+state, 'images': frames, 'anchor': [0, 0], 'loop': True, 'durations': [150]*8, 'offsets': [[0, 0]]*8, 'end': False, 'reduced': 0})
pack('water', water)

(dest/'manifest.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':'))+'\n')
raw = 0
for name in out['pages']:
    im = Image.open(dest/name); raw += im.width*im.height*4
report = {'pages': len(out['pages']), 'clips': len(out['clips']), 'pngBytes': sum((dest/p).stat().st_size for p in out['pages']), 'decodedPixelBytes': raw}
(dest/'verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))
