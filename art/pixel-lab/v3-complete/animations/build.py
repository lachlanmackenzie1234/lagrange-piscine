#!/usr/bin/env python3
"""Export the v3 animation-design pack. No live game files are changed."""
from pathlib import Path
from hashlib import sha256
from collections import Counter
import json
import sys
from PIL import Image
import numpy as np

HERE=Path(__file__).resolve().parent;ROOT=HERE.parent
sys.path.insert(0,str(HERE/'source'))
from motion import pose,feet,aura,effect,loot
CAT=json.loads((ROOT/'catalog.json').read_text())
POOLS=json.loads((ROOT/'pools.json').read_text())
STATIC=json.loads((ROOT/'exports/manifest.json').read_text())
BASE={e['id']:e for e in STATIC['assets']}
clips={};groups={};counts=Counter();frame_count=0

def load(id):return Image.open(ROOT/'exports'/BASE[id]['file']).convert('RGBA')

def record(id,frames,durations,loop,anchor,category,offsets=None,layer='actor',source=None,**meta):
    global frame_count
    if isinstance(durations,int):durations=[durations]*len(frames)
    assert len(durations)==len(frames)
    width,height=frames[0].size
    atlas=Image.new('RGBA',(width*len(frames),height));records=[]
    for i,im in enumerate(frames):
        assert im.size==(width,height)
        file=f'frames/{id}/{i:02d}.png';p=HERE/file;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
        atlas.paste(im,(i*width,0))
        records.append({'file':file,'durationMs':durations[i],'sourceRect':[i*width,0,width,height],'offset':offsets[i] if offsets else [0,0],'empty':im.getbbox() is None,'sha256':sha256(p.read_bytes()).hexdigest()})
    ap='atlases/'+id.replace('/','-')+'.png';(HERE/'atlases').mkdir(exist_ok=True);atlas.save(HERE/ap)
    clip={'id':id,'category':category,'size':[width,height],'anchor':anchor,'loop':loop,'durationMs':sum(durations),'frames':records,'atlas':ap,'atlasSha256':sha256((HERE/ap).read_bytes()).hexdigest(),'layer':layer,'reducedMotionFrame':len(frames)-1 if id.endswith(('/spawn','/defeat')) else 0,'disappearOnEnd':frames[-1].getbbox() is None,**meta}
    if source:clip['sourceAsset']=BASE[source]['file']
    if category in ('action-fx','event-fx','service-fx'):
        clip['reducedMotionFrame']=max(range(len(frames)),key=lambda i:frames[i].getchannel('A').histogram()[255])
    clips[id]=clip;counts[category]+=1;frame_count+=len(frames)

motions={'idle':(4,[340,340,180,340],True),'walk':(8,95,True),'cast':(6,80,False),'hit':(4,90,False),'victory':(4,170,False),'spawn':(6,90,False),'defeat':(6,100,False),'flee':(8,65,False),'crouch':(4,130,False)}
vectors={'south':(0,1),'east':(1,0),'west':(-1,0),'north':(0,-1)}
for s in CAT['sets']:
    for direction in ['south','east','west','north']:
        asset=s['id']+'-'+direction;base=load(asset);v=vectors[direction]
        for motion,(n,durations,loop) in motions.items():
            frames=[pose(base,'walk' if motion=='flee' else motion,i,direction) for i in range(n)]
            offsets=None
            if motion=='cast':offsets=[[v[0]*d,v[1]*d] for d in [0,-2,0,7,3,0]]
            if motion=='hit':offsets=[[-1,0],[2,0],[-1,0],[0,0]]
            if motion=='victory':offsets=[[0,y] for y in [0,-3,-5,0]]
            if motion=='flee':offsets=[[v[0]*d,v[1]*d] for d in [0,3,7,12,18,24,31,40]]
            record(f"character/{s['id']}/{direction}/{motion}",frames,durations,loop,feet(base),'character',offsets,source=asset,set=s['id'],direction=direction,motion=motion)

monster_motions={'idle':(4,[280,280,160,280],True),'attack':(6,80,False),'hit':(4,90,False),'spawn':(6,90,False),'defeat':(6,100,False)}
for m in CAT['monsters']:
    asset='monster-'+m['id'];base=load(asset)
    for motion,(n,durations,loop) in monster_motions.items():
        frames=[pose(base,motion,i,'west') for i in range(n)]
        offsets=None
        if motion=='attack':offsets=[[x,0] for x in [0,2,0,-8,-3,0]]
        if motion=='hit':offsets=[[1,0],[-2,0],[1,0],[0,0]]
        record(f"monster/{m['id']}/{motion}",frames,durations,loop,feet(base),'monster',offsets,source=asset,monsterId=m['id'],motion=motion)

for identity,asset,role in [(s['id'],'species-'+s['id'],'species') for s in CAT['creatures']]+[(p['id'],'creature-'+p['id'],'pool-creature') for p in POOLS]:
    base=load(asset)
    for motion,n,duration in [('idle',4,250),('swim',6,120)]:
        frames=[pose(base,motion,i) for i in range(n)]
        offsets=[[0,y] for y in [0,-1,-1,0,1,0]] if motion=='swim' else None
        record(f'{role}/{identity}/{motion}',frames,duration,True,feet(base),role,offsets,source=asset,identity=identity,motion=motion)

