#!/usr/bin/env python3
from pathlib import Path
import json
import sys
import math
from PIL import Image,ImageDraw,ImageFont

HERE=Path(__file__).resolve().parent;ROOT=HERE.parent
sys.path.insert(0,str(HERE/'source'))
from motion import feet
M=json.loads((HERE/'manifest.json').read_text());C=M['clips'];CAT=json.loads((ROOT/'catalog.json').read_text())
POOLS=json.loads((ROOT/'pools.json').read_text());OUT=HERE/'previews';OUT.mkdir(exist_ok=True)
FONT=ROOT/'sources/../sources/PixelifySans-Regular.ttf'
small=ImageFont.truetype(str(FONT),13);font=ImageFont.truetype(str(FONT),17);title=ImageFont.truetype(str(FONT),25)
cache={};gif_info=[]

def image(file):
    if file not in cache:cache[file]=Image.open(HERE/file).convert('RGBA')
    return cache[file]

def frame(id,index):
    c=C[id];f=c['frames'][index%len(c['frames'])];return image(f['file']),f.get('offset',[0,0]),c['anchor']

def paste(canvas,im,point,anchor,offset=(0,0),scale=1):
    if scale!=1:im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
    x=round(point[0]+offset[0]*scale-anchor[0]*scale);y=round(point[1]+offset[1]*scale-anchor[1]*scale)
    canvas.paste(im,(x,y),im)

def actor(canvas,id,index,point,scale=1):
    im,offset,anchor=frame(id,index);paste(canvas,im,point,anchor,offset,scale)

def aura_actor(canvas,group,im,point,index,scale=1):
    g=M['auraGroups'][group];b,_,a=frame(g['back'],index);f,_,_=frame(g['front'],index)
    paste(canvas,b,point,a,scale=scale);paste(canvas,im,point,feet(im),scale=scale);paste(canvas,f,point,a,scale=scale)

def board(size,label,note=''):
    im=Image.new('RGB',size,'#f5f1e5');d=ImageDraw.Draw(im);d.text((16,12),label,font=title,fill='#293849')
    if note:d.text((16,42),note,font=small,fill='#687874')
    return im

def gif(name,frames,duration=120):
    path=OUT/(name+'.gif');palettes=[im.convert('P',palette=Image.Palette.ADAPTIVE,colors=256) for im in frames]
    palettes[0].save(path,save_all=True,append_images=palettes[1:],duration=duration,loop=0,optimize=False,disposal=2)
    with Image.open(path) as im:
        actual=im.n_frames;durations=[]
        for i in range(actual):im.seek(i);durations.append(im.info.get('duration',0))
    gif_info.append({'file':'previews/'+path.name,'width':frames[0].width,'height':frames[0].height,'frames':actual,'frameDurationsMs':durations,'durationMs':sum(durations),'loop':True})
    frames[0].save(OUT/(name+'-poster.png'))

frames=[]
for f in range(8):
    out=board((592,676),'V3 / WALKING PER SET','Four directions. Eight frames. Feet stay tied to the ground.')
    d=ImageDraw.Draw(out)
    for row,s in enumerate(CAT['sets']):
        for col,direction in enumerate(['south','east','west','north']):
            x=15+col*144;y=72+row*119;d.rectangle((x,y,x+132,y+109),outline='#d6cfbd',fill='#fffbee')
            actor(out,f"character/{s['id']}/{direction}/walk",f,(x+65,y+91),3)
            d.text((x+6,y+93),s['id']+' / '+direction,font=small,fill='#293849')
    frames.append(out)
gif('walk-sets',frames,110)

frames=[]
for f in range(8):
    out=board((812,240),'V3 / FULL-SET IDLE AURAS','All eight pieces from one set. Aura hides during movement or actions.')
    d=ImageDraw.Draw(out)
    for i,s in enumerate(CAT['sets']):
        x=12+i*160;im=Image.open(ROOT/'exports/native/characters'/f"{s['id']}-south.png").convert('RGBA')
        aura_actor(out,'set-'+s['id'],im,(x+76,205),f,3);d.text((x+54,219),s['id'],font=font,fill=s['aura'])
    frames.append(out)
gif('full-set-auras',frames,140)

frames=[];base=Image.open(ROOT/'exports/native/monsters-base/monster-algue.png').convert('RGBA')
for f in range(8):
    out=board((968,238),'V3 / SPAWN-RARITY AURAS','Common through legendary. Same monster; different rarity effect.')
    d=ImageDraw.Draw(out)
    for i,r in enumerate(CAT['rarities']):
        x=6+i*160;aura_actor(out,'rarity-'+r['id'],base,(x+77,202),f,3);d.text((x+18,219),r['name'],font=small,fill=r['color'])
    frames.append(out)
gif('rarity-auras',frames,140)

