"""V3 source art -> exact-size transparent assets and stable cosmetic variants.

Image slicing, resizing and seed-based exports follow the requested v4 format.
Only the supplied/source-art PNGs are used for character and inventory pixels.
"""
from pathlib import Path
from hashlib import sha256
import colorsys
import json
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

VERSION = 'pocket-coast-v3-assets-1'
ALPHA_CUTOFF = 128
ROOT = Path(__file__).resolve().parent.parent
SLICES = json.loads((ROOT/'sources/slices.json').read_text())
CATALOG = json.loads((ROOT/'catalog.json').read_text())
RARITIES = CATALOG['rarities']
DIRECTIONS = ['south', 'east', 'west', 'north']
SLOT_IDS = ['head', 'body', 'legs', 'feet', 'charm', 'pole', 'robot', 'brush']

def stable_seed(value):
    n = 2166136261
    for byte in str(value).encode('utf-8'):
        n = ((n ^ byte) * 16777619) & 0xffffffff
    return n

def colour(value):
    return tuple(int(value[i:i+2],16) for i in (1,3,5))

def slice_cell(stem, column, row):
    spec = SLICES[stem]
    source = Image.open(ROOT/'source-art'/f'{stem}.png').convert('RGBA')
    x0, x1 = spec['columns'][column:column+2]
    y0, y1 = spec['rowCuts'][column][row:row+2]
    override=spec.get('cellOverrides',{}).get(f'{column},{row}')
    if override:x0,y0,x1,y1=override
    cell = source.crop((x0,y0,x1,y1))
    a = np.array(cell)
    mask = a[:,:,3] >= ALPHA_CUTOFF
    ys,xs = np.where(mask)
    if not len(xs):
        raise ValueError(f'Empty sprite: {stem} row {row} column {column}')
    bounds = (int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1)
    # Discard faint generated fringes, preserve the high-res source colour/alpha.
    a[~mask] = 0
    trimmed = Image.fromarray(a).crop(bounds)
    meta = {'sheet':f'source-art/{stem}.png','column':column,'row':row,
            'cell':[x0,y0,x1,y1],
            'content':[x0+bounds[0],y0+bounds[1],x0+bounds[2],y0+bounds[3]],
            'sourceSize':list(trimmed.size)}
    return trimmed, meta

def normalize(source, size, margin=1, align='bottom', colours=24, scale=None):
    w,h=size
    factor=min((w-margin*2)/source.width,(h-margin*2)/source.height)
    if scale is not None:
        factor=min(factor,scale)
    sw=max(1,round(source.width*factor));sh=max(1,round(source.height*factor))
    reduced=source.resize((sw,sh),Image.Resampling.LANCZOS)
    raw=np.array(reduced)
    mask=raw[:,:,3]>=ALPHA_CUTOFF
    raw[~mask,:3]=[32,32,58]
    # A palette at the target resolution removes blended near-duplicate colours.
    rgb=Image.fromarray(raw[:,:,:3]).quantize(colors=colours,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
    quant=np.array(rgb)
    rgba=np.zeros((sh,sw,4),dtype=np.uint8);rgba[:,:,:3]=quant;rgba[:,:,3]=mask.astype(np.uint8)*255;rgba[~mask]=0
    sprite=Image.fromarray(rgba)
    out=Image.new('RGBA',size)
    x=(w-sw)//2;y=h-margin-sh if align=='bottom' else (h-sh)//2
    out.paste(sprite,(x,y))
    if out.getbbox() is None:
        raise ValueError('Normalization removed all sprite content')
    return out

def rarity_icon(base, rarity):
    """Keep material colours; add a corner clasp and countable rarity notches."""
    rank=next(i+1 for i,r in enumerate(RARITIES) if r['id']==rarity)
    col=colour(RARITIES[rank-1]['color'])+(255,)
    im=base.copy();draw=ImageDraw.Draw(im);w,h=im.size
    for i in range(rank):
        draw.point((1+i*2,h-1),fill=col)
    draw.point((w-2,0),fill=col)
    if rank>=4:
        draw.point((w-1,1),fill=col)
    if rank>=5:
        draw.point((w-3,1),fill=col)
    if rank==6:
        draw.point((w-2,2),fill=(255,236,201,255))
    return im

def curse(base):
    im=base.copy();d=ImageDraw.Draw(im)
    d.point([(0,0),(2,0),(1,1),(0,2),(2,2)],fill=(80,32,104,255))
    d.point((1,0),fill=(222,142,208,255))
    return im

def cosmetic_variant(base, identity, revision=0, namespace='creature'):
    if not isinstance(revision,int) or revision<0:
        raise ValueError('Revision must be a non-negative integer')
    seed=stable_seed(f'{VERSION}|{namespace}|{identity}|{revision}')
    pixels=np.array(base).copy()
    h,w=pixels.shape[:2]
    body=[]
    shift=((seed%17)-8)*.0025
    gain=.94+((seed>>5)%13)*.01
    sat_gain=.93+((seed>>10)%11)*.014
    for y in range(h):
        for x in range(w):
            if not pixels[y,x,3]:continue
            r,g,b=pixels[y,x,:3]/255
            hue,sat,val=colorsys.rgb_to_hsv(r,g,b)
            if sat>.32 and val>.25:
                rr,gg,bb=colorsys.hsv_to_rgb((hue+shift)%1,min(1,sat*sat_gain),min(1,val*gain))
                pixels[y,x,:3]=[round(rr*255),round(gg*255),round(bb*255)]
                # Protect the face. Mark only internal lower-body colour clusters.
                if y>=math.ceil(h*.59) and 1<=x<w-2 and 1<=y<h-2 and all(pixels[yy,xx,3]==255 for xx,yy in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]):
                    body.append((x,y))
    marks=[]
    for i in range(min(2+(seed>>15)%2,len(body))):
        j=stable_seed(f'{seed}|mark|{i}')%len(body);x,y=body[j]
        if (x,y) in marks:continue
        col=np.maximum(0,np.round(pixels[y,x,:3].astype(float)*(.72 if i%2 else 1.13))).clip(0,255).astype(np.uint8)
        pixels[y,x,:3]=col
        if (x+1,y) in body:pixels[y,x+1,:3]=col
        marks.append((x,y))
    return Image.fromarray(pixels),{'seed':seed,'revision':revision,'namespace':namespace,'identity':identity,'markings':[list(p) for p in marks],'hueShift':shift,'valueGain':gain}