for s in CAT['sets']:
    group='set-'+s['id'];pairs=[aura(group,i,s['aura'],4) for i in range(8)]
    for layer,idx in [('back',0),('front',1)]:record(f'aura/{group}/{layer}',[p[idx] for p in pairs],140,True,[24,40],'set-aura',layer=layer,set=s['id'])
    groups[group]={'back':f'aura/{group}/back','front':f'aura/{group}/front','anchor':[24,40],'activation':'all eight equipment slots match this set; visible only while idle, alive and not resolving an action','set':s['id']}
for rank,r in enumerate(CAT['rarities'],1):
    group='rarity-'+r['id'];pairs=[aura(group,i,r['color'],rank) for i in range(8)]
    for layer,idx in [('back',0),('front',1)]:record(f'aura/{group}/{layer}',[p[idx] for p in pairs],140,True,[24,40],'rarity-aura',layer=layer,rarity=r['id'],rank=rank)
    groups[group]={'back':f'aura/{group}/back','front':f'aura/{group}/front','anchor':[24,40],'activation':'spawned monster or explicitly ranked creature; visible only while idle, alive and not resolving an action','rarity':r['id']}

for move in CAT['moves']:
    frames=[effect(move['id'],i,load('EC-robot') if move['id']=='robot' else None) for i in range(8)]
    record('fx/action/'+move['id'],frames,80,False,[32,32],'action-fx',layer='foreground',moveId=move['id'],placement='target centre',impactFrame=4)
events=['impact','critical','heal','spawn','level-up','poof','flee-dust','xp','coin','alert','question']
for name in events:
    icon=load('utility-'+name) if name in ('xp','coin') else None
    record('fx/event/'+name,[effect(name,i,icon) for i in range(8)],90,False,[32,32],'event-fx',layer='foreground',placement='entity centre or feet, depending on event')
for name in ['test','drop','scatter','sweep','wash']:
    visual={'sweep':'balai','wash':'lavage'}.get(name,name)
    record('fx/service/'+name,[effect(visual,i) for i in range(8)],100,False,[32,32],'service-fx',layer='foreground',placement={'test':'ladder','drop':'skimmer','scatter':'pool centre','sweep':'pool centre','wash':'pumpAccess'}[name])

water_source=Image.open(ROOT/'world/exports/tileset.png').convert('RGBA').crop((112,0,128,16))
original=[(81,143,203),(120,176,224),(55,107,173)]
water_palettes={'calme':original,'traite':[(73,167,183),(141,213,212),(45,127,153)],'sauvage':[(113,147,78),(165,181,116),(75,113,63)],'critique':[(70,104,75),(112,150,93),(48,76,66)]}
for state,palette in water_palettes.items():
    data=np.array(water_source)
    for old,new in zip(original,palette):data[np.all(data[:,:,:3]==old,axis=2),:3]=new
    frames=[Image.fromarray(np.roll(data,i*2,axis=1)) for i in range(8)]
    record('water/'+state,frames,150,True,[0,0],'water',layer='background',state='traité' if state=='traite' else state)
for r in CAT['rarities']:
    base=load('crate-'+r['id'])
    for motion in ['drop','open']:
        record('loot/'+r['id']+'/'+motion,[loot(base,i,motion,r['color']) for i in range(8)],100,False,[16,31],'loot',source='crate-'+r['id'],rarity=r['id'],motion=motion)

timelines={m['id']:{'durationMs':800,'casterClip':'character/{set}/{direction}/cast','effectClip':'fx/action/'+m['id'],'targetClip':'monster/{monsterId}/hit','events':[{'atMs':0,'event':'cast-start'},{'atMs':80,'event':'effect-start'},{'atMs':400,'event':'impact'},{'atMs':400,'event':'target-hit'},{'atMs':800,'event':'settled'}],'damageCalculationIncluded':False} for m in CAT['moves']}
manifest={'version':'pocket-coast-v3-motion-1','status':'procedural-animation-designs','nativePixels':True,'binaryAlpha':True,'clipCount':len(clips),'frameCount':frame_count,'counts':dict(counts),'pathBase':'this animations directory','sourceAssetPathBase':'../exports/','auraGroups':groups,'combatTimelines':timelines,'clips':clips,'notes':['Frames are derived from the approved v3 static art, not a newly illustrated full-body animation set.','Walks articulate the lower legs and add a one-pixel body bob. Motion offsets must also be applied.','Auras have separate back and front layers and are gated by runtime.mjs.','Monster base-species clips are exported; the same pose() functions can animate pool-specific variants.','Idle/swim loops for all 23 individual pool creatures are included.','Audio, damage, AP/MP, turn timers and live game integration are not implemented by these exports.']}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'clips':len(clips),'frames':frame_count,'counts':dict(counts)},indent=2))
