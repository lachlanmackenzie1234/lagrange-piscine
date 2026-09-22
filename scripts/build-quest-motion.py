#!/usr/bin/env python3
"""Pack the published Pocket Coast motion designs into browser sprite pages."""
from pathlib import Path
import argparse,json,hashlib
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path,help='The v3-complete export pack directory')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
dest=root/'assets/quest-motion';dest.mkdir(parents=True,exist_ok=True)
source=args.source/'animations';raw=(source/'manifest.json').read_bytes();m=json.loads(raw)
families={'monsters':['monster'],'auras':['set-aura','rarity-aura'],'effects':['action-fx','event-fx','service-fx'],'water':['water'],'loot':['loot'],'creatures':['species','pool-creature']}
out={'version':m['version'],'sourceSha256':hashlib.sha256(raw).hexdigest(),'pages':[],'clips':{},'keeper':{},'auras':m['auraGroups']}
for family,categories in families.items():
    selected=[(id,c) for id,c in m['clips'].items() if c['category'] in categories]
    positions=[];x=y=rowh=width=0
    for id,c in selected:
        im=Image.open(source/c['atlas']).convert('RGBA')
        if x+im.width>1024:x=0;y+=rowh;rowh=0
        positions.append((id,c,im,x,y));width=max(width,x+im.width);rowh=max(rowh,im.height);x+=im.width
    page=Image.new('RGBA',(width,y+rowh))
    for id,c,im,x,y in positions:
        page.paste(im,(x,y))
        out['clips'][id]={'page':family+'.png','a':c['anchor'],'loop':c['loop'],'duration':c['durationMs'],'end':c['disappearOnEnd'],'reduced':c['reducedMotionFrame'],'f':[{'r':[x+f['sourceRect'][0],y+f['sourceRect'][1],f['sourceRect'][2],f['sourceRect'][3]],'d':f['durationMs'],'o':f['offset']} for f in c['frames']]}
    page.save(dest/(family+'.png'));out['pages'].append(family+'.png')
# The illustrated interior gets an authored collision grid in js/maps.js.
scene=Image.open(args.source/'exports/native/environments/02-depot-interior.png').convert('RGBA')
scene.save(dest/'depot.png');out['pages'].append('depot.png')
out['clips']['scene/depot']={'page':'depot.png','a':[0,0],'loop':False,'duration':1,'end':False,'reduced':0,'f':[{'r':[0,0,*scene.size],'d':1,'o':[0,0]}]}
for direction in ['south','east','west','north']:
    out['keeper'][direction]={}
    for motion in ['idle','walk','cast','hit','victory','spawn','defeat','flee','crouch']:
        c=m['clips'][f'character/EC/{direction}/{motion}']
        out['keeper'][direction][motion]={'loop':c['loop'],'duration':c['durationMs'],'end':c['disappearOnEnd'],'reduced':c['reducedMotionFrame'],'f':[{'d':f['durationMs'],'o':f['offset']} for f in c['frames']]}
(dest/'manifest.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(json.dumps({'pages':len(out['pages']),'clips':len(out['clips']),'bytes':sum((dest/name).stat().st_size for name in out['pages']+['manifest.json'])}))
