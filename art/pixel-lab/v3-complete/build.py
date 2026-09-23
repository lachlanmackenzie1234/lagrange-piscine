#!/usr/bin/env python3
"""Build the complete static Pocket Coast v3 catalog from its actual source sheets."""
from pathlib import Path
from hashlib import sha256
from collections import Counter
import argparse
import json
import shutil
import sys
from PIL import Image, __version__ as PILLOW_VERSION
import numpy as np

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'sources'))
from pixel_export import (VERSION,CATALOG,RARITIES,DIRECTIONS,SLOT_IDS,slice_cell,normalize,
    rarity_icon,curse,cosmetic_variant,avatar_variant,equipment_variant,item_name,atlas,contact,sha,ground_anchor)

parser=argparse.ArgumentParser()
parser.add_argument('--base-only',action='store_true',help='Preview original v3 artwork before supplemental art is available.')
parser.add_argument('--revision',type=int,default=0,help='Cosmetic reroll for this export; zero is the reviewed baseline.')
args=parser.parse_args()
if args.revision<0:parser.error('Revision must be non-negative')
OUT=ROOT/'exports'
OUT.mkdir(exist_ok=True)
POOLS=json.loads((ROOT/'pools.json').read_text())
entries=[];slices={};cache={}

def save(im,id,category,path=None,**meta):
    path=path or f'native/{category}/{id}.png'
    target=OUT/path;target.parent.mkdir(parents=True,exist_ok=True);im.save(target,optimize=False)
    entry={'id':id,'category':category,'file':path,'width':im.width,'height':im.height,'sha256':sha256(target.read_bytes()).hexdigest(),'pixelSha256':sha(im),**meta}
    if 'A' in im.getbands():
        alpha=im.getchannel('A');hist=alpha.histogram()
        entry.update(transparentPixels=hist[0],partialAlphaPixels=sum(hist[1:255]),contentBounds=list(alpha.getbbox() or (0,0,0,0)))
    entries.append(entry);cache[id]=im
    return im

def from_cell(stem,c,r,id,size,category,**meta):
    hd,source=slice_cell(stem,c,r)
    slices[id]=source
    high_path=OUT/'large'/category/(id+'.png');high_path.parent.mkdir(parents=True,exist_ok=True);hd.save(high_path)
    im=normalize(hd,size,align='centre' if category in ('equipment-base','resources','utilities') else 'bottom',colours=16 if size==(16,16) else 24)
    # Preserve the rake's defining teeth, which otherwise merge at sixteen pixels.
    if id=='EP-pole':
        from PIL import ImageDraw
        brush=ImageDraw.Draw(im)
        brush.line((9,2,14,2),fill=(92,52,30,255))
        for xx in (9,11,13):brush.line((xx,1,xx,4),fill=(113,65,33,255))
        meta['nativeRetouch']='Three rake teeth reinforced after reduction.'
    if 'feetAnchor' in meta:meta['feetAnchor']=ground_anchor(im)
    return save(im,id,category,source=source,large=f'large/{category}/{id}.png',**meta)