SKINS=[((244,199,149),(197,136,84)),((230,169,113),(169,108,69)),((194,130,81),(132,80,54)),((148,91,59),(94,56,42)),((105,67,49),(67,43,36))]

def avatar_variant(base, identity, revision=0):
    seed=stable_seed(f'{VERSION}|avatar|{identity}|{revision}')
    light,dark=SKINS[seed%len(SKINS)]
    arr=np.array(base).copy();height,width=arr.shape[:2]
    changed=0
    for y in range(height):
        for x in range(width):
            if not arr[y,x,3]:continue
            r,g,b=arr[y,x,:3]/255;h,s,v=colorsys.rgb_to_hsv(r,g,b)
            face_zone=.22*height<=y<.52*height
            arm_zone=.45*height<=y<.76*height and (x<width*.31 or x>width*.66)
            if (face_zone or arm_zone) and .045<h<.112 and .25<s<.73 and v>.63 and r>g*1.12:
                f=max(0,min(1,(v-.48)/.5))
                arr[y,x,:3]=[round(dark[c]*(1-f)+light[c]*f) for c in range(3)]
                changed+=1
    return Image.fromarray(arr),{'seed':seed,'identity':identity,'revision':revision,'skinPalette':int(seed%len(SKINS)),'recolouredPixels':changed}

def equipment_variant(base, identity, rarity='common', revision=0, cursed=False):
    if cursed and rarity=='common':raise ValueError('Common equipment cannot be cursed')
    im,meta=cosmetic_variant(base,identity,revision,'equipment')
    im=rarity_icon(im,rarity)
    if cursed:im=curse(im)
    return im,{**meta,'rarity':rarity,'cursed':cursed}

def sha(image):
    return sha256(image.tobytes()).hexdigest()

def ground_anchor(image):
    """Floor point under the actual feet rather than the tool-inclusive canvas centre."""
    a=np.array(image)[:,:,3]
    ys,xs=np.where(a>0)
    if not len(xs):return [image.width//2,image.height-1]
    bottom=int(ys.max())
    fy,fx=np.where(a[max(0,bottom-2):bottom+1]>0)
    return [int(round(float(fx.mean()))),min(image.height-1,bottom+1)]

def item_name(set_info,item,rarity):
    epithet=CATALOG['epithets'].get(rarity)
    if rarity=='epic':epithet=set_info['epic']
    elif rarity=='legend':epithet=set_info['legend']
    elif isinstance(epithet,dict):epithet=epithet[item['gender']]
    return item['name']+' '+epithet

def atlas(images,columns,cell_size):
    result=Image.new('RGBA',(columns*cell_size[0],math.ceil(len(images)/columns)*cell_size[1]))
    for i,im in enumerate(images):result.paste(im,((i%columns)*cell_size[0],(i//columns)*cell_size[1]))
    return result

def contact(items,columns,title,subtitle='',cell=(170,165),scale=5):
    font_path=ROOT/'sources/PixelifySans-Regular.ttf'
    font=ImageFont.truetype(str(font_path),16);small=ImageFont.truetype(str(font_path),12);heading=ImageFont.truetype(str(font_path),28)
    width=columns*cell[0]+40;height=math.ceil(len(items)/columns)*cell[1]+100
    out=Image.new('RGB',(width,height),'#f5f1e5');d=ImageDraw.Draw(out)
    d.text((20,13),title,font=heading,fill='#293849');d.text((20,48),subtitle,font=small,fill='#687874')
    for i,(im,label,note) in enumerate(items):
        x=20+(i%columns)*cell[0];y=78+(i//columns)*cell[1]
        d.rectangle((x,y,x+cell[0]-13,y+cell[1]-12),outline='#d6cfbd',fill='#fffbee')
        max_w=cell[0]-27;max_h=cell[1]-55
        use_scale=max(1,min(scale,max_w//im.width,max_h//im.height))
        scaled=im.resize((im.width*use_scale,im.height*use_scale),Image.Resampling.NEAREST)
        px=x+(cell[0]-13-scaled.width)//2;py=y+6+(max_h-scaled.height)//2
        out.paste(scaled,(px,py),scaled)
        use_font=font
        for fs in range(16,9,-1):
            candidate=ImageFont.truetype(str(font_path),fs)
            if d.textbbox((0,0),label,font=candidate)[2]<=cell[0]-29:
                use_font=candidate;break
        d.text((x+9,y+cell[1]-46),label,font=use_font,fill='#293849')
        use_note=note
        while d.textbbox((0,0),use_note,font=small)[2]>cell[0]-29 and len(use_note)>4:
            use_note=use_note[:-4]+'...'
        d.text((x+9,y+cell[1]-27),use_note,font=small,fill='#687874')
    return out