frames=[]
for f in range(24):
    out=board((560,286),'V3 / IDLE-ONLY AURA','Idle -> movement -> idle. Preview of the activation rule.')
    d=ImageDraw.Draw(out);walking=8<=f<16
    point=(210+(min(max(f-8,0),8)*12),230)
    if walking:
        actor(out,'character/EC/east/walk',f-8,point,4)
        label='WALKING / AURA OFF'
    else:
        im,_,_=frame('character/EC/east/idle',f//2)
        aura_actor(out,'set-EC',im,point,f%8,4)
        label='FULL SET + IDLE / AURA ON'
    d.text((18,264),label,font=small,fill='#293849');frames.append(out)
gif('aura-idle-rule',frames,130)

frames=[]
for f in range(10):
    out=board((1000,744),'V3 / TURN-BASED ACTIONS','Cast, effect, impact and settle are separate timed events.')
    d=ImageDraw.Draw(out)
    for i,move in enumerate(CAT['moves']):
        xx=16+(i%4)*246;yy=73+(i//4)*325
        panel=Image.new('RGBA',(116,124),'#fffbee')
        pd=ImageDraw.Draw(panel);pd.ellipse((5,94,43,104),fill='#d4c5a0');pd.ellipse((65,39,106,48),fill='#d4c5a0')
        actor(panel,'character/EC/north/cast',min(5,f),(27,100))
        actor(panel,'monster/algue/hit' if f>=5 else 'monster/algue/idle',min(3,int((f*80-400)/90)) if f>=5 else 0,(86,45))
        if 1<=f<=8:
            fx,_,a=frame('fx/action/'+move['id'],f-1);paste(panel,fx,(83,33),a)
        out.paste(panel.resize((232,248),Image.Resampling.NEAREST),(xx,yy))
        d.text((xx+8,yy+254),move['name'],font=font,fill='#293849')
        d.text((xx+8,yy+278),['CAST','WINDUP','RELEASE','TRAVEL','TRAVEL','IMPACT','HIT','HIT','SETTLE','READY'][f],font=small,fill='#687874')
    frames.append(out)
gif('combat-actions',frames,80)

frames=[]
segments=[('idle',4),('attack',6),('hit',4),('defeat',6),('spawn',6)]
timeline=[(name,j) for name,n in segments for j in range(n)]
for motion,j in timeline:
    out=board((900,393),'V3 / MONSTER MOTION','Idle, attack, hit, defeat and spawn. All ten species.')
    d=ImageDraw.Draw(out)
    for i,m in enumerate(CAT['monsters']):
        x=12+(i%5)*177;y=78+(i//5)*150
        d.rectangle((x,y,x+165,y+140),outline='#d6cfbd',fill='#fffbee')
        actor(out,f"monster/{m['id']}/{motion}",j,(x+88,y+99),3)
        d.text((x+7,y+107),m['name'],font=small,fill='#293849');d.text((x+7,y+124),motion,font=small,fill='#687874')
    frames.append(out)
gif('monster-motion',frames,140)

frames=[]
for f in range(6):
    out=board((892,636),'V3 / THE 23 POOL CREATURES','Individual pool colours and markings stay intact during swimming.')
    d=ImageDraw.Draw(out)
    for i,p in enumerate(POOLS):
        x=12+i%6*146;y=75+i//6*138
        d.rectangle((x,y,x+135,y+127),outline='#d6cfbd',fill='#fffbee')
        d.ellipse((x+25,y+85,x+114,y+94),outline='#7ab9d0')
        actor(out,f"pool-creature/{p['id']}/swim",f,(x+67,y+96),3)
        d.text((x+9,y+108),p['res']+' '+p['unit'],font=small,fill='#293849')
    frames.append(out)
gif('pool-creatures',frames,150)

frames=[]
for f in range(16):
    out=board((724,392),'V3 / LOOT DROP AND OPEN','Six rarities. The final open frame can be held as the reward state.')
    d=ImageDraw.Draw(out)
    for i,r in enumerate(CAT['rarities']):
        x=12+i%3*237;y=75+i//3*153
        motion='drop' if f<8 else 'open';actor(out,'loot/'+r['id']+'/'+motion,f%8,(x+114,y+116),3)
        d.text((x+42,y+127),r['name']+' / '+motion,font=small,fill=r['color'])
    frames.append(out)
gif('loot',frames,130)

frames=[]
for f in range(8):
    out=board((844,251),'V3 / POOL SERVICE','Test, tablets, scattering, brushing and backwash. Visual effects only.')
    d=ImageDraw.Draw(out)
    for i,name in enumerate(['test','drop','scatter','sweep','wash']):
        x=10+i*166;fx,_,anchor=frame('fx/service/'+name,f);paste(out,fx,(x+80,146),anchor,scale=2);d.text((x+49,221),name,font=small,fill='#293849')
    frames.append(out)
gif('pool-service',frames,130)

frames=[]
for f in range(8):
    out=board((564,528),'V3 / WATER LOOPS','Repeatable 16 x 16 water tiles. Four pool conditions.')
    d=ImageDraw.Draw(out)
    for i,state in enumerate(['calme','traite','sauvage','critique']):
        tile,_,_=frame('water/'+state,f);pool=Image.new('RGBA',(64,48))
        for ty in range(0,48,16):
            for tx in range(0,64,16):pool.paste(tile,(tx,ty))
        x=18+i%2*276;y=77+i//2*225;out.paste(pool.resize((256,192),Image.Resampling.NEAREST),(x,y));d.text((x,y+201),state,font=small,fill='#293849')
    frames.append(out)
gif('water-loops',frames,150)

# A frame strip makes native walk changes directly inspectable without a GIF player.
strip=board((912,190),'V3 / EC SOUTH WALK - FRAME STRIP','Each tile is a 24 x 32 frame, shown at 3x.')
for i in range(8):actor(strip,'character/EC/south/walk',i,(55+i*112,168),3)
strip.save(OUT/'walk-frame-strip.png')
(OUT/'manifest.json').write_text(json.dumps({'previews':gif_info},indent=2)+'\n')
print(json.dumps({'animatedPreviews':len(gif_info),'files':[p['file'] for p in gif_info]},indent=2))