equipment={};trainers={};species={};monsters={};equipment_seeded=[]
for row,s in enumerate(CATALOG['sets']):
    for col,slot in enumerate(SLOT_IDS):
        item=s['items'][col];id=f"{s['id']}-{slot}"
        base=from_cell('05-equipment-icons',col,row,id,(16,16),'equipment-base',set=s['id'],slot=slot,gameSlot=item['slot'],name=item['name'])
        equipment[(s['id'],slot)]=base
        sample_index=row*8+col;sample_rarity=RARITIES[sample_index%6]['id'];sample_cursed=sample_rarity!='common' and sample_index%7==0
        rolled,visual=equipment_variant(base,id+'|loot-sample-1',sample_rarity,args.revision,sample_cursed)
        sample_id='seeded-'+id
        save(rolled,sample_id,'equipment-seeded',set=s['id'],slot=slot,rarity=sample_rarity,cursed=sample_cursed,variation=visual,base=id)
        equipment_seeded.append(sample_id)
        for rar in RARITIES:
            variant=rarity_icon(base,rar['id']);vid=f"{id}-{rar['id']}"
            save(variant,vid,'equipment',set=s['id'],slot=slot,gameSlot=item['slot'],rarity=rar['id'],name=item_name(s,item,rar['id']),base=id)
            if rar['id']!='common':save(curse(variant),vid+'-cursed','equipment-cursed',set=s['id'],slot=slot,rarity=rar['id'],cursed=True,base=vid)
    # Use one scale for the four views of each outfit, then anchor all feet alike.
    views=[slice_cell('03-trainer-directions',col,row) for col in range(4)]
    common_scale=min(min(22/im.width,30/im.height) for im,_ in views)
    for col,(hd,source) in enumerate(views):
        direction=DIRECTIONS[col];id=f"{s['id']}-{direction}";slices[id]=source
        high_path=OUT/'large/characters'/f'{id}.png';high_path.parent.mkdir(parents=True,exist_ok=True);hd.save(high_path)
        native=normalize(hd,(24,32),scale=common_scale)
        trainers[(s['id'],direction)]=save(native,id,'characters',set=s['id'],direction=direction,pose='idle',feetAnchor=ground_anchor(native),source=source,large=f'large/characters/{id}.png')

species_cells={'EC':(0,0),'AG':(1,0),'EP':(2,0),'EPP':(3,0),'GP':(0,1)}
for s in CATALOG['creatures']:
    col,row=species_cells[s['id']]
    species[s['id']]=from_cell('04-creatures-monsters',col,row,'species-'+s['id'],(24,24),'species',set=s['id'],name=s['name'],feetAnchor=[12,23])
for p in POOLS:
    variant,seed=cosmetic_variant(species[p['res']],p['id'],args.revision)
    save(variant,'creature-'+p['id'],'pool-creatures',poolId=p['id'],set=p['res'],feetAnchor=ground_anchor(variant),variation=seed,base='species-'+p['res'])

original_monsters={'algue':(1,1),'calcaire':(2,1),'filtre':(3,1)}
missing_monsters={'moutarde':(0,0),'feuilles':(1,0),'aiguille':(2,0),'moustique':(3,0),'sable':(0,1),'gland':(1,1),'locataire':(2,1)}
for m in CATALOG['monsters']:
    if m['id'] in original_monsters:
        stem='04-creatures-monsters';col,row=original_monsters[m['id']]
    else:
        if args.base_only:continue
        stem='06-missing-bestiary';col,row=missing_monsters[m['id']]
    base=from_cell(stem,col,row,'monster-'+m['id'],(28,24),'monsters-base',monsterId=m['id'],name=m['name'],feetAnchor=[14,23])
    monsters[m['id']]=base
    for rar in RARITIES:
        save(rarity_icon(base,rar['id']),f"{m['id']}-{rar['id']}",'monster-tiers',monsterId=m['id'],rarity=rar['id'],base='monster-'+m['id'],feetAnchor=ground_anchor(base))
    for p in POOLS:
        variant,seed=cosmetic_variant(base,p['id']+'|'+m['id'],args.revision,'monster')
        save(variant,f"{p['id']}-{m['id']}",'pool-monsters',poolId=p['id'],monsterId=m['id'],base='monster-'+m['id'],variation=seed,feetAnchor=ground_anchor(base))

# Ten reproducible avatar examples; each preset shares one appearance across four views.
for n in range(10):
    s=CATALOG['sets'][n%5];identity=f'keeper-{n+1:02d}'
    for direction in DIRECTIONS:
        variant,seed=avatar_variant(trainers[(s['id'],direction)],identity,args.revision)
        save(variant,identity+'-'+direction,'avatar-presets',set=s['id'],direction=direction,pose='idle',feetAnchor=ground_anchor(variant),variation=seed,base=s['id']+'-'+direction)

resources={};utilities={};actions={}
if not args.base_only:
    resource_ids=['algue','moutarde','feuilles','aiguille','calcaire','moustique','filtre','sable','gland','locataire']
    for i,mid in enumerate(resource_ids):
        name=next(m['resource'] for m in CATALOG['monsters'] if m['id']==mid)
        resources[mid]=from_cell('07-resources-and-utilities',i%5,i//5,'resource-'+mid,(16,16),'resources',monsterId=mid,name=name)
    utility_ids=['crate','choc','phm','floc','lavage','coin','xp','health','ap','mp']
    for i,id in enumerate(utility_ids):
        utilities[id]=from_cell('07-resources-and-utilities',i%5,2+i//5,'utility-'+id,(16,16),'utilities',name=id)
    for rar in RARITIES:save(rarity_icon(utilities['crate'],rar['id']),'crate-'+rar['id'],'crates',rarity=rar['id'],base='utility-crate')
    for move in CATALOG['moves']:
        base=equipment[('EC',{'perche':'pole','balai':'brush','robot':'robot'}[move['id']])] if move['id'] in ('perche','balai','robot') else utilities[move['id']]
        actions[move['id']]=save(base,'action-'+move['id'],'actions',moveId=move['id'],name=move['name'])

def save_atlas(id,ids,columns,size):
    im=atlas([cache[i] for i in ids],columns,size)
    frames=[{'id':name,'x':i%columns*size[0],'y':i//columns*size[1],'width':size[0],'height':size[1]} for i,name in enumerate(ids)]
    save(im,id,'atlas',path=f'atlases/{id}.png',cellSize=list(size),columns=columns,frames=frames)

save_atlas('characters',[s['id']+'-'+d for s in CATALOG['sets'] for d in DIRECTIONS],4,(24,32))
save_atlas('avatar-presets',[f'keeper-{n+1:02d}-{d}' for n in range(10) for d in DIRECTIONS],4,(24,32))
save_atlas('species',['species-'+s['id'] for s in CATALOG['creatures']],5,(24,24))
save_atlas('pool-creatures',['creature-'+p['id'] for p in POOLS],8,(24,24))
save_atlas('equipment-seeded',equipment_seeded,8,(16,16))
for rar in RARITIES:
    save_atlas('equipment-'+rar['id'],[s['id']+'-'+slot+'-'+rar['id'] for s in CATALOG['sets'] for slot in SLOT_IDS],8,(16,16))
    if rar['id']!='common':save_atlas('equipment-'+rar['id']+'-cursed',[s['id']+'-'+slot+'-'+rar['id']+'-cursed' for s in CATALOG['sets'] for slot in SLOT_IDS],8,(16,16))
save_atlas('monsters-base',['monster-'+mid for mid in monsters],5,(28,24))
save_atlas('monster-tiers',[mid+'-'+r['id'] for mid in monsters for r in RARITIES],6,(28,24))
save_atlas('pool-monsters',[p['id']+'-'+mid for p in POOLS for mid in monsters],len(monsters),(28,24))
if not args.base_only:
    save_atlas('resources',['resource-'+mid for mid in resources],5,(16,16))
    save_atlas('utilities',['utility-'+id for id in utilities],5,(16,16))
    save_atlas('crates',['crate-'+r['id'] for r in RARITIES],6,(16,16))
    save_atlas('actions',['action-'+id for id in actions],7,(16,16))

previews=OUT/'previews';previews.mkdir(exist_ok=True)
contact([(trainers[(s['id'],d)],s['id']+' / '+d,'24 x 32 / idle') for s in CATALOG['sets'] for d in DIRECTIONS],4,'V3 / FIVE KEEPERS','Original v3 views: south, east, west, north. Static poses.',cell=(175,190),scale=4).save(previews/'01-characters.png')
contact([(equipment[(s['id'],slot)],s['id']+' / '+slot,'16 x 16') for s in CATALOG['sets'] for slot in SLOT_IDS],8,'V3 / FORTY EQUIPMENT DESIGNS','Five sets. Eight distinct slots. Original v3 artwork.',cell=(125,133),scale=5).save(previews/'02-equipment.png')
contact([(cache['creature-'+p['id']],p['res']+' '+p['unit'],'24 x 24 / fixed seed') for p in POOLS],6,'V3 / 23 POOL CREATURES','Species identity stays stable; body tint and markings follow the pool seed.',cell=(165,167),scale=4).save(previews/'03-pool-creatures.png')
contact([(monsters[m['id']],m['name'],'28 x 24') for m in CATALOG['monsters'] if m['id'] in monsters],5,'V3 / THE COMPLETE BESTIARY','Ten pool problems with their own silhouettes.',cell=(205,172),scale=4).save(previews/'04-monsters.png')
contact([(cache['EC-head-'+r['id']],r['name'],'16 x 16 / set retained') for r in RARITIES]+[(cache['EC-head-'+r['id']+'-cursed'],r['name']+' / cursed','purple curse mark') for r in RARITIES if r['id']!='common'],6,'V3 / RARITY AND CURSES','Grey, green, blue, purple, amber, red. Common items cannot be cursed.',cell=(170,133),scale=5).save(previews/'05-rarity-and-curses.png')
if not args.base_only:
    contact([(resources[mid],next(m['resource'] for m in CATALOG['monsters'] if m['id']==mid),'16 x 16 / resource') for mid in resources]+[(utilities[id],id,'16 x 16 / support') for id in utilities],5,'V3 / RESOURCES AND SUPPORT','Crafting drops, loot crate, treatment actions, currency and status.',cell=(205,143),scale=5).save(previews/'06-resources-and-support.png')

# Include the earlier pool-map generator as a separate, reproducible world module.
world_path=ROOT/'world/exports/manifest.json'
world_manifest=None
if world_path.exists():
    world_manifest=json.loads(world_path.read_text())
    for world_entry in world_manifest['maps']:
        file='../world/exports/'+world_entry['png']
        target=OUT/file
        with Image.open(target) as world_image:
            entries.append({'id':'map-'+world_entry['id'],'category':'maps','file':file,'width':world_image.width,'height':world_image.height,'sha256':sha256(target.read_bytes()).hexdigest(),'pixelSha256':sha(world_image),'poolId':world_entry['id'],'seed':world_entry['seed'],'layout':'../world/exports/'+world_entry['layout'],'generatorVersion':world_manifest['version']})
    scenes=[]
    selected=[next(p for p in POOLS if p['res']==s['id']) for s in CATALOG['sets']]
    for p in selected:
        m=next(m for m in world_manifest['maps'] if m['id']==p['id'])
        layout=json.loads((ROOT/'world/exports'/m['layout']).read_text())
        scene=Image.open(ROOT/'world/exports'/m['png']).convert('RGBA')
        at=layout['anchors']['playerSpawn'];hero=trainers[(p['res'],'south')]
        hx,hy=ground_anchor(hero);scene.paste(hero,(at['x']*16+8-hx,at['y']*16+15-hy),hero)
        animal=cache['creature-'+p['id']];pool=layout['pool']
        scene.paste(animal,(pool['x']*16+pool['w']*8-12,pool['y']*16+pool['h']*8-12),animal)
        if monsters:
            mid={'EC':'algue','AG':'moustique','EP':'gland','EPP':'locataire','GP':'filtre'}[p['res']]
            if mid in monsters:
                foe=cache[p['id']+'-'+mid];at=layout['anchors']['encounter']
                fx,fy=ground_anchor(foe);scene.paste(foe,(at['x']*16+8-fx,at['y']*16+15-fy),foe)
        scenes.append((scene,p['res']+' '+p['unit'],'native sprites on the fixed pool map'))
    contact(scenes,2,'V3 / IN THE WORLD','Composition previews only. The game has not been modified.',cell=(540,465),scale=2).save(previews/'07-in-the-world.png')

for stem in ['01-pool-depot-overworld','02-depot-interior']:
    im=Image.open(ROOT/'source-art'/f'{stem}.png').convert('RGB').resize((256,192),Image.Resampling.LANCZOS)
    im=im.quantize(colors=64,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGBA')
    save(im,stem,'environments',sourceSheet=f'source-art/{stem}.png',collisionAuthored=False)
contact([(cache[id],entries[next(i for i,e in enumerate(entries) if e['id']==id)]['set']+' / '+id.split('-')[-1],'fixed loot-instance seed') for id in equipment_seeded],8,'V3 / SEEDED EQUIPMENT','One repeatable loot-instance example per equipment design. Gameplay stats are not rolled.',cell=(125,133),scale=5).save(previews/'08-seeded-equipment.png')

# One compact visual index for the complete pack; no browser UI is created.
overview=Image.new('RGB',(1120,1260),'#f5f1e5')
from PIL import ImageDraw, ImageFont
od=ImageDraw.Draw(overview);font_file=ROOT/'sources/PixelifySans-Regular.ttf'
hf=ImageFont.truetype(str(font_file),32);sf=ImageFont.truetype(str(font_file),16);tf=ImageFont.truetype(str(font_file),13)
od.text((24,15),'POCKET COAST / V3 COMPLETE',font=hf,fill='#293849')
od.text((24,56),'Native PNGs, seeded variants, atlases and the original v3 source artwork.',font=sf,fill='#687874')
def overview_heading(y,title,note):
    od.line((24,y-9,1096,y-9),fill='#d6cfbd');od.text((24,y),title,font=sf,fill='#293849');od.text((400,y+2),note,font=tf,fill='#687874')
overview_heading(91,'FIVE EQUIPMENT SETS','40 designs / six rarities / cursed variants')
for row,s in enumerate(CATALOG['sets']):
    yy=122+row*105;hero=trainers[(s['id'],'south')].resize((72,96),Image.Resampling.NEAREST);overview.paste(hero,(30,yy-5),hero)
    od.text((115,yy+23),s['id'],font=hf,fill=s['aura'])
    for col,slot in enumerate(SLOT_IDS):
        im=equipment[(s['id'],slot)].resize((64,64),Image.Resampling.NEAREST);xx=222+col*107;overview.paste(im,(xx,yy+5),im)
        od.text((xx,yy+74),slot,font=tf,fill='#687874')
overview_heading(664,'TEN MONSTERS','Base species, six tiers and 23 pool seeds per species')
for i,m in enumerate(CATALOG['monsters']):
    if m['id'] not in monsters:continue
    xx=24+(i%5)*218;yy=702+(i//5)*118;im=monsters[m['id']].resize((112,96),Image.Resampling.NEAREST);overview.paste(im,(xx+38,yy),im);od.text((xx+10,yy+96),m['name'],font=tf,fill='#293849')
overview_heading(965,'POOL CREATURES','Five species / 23 individual pool variants / deterministic seeds')
for i,s in enumerate(CATALOG['creatures']):
    im=species[s['id']].resize((96,96),Image.Resampling.NEAREST);xx=38+i*216;overview.paste(im,(xx+40,1004),im);od.text((xx+40,1110),s['name'],font=sf,fill='#293849')
overview_heading(1165,'SUPPORT AND LOOT','Resources, treatment actions, crates, coins and status')
if not args.base_only:
    support=[*resources.values(),*utilities.values()]
    for i,im in enumerate(support):
        scaled=im.resize((32,32),Image.Resampling.NEAREST);overview.paste(scaled,(28+i*54,1200),scaled)
overview.save(previews/'00-overview.png')

(ROOT/'sources/extraction-manifest.json').write_text(json.dumps(slices,indent=2,ensure_ascii=False)+'\n')
counts=dict(Counter(e['category'] for e in entries))
manifest={'version':VERSION,'status':'base-preview' if args.base_only else 'complete-static-catalog','artSource':'v3 sheets plus matching bestiary/support extensions','revision':args.revision,'nativePixels':True,'binaryAlpha':True,'animated':False,'pillowVersion':PILLOW_VERSION,'seedEncoding':'UTF-8 FNV-1a unsigned 32-bit','seedRule':'version | namespace | identity | revision','counts':counts,'assetCount':len(entries),'directions':DIRECTIONS,'sets':[s['id'] for s in CATALOG['sets']],'rarities':RARITIES,'worldManifest':'../world/exports/manifest.json' if world_manifest else None,'sources':[{'file':str(p.relative_to(ROOT)),'sha256':sha256(p.read_bytes()).hexdigest()} for p in sorted((ROOT/'source-art').glob('*.png'))],'assets':entries}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
if (ROOT/'animations/manifest.json').exists():
    manifest['animationManifest']='../animations/manifest.json'
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'status':manifest['status'],'assets':len(entries),'counts':counts},indent=2))
